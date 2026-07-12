'use strict';
const { Transform } = require('stream');
const { createWriteStream } = require('fs');
const fs = require('fs/promises');
const path = require('path');
const minioClient = require('../config/minio');
const env = require('../config/env');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'local_storage');

/**
 * Upload file menggunakan Stream ke MinIO.
 * @param {string} uniqueName
 * @param {ReadableStream} readableStream
 * @param {number|undefined} fileSize
 * @returns {Promise<number>} totalSize dalam byte
 */
async function uploadWithStream(uniqueName, readableStream, fileSize) {
  let totalSize = 0;
  const byteCounter = new Transform({
    transform(chunk, encoding, callback) {
      totalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
      callback(null, chunk);
    }
  });

  const pipedStream = readableStream.pipe(byteCounter);
  await minioClient.putObject(env.minioBucketName, uniqueName, pipedStream, fileSize);
  return totalSize;
}

/**
 * Upload file menggunakan Buffer ke MinIO.
 * @param {string} uniqueName
 * @param {ReadableStream} readableStream
 * @returns {Promise<number>} totalSize dalam byte
 */
async function uploadWithBuffer(uniqueName, readableStream) {
  const chunks = [];
  for await (const chunk of readableStream) {
    chunks.push(chunk);
  }
  const fileBuffer = Buffer.concat(chunks);
  const totalSize = fileBuffer.length;

  await minioClient.putObject(env.minioBucketName, uniqueName, fileBuffer);
  return totalSize;
}

/**
 * Upload file menggunakan Stream ke Local Storage (File System).
 * @param {string} uniqueName
 * @param {ReadableStream} readableStream
 * @returns {Promise<Object>} { totalSize, targetPath }
 */
async function uploadLocalWithStream(uniqueName, readableStream) {
  const targetPath = path.join(UPLOAD_DIR, uniqueName);
  let totalSize = 0;
  
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const byteCounter = new Transform({
    transform(chunk, encoding, callback) {
      totalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
      callback(null, chunk);
    }
  });

  const { pipeline } = require('stream/promises');
  await pipeline(
    readableStream,
    byteCounter,
    createWriteStream(targetPath)
  );
  return { totalSize, targetPath };
}

/**
 * Upload file menggunakan Buffer ke Local Storage (File System).
 * @param {string} uniqueName
 * @param {ReadableStream} readableStream
 * @returns {Promise<Object>} { totalSize, targetPath }
 */
async function uploadLocalWithBuffer(uniqueName, readableStream) {
  const targetPath = path.join(UPLOAD_DIR, uniqueName);
  
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const chunks = [];
  for await (const chunk of readableStream) {
    chunks.push(chunk);
  }
  const fileBuffer = Buffer.concat(chunks);
  await fs.writeFile(targetPath, fileBuffer);
  return { totalSize: fileBuffer.length, targetPath };
}

module.exports = {
  uploadWithStream,
  uploadWithBuffer,
  uploadLocalWithStream,
  uploadLocalWithBuffer
};
