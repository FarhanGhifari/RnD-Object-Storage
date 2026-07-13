'use strict';
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  dbHost: process.env.DB_HOST || '127.0.0.1',
  dbPort: process.env.DB_PORT || 5432,
  dbName: process.env.DB_NAME || 'db_rnd',
  dbUser: process.env.DB_USER || 'postgres',
  dbPassword: process.env.DB_PASSWORD || '',
  minioEndpoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
  minioPort: process.env.MINIO_PORT || 9000,
  minioUseSSL: process.env.MINIO_USE_SSL || 'false',
  minioAccessKey: process.env.MINIO_ACCESS_KEY || '',
  minioSecretKey: process.env.MINIO_SECRET_KEY || '',
  minioBucketName: process.env.MINIO_BUCKET_NAME || 'rnd-bucket',
};
