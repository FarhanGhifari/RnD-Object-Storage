'use strict';
const Minio = require('minio');
const env = require('./env');

const minioClient = new Minio.Client({
  endPoint: env.minioEndpoint,
  port: parseInt(env.minioPort, 10),
  useSSL: env.minioUseSSL === 'true',
  accessKey: env.minioAccessKey,
  secretKey: env.minioSecretKey
});

module.exports = minioClient;
