'use strict';
const { Mutex } = require('async-mutex');
const minioClient = require('../config/minio');
const env = require('../config/env');

const bucketMutex = new Mutex();

/**
 * Memastikan bucket MinIO sudah terbuat secara thread-safe menggunakan Mutex.
 */
async function ensureBucketExists() {
  const releaseBucketLock = await bucketMutex.acquire();
  try {
    const bucketExists = await minioClient.bucketExists(env.minioBucketName);
    if (!bucketExists) {
      await minioClient.makeBucket(env.minioBucketName);
    }
  } finally {
    releaseBucketLock();
  }
}

module.exports = { ensureBucketExists };
