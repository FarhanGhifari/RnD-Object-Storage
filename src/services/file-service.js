'use strict';
const { randomUUID } = require('crypto');
const { isUUID } = require('../utils/validation');
const fileRepository = require('../repositories/file-repository');
const minioClient = require('../config/minio');
const env = require('../config/env');
const { sanitizeFileName } = require('../utils/file-helper');
const { ensureBucketExists } = require('../utils/minio-helper');
const { uploadWithStream, uploadWithBuffer } = require('../utils/upload-helper');

class FileService {
  async uploadFile(originalName, readableStream, mode = 'stream') {
    const safeOriginalName = sanitizeFileName(originalName);
    const uniqueName = `${Date.now()}-${randomUUID()}-${safeOriginalName}`;

    let uploadSucceeded = false;
    let totalSize = 0;
    const storagePath = uniqueName;

    try {
      await ensureBucketExists();
      if (mode === 'buffer') {
        totalSize = await uploadWithBuffer(uniqueName, readableStream);
      } else {
        const fileSize = readableStream.headers && readableStream.headers['content-length']
          ? parseInt(readableStream.headers['content-length'], 10)
          : undefined;
        totalSize = await uploadWithStream(uniqueName, readableStream, fileSize);
      }

      uploadSucceeded = true;

      return await fileRepository.create({
        originalName: safeOriginalName,
        storagePath: storagePath,
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