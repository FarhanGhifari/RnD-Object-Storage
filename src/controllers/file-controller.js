"use strict";
const env = require("../config/env");
const fileServiceStream = require("../services/file-service");
const fileServiceBuffer = require("../services/file-buffer-service");

class FileController {
  _getService(req) {
    const mode =
      req.headers["x-service-mode"] || env.fileServiceMode || "stream";
    return mode === "buffer" ? fileServiceBuffer : fileServiceStream;
  }

  async upload(req, res) {
    const modeName = (
      req.headers["x-service-mode"] ||
      env.fileServiceMode ||
      "stream"
    ).toUpperCase();

    // Catat memori RAM proses sebelum upload dimulai (dalam MB)
    const ramBefore = process.memoryUsage().rss / 1024 / 1024;

    try {
      const activeService = this._getService(req);
      const originalName = req.headers["x-file-name"] || "file_tanpa_nama.bin";
      const savedFile = await activeService.uploadFile(originalName, req);

      // Catat memori RAM proses setelah upload selesai (dalam MB)
      const ramAfter = process.memoryUsage().rss / 1024 / 1024;
      const ramDelta = ramAfter - ramBefore;

      console.log(`\n[LOG KOMPARASI MEMORI UPLOAD]`);
      console.log(`==========================================`);
      console.log(`Metode Terpilih : ${modeName}`);
      console.log(`RAM Sebelum     : ${ramBefore.toFixed(2)} MB`);
      console.log(`RAM Sesudah     : ${ramAfter.toFixed(2)} MB`);
      console.log(`Lonjakan RAM    : ${ramDelta.toFixed(2)} MB`);
      console.log(`==========================================\n`);

      return res.status(201).json({
        message: `File sukses diupload menggunakan metode ${modeName}!`,
        data: savedFile,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async getAll(req, res) {
    try {
      const activeService = this._getService(req);
      const files = await activeService.getAllFiles();
      return res.json({ data: files });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async getById(req, res) {
    try {
      const activeService = this._getService(req);
      const file = await activeService.getFileById(req.params.id);
      return res.json({ data: file });
    } catch (err) {
      return res.status(404).json({ error: err.message });
    }
  }

  async update(req, res) {
    try {
      const activeService = this._getService(req);
      const data = {};
      if (req.body.originalName) data.originalName = req.body.originalName;
      if (req.body.fileSize) data.fileSize = req.body.fileSize;

      const updated = await activeService.updateFile(req.params.id, data);
      return res.json({ message: "File berhasil diupdate", data: updated });
    } catch (err) {
      const status = err.message === "File tidak ditemukan" ? 404 : 500;
      return res.status(status).json({ error: err.message });
    }
  }

  async delete(req, res) {
    try {
      const activeService = this._getService(req);
      const result = await activeService.deleteFile(req.params.id);
      return res.json(result);
    } catch (err) {
      return res.status(404).json({ error: err.message });
    }
  }
}

module.exports = new FileController();
