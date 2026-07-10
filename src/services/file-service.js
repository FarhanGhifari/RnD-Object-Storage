'use strict';
const { randomUUID } = require('crypto');
const path = require('path');
const { Mutex } = require('async-mutex');
const { Transform } = require('stream');
const { isUUID } = require('../utils/validation');
const fileRepository = require('../repositories/file-repository');
const minioClient = require('../config/minio');
const env = require('../config/env');

const bucketMutex = new Mutex();

function sanitizeFileName(fileName) {
  if (typeof fileName !== 'string') return 'file_tanpa_nama.bin';
  return path.basename(fileName).replace(/[^\w.-]/g, '_') || 'file_tanpa_nama.bin';
}

class FileService {
  async uploadFile(originalName, readableStream) {
    const safeOriginalName = sanitizeFileName(originalName);
    const uniqueName = `${Date.now()}-${randomUUID()}-${safeOriginalName}`;
    let totalSize = 0;

    const releaseBucketLock = await bucketMutex.acquire();
    try {
      const bucketExists = await minioClient.bucketExists(env.minioBucketName);
      if (!bucketExists) {
        await minioClient.makeBucket(env.minioBucketName);
      }
    } finally {
      releaseBucketLock();
    }

    let uploadSucceeded = false;

    try {
      const byteCounter = new Transform({
        transform(chunk, encoding, callback) {
          totalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
          callback(null, chunk);
        }
      });

      const fileSize = readableStream.headers && readableStream.headers['content-length']
        ? parseInt(readableStream.headers['content-length'], 10)
        : undefined;

      const pipedStream = readableStream.pipe(byteCounter);
      await minioClient.putObject(env.minioBucketName, uniqueName, pipedStream, fileSize);
      uploadSucceeded = true;

      return await fileRepository.create({
        originalName: safeOriginalName,
        storagePath: uniqueName,
        fileSize: totalSize
      });
    } catch (err) {
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

module.exports = new FileService();

/*
================================================================================
ARSIP KODE LAMA: PENYIMPANAN KE LOCAL STORAGE (FILE SYSTEM)
================================================================================

Jika ingin beralih kembali menggunakan penyimpanan Local Storage, 
berikut adalah potongan kode dan modul yang dibutuhkan:

1. Di bagian impor paling atas:
   const { createWriteStream } = require('fs');
   const fs = require('fs/promises');
   const { pipeline } = require('stream/promises');
   const UPLOAD_DIR = path.join(__dirname, '..', '..', 'local_storage');

2. Implementasi fungsi uploadFile ke Local Storage:
   async uploadFile(originalName, readableStream) {
     const safeOriginalName = sanitizeFileName(originalName);
     const uniqueName = `${Date.now()}-${randomUUID()}-${safeOriginalName}`;
     const targetPath = path.join(UPLOAD_DIR, uniqueName);
     let totalSize = 0;

     await fs.mkdir(UPLOAD_DIR, { recursive: true });

     // Catatan: sama seperti versi MinIO, race condition pada mkdir
     // recursive umumnya aman tanpa mutex (fs.mkdir recursive tidak
     // error kalau folder sudah ada), sehingga mutex di sini tidak
     // wajib membungkus mkdir. Mutex tetap dipertahankan hanya
     // sebagai contoh pola locking jika suatu saat ada shared
     // resource lain yang perlu dilindungi (misal quota disk, dsb).

     // Flag yang sama seperti versi MinIO: dipakai supaya cleanup
     // (fs.rm) hanya dijalankan kalau file SUDAH SEMPAT selesai
     // ditulis ke disk (pipeline berhasil), bukan cleanup buta yang
     // jalan meski pipeline belum pernah selesai/berjalan.
     let writeSucceeded = false;

     try {
       const byteCounter = new Transform({
         transform(chunk, encoding, callback) {
           totalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
           callback(null, chunk);
         }
       });

       await pipeline(
         readableStream,
         byteCounter,
         createWriteStream(targetPath)
       );
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

3. Implementasi fungsi deleteFile dari Local Storage:
   async deleteFile(id) {
     this._validateId(id);
     const file = await fileRepository.findById(id);
     if (!file) {
       throw new Error('File tidak ditemukan');
     }
     await fs.rm(file.storagePath, { force: true });
     await fileRepository.delete(id);
     return { message: 'File berhasil dihapus' };
   }
*/