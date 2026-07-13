'use strict';
const { Transform } = require('stream');
const minioClient = require('../config/minio');
const env = require('../config/env');

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

module.exports = {
  uploadWithStream,
  uploadWithBuffer
};
