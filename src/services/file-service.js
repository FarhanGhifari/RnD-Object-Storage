'use strict';

const { randomUUID } = require('crypto');
const { isUUID } = require('../helpers/validation');
const fileRepository = require('../database/repositories/file-repository');
const minioClient = require('../config/minio');
const env = require('../config/env');
const { sanitizeFileName } = require('../helpers/file-helper');
const { ensureBucketExists } = require('../helpers/minio-helper');
const { NotFoundError, SystemError, ERROR_MESSAGES } = require('../helpers/error-helper');

class FileService {
  async uploadFile(fileStream, originalName, fileSize, mode) {
    const safeOriginalName = sanitizeFileName(originalName);
    const uniqueName = `${Date.now()}-${randomUUID()}-${safeOriginalName}`;

    let uploadSucceeded = false;
    const storagePath = uniqueName;

    try {
      await ensureBucketExists();

      if (mode === 'buffer') {
        // Read the entire fileStream into a single buffer
        const chunks = [];
        for await (const chunk of fileStream) {
          chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);

        // Upload using buffer
        await minioClient.putObject(env.minioBucketName, uniqueName, fileBuffer);
      } else {
        // Stream directly to MinIO
        await minioClient.putObject(env.minioBucketName, uniqueName, fileStream, fileSize);
      }

      uploadSucceeded = true;

      return await fileRepository.create({
        originalName: safeOriginalName,
        storagePath: storagePath,
        fileSize: fileSize,
      });
    } catch (err) {
      if (uploadSucceeded) {
        await minioClient.removeObject(env.minioBucketName, uniqueName).catch(() => {});
      }
      throw new SystemError(`${ERROR_MESSAGES.SYSTEM_ERROR}: ${err.message}`);
    }
  }

  async getAllFiles() {
    return fileRepository.findAll();
  }

  async getFileById(id) {
    this._validateId(id);
    const file = await fileRepository.findById(id);
    if (!file) {
      throw new NotFoundError(ERROR_MESSAGES.FILE_NOT_FOUND);
    }
    return file;
  }

  async updateFile(id, data) {
    this._validateId(id);
    const updated = await fileRepository.update(id, data);
    if (!updated) {
      throw new NotFoundError(ERROR_MESSAGES.FILE_NOT_FOUND);
    }
    return updated;
  }

  async deleteFile(id) {
    this._validateId(id);
    const file = await fileRepository.findById(id);
    if (!file) {
      throw new NotFoundError(ERROR_MESSAGES.FILE_NOT_FOUND);
    }

    await minioClient.removeObject(env.minioBucketName, file.storagePath);
    await fileRepository.delete(id);
    
    return { message: ERROR_MESSAGES.FILE_DELETE_SUCCESS };
  }

  _validateId(id) {
    if (!isUUID(id)) {
      throw new NotFoundError(ERROR_MESSAGES.FILE_NOT_FOUND);
    }
  }
}

module.exports = new FileService();