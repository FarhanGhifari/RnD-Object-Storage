'use strict';

const fileService = require('../services/file-service');
const logger = require('../helpers/logger');
const { ValidationError, ERROR_MESSAGES } = require('../helpers/error-helper');

class FileController {
  async upload(req, res, next) {
    const rawMode = req.headers['x-service-mode'] || 'stream';
    const mode = rawMode.toLowerCase() === 'buffer' ? 'buffer' : 'stream';
    const ramBefore = process.memoryUsage().rss / 1024 / 1024;

    try {
      const originalName = req.query.name || req.headers['x-file-name'] || `file-${Date.now()}`;
      const fileSize = parseInt(req.headers['content-length'], 10);

      if (isNaN(fileSize)) {
        throw new ValidationError('Content-Length header is required');
      }

      const savedFile = await fileService.uploadFile(req, originalName, fileSize, mode);

      const ramAfter = process.memoryUsage().rss / 1024 / 1024;
      const ramDelta = ramAfter - ramBefore;

      logger.logMemoryComparison(mode.toUpperCase(), ramBefore, ramAfter, ramDelta);

      return res.status(201).json({
        message: `${ERROR_MESSAGES.FILE_UPLOAD_SUCCESS} ${mode.toUpperCase()}!`,
        data: savedFile,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const files = await fileService.getAllFiles();
      return res.json({ data: files });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const file = await fileService.getFileById(req.params.id);
      return res.json({ data: file });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await fileService.deleteFile(req.params.id);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new FileController();
