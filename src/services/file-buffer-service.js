'use strict';
const { randomUUID } = require('crypto');
const path = require('path');
const { Mutex } = require('async-mutex');
const { isUUID } = require('../utils/validation');
const fileRepository = require('../repositories/file-repository');
const minioClient = require('../config/minio');
const env = require('../config/env');

// Mutex ini SENGAJA cakupannya dipersempit, hanya untuk melindungi
// operasi cek-dan-buat bucket (bagian yang benar-benar shared resource).
// Proses baca stream & upload file TIDAK dikunci mutex, karena tiap
// request punya chunks/fileBuffer sendiri-sendiri (tidak saling ganggu),
// sehingga banyak upload tetap bisa berjalan paralel.
const bucketMutex = new Mutex();

function sanitizeFileName(fileName) {
  if (typeof fileName !== 'string') return 'file_tanpa_nama.bin';
  return path.basename(fileName).replace(/[^\w.-]/g, '_') || 'file_tanpa_nama.bin';
}

class FileBufferService {
  async uploadFile(originalName, readableStream) {
    const safeOriginalName = sanitizeFileName(originalName);
    const uniqueName = `${Date.now()}-${randomUUID()}-${safeOriginalName}`;

    // ============================================================
    // CRITICAL SECTION: cek bucket ada atau belum, lalu buat kalau
    // belum ada. Ini rawan race condition: kalau 2 request datang
    // BERSAMAAN saat bucket belum ada, keduanya bisa lolos
    // bucketExists() = false secara bersamaan, lalu keduanya
    // sama-sama mencoba makeBucket() -> bisa menyebabkan error
    // "bucket already exists" pada salah satu request.
    // Makanya bagian ini yang dikunci mutex, BUKAN seluruh proses upload.
    // ============================================================
    const releaseBucketLock = await bucketMutex.acquire();
    try {
      const bucketExists = await minioClient.bucketExists(env.minioBucketName);
      if (!bucketExists) {
        await minioClient.makeBucket(env.minioBucketName);
      }
    } finally {
      releaseBucketLock();
    }

    // Flag untuk melacak apakah upload ke MinIO sudah benar-benar
    // berhasil. Dipakai nanti supaya proses cleanup (removeObject)
    // hanya dijalankan kalau memang ada objek yang perlu dihapus,
    // bukan cleanup buta yang jalan meski upload belum sempat terjadi.
    let uploadSucceeded = false;

    try {
      const chunks = [];
      // Mengumpulkan semua data chunk stream biner ke dalam memori RAM.
      // Tahap ini TIDAK memerlukan mutex karena `chunks` adalah variabel
      // lokal milik request ini sendiri (tidak ada shared state).
      for await (const chunk of readableStream) {
        chunks.push(chunk);
      }

      // Menggabungkan potongan chunk menjadi satu Buffer utuh di RAM
      // (Fully Buffered). Di titik inilah seluruh isi file sudah
      // tertampung penuh di memori sebelum dikirim ke MinIO.
      const fileBuffer = Buffer.concat(chunks);
      const totalSize = fileBuffer.length;

      // Mengirimkan objek Buffer utuh langsung ke Object Storage MinIO.
      await minioClient.putObject(env.minioBucketName, uniqueName, fileBuffer);
      uploadSucceeded = true;

      return await fileRepository.create({
        originalName: safeOriginalName,
        storagePath: uniqueName,
        fileSize: totalSize
      });
    } catch (err) {
      // Cleanup hanya dilakukan kalau file SUDAH SEMPAT ter-upload ke
      // MinIO tapi gagal di tahap setelahnya (misal fileRepository.create
      // gagal karena DB down). Kalau error terjadi sebelum upload
      // selesai (misal stream putus di tengah jalan), tidak perlu
      // memanggil removeObject karena objeknya memang belum pernah ada.
      if (uploadSucceeded) {
        await minioClient.removeObject(env.minioBucketName, uniqueName).catch(() => {});
      }
      throw new Error('Kesalahan sistem: ' + err.message);
    }
  }

  async getAllFiles() {
    return fileRepository.findAll();
  }

  async getFileById(id) {
    this._validateId(id);
    const file = await fileRepository.findById(id);
    if (!file) {
      throw new Error('File tidak ditemukan');
    }
    return file;
  }

  async updateFile(id, data) {
    this._validateId(id);
    const updated = await fileRepository.update(id, data);
    if (!updated) {
      throw new Error('File tidak ditemukan');
    }
    return updated;
  }

  async deleteFile(id) {
    this._validateId(id);
    const file = await fileRepository.findById(id);
    if (!file) {
      throw new Error('File tidak ditemukan');
    }

    // Hapus objek fisik dari MinIO
    await minioClient.removeObject(env.minioBucketName, file.storagePath);

    await fileRepository.delete(id);
    return { message: 'File berhasil dihapus' };
  }

  _validateId(id) {
    if (!isUUID(id)) {
      throw new Error('File tidak ditemukan');
    }
  }
}

module.exports = new FileBufferService();

/*
================================================================================
ARSIP KODE ALTERNATIF: BUFFER KE LOCAL STORAGE (FILE SYSTEM)
================================================================================

Jika ingin beralih menggunakan penyimpanan Local Storage berbasis Buffer:

1. Di bagian impor paling atas:
   const fs = require('fs/promises');
   const UPLOAD_DIR = path.join(__dirname, '..', '..', 'local_storage');

2. Implementasi fungsi uploadFile:
   async uploadFile(originalName, readableStream) {
     const safeOriginalName = sanitizeFileName(originalName);
     const uniqueName = `${Date.now()}-${randomUUID()}-${safeOriginalName}`;
     const targetPath = path.join(UPLOAD_DIR, uniqueName);

     await fs.mkdir(UPLOAD_DIR, { recursive: true });

     // Catatan: di versi local storage, race condition pada mkdir
     // recursive umumnya aman tanpa mutex (fs.mkdir recursive tidak
     // error kalau folder sudah ada), sehingga mutex tidak wajib
     // dipakai di sini kecuali ada shared resource lain yang relevan.

     // Flag yang sama seperti versi MinIO: dipakai supaya cleanup
     // (fs.rm) hanya dijalankan kalau file SUDAH SEMPAT tertulis ke
     // disk, bukan cleanup buta yang jalan meski writeFile belum
     // pernah tereksekusi (misal error terjadi saat baca stream).
     let writeSucceeded = false;

     try {
       const chunks = [];
       for await (const chunk of readableStream) {
         chunks.push(chunk);
       }
       const fileBuffer = Buffer.concat(chunks);
       const totalSize = fileBuffer.length;

       // Menulis Buffer langsung ke disk lokal sekaligus
       await fs.writeFile(targetPath, fileBuffer);
       writeSucceeded = true;

       return await fileRepository.create({
         originalName: safeOriginalName,
         storagePath: targetPath,
         fileSize: totalSize
       });
     } catch (err) {
       if (writeSucceeded) {
         await fs.rm(targetPath, { force: true }).catch(() => {});
       }
       throw new Error('Kesalahan sistem: ' + err.message);
     }
   }
*/