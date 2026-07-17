'use strict';

require('dotenv').config();

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
};

const parseNumber = (value, defaultValue) => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

module.exports = {
  port: parseNumber(process.env.PORT, 3000),
  dbHost: process.env.DB_HOST || '127.0.0.1',
  dbPort: parseNumber(process.env.DB_PORT, 5432),
  dbName: process.env.DB_NAME || 'db_rnd',
  dbUser: process.env.DB_USER || 'postgres',
  dbPassword: process.env.DB_PASSWORD || '',
  minioEndpoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
  minioPort: parseNumber(process.env.MINIO_PORT, 9000),
  minioUseSSL: parseBoolean(process.env.MINIO_USE_SSL),
  minioAccessKey: process.env.MINIO_ACCESS_KEY || '',
  minioSecretKey: process.env.MINIO_SECRET_KEY || '',
  minioBucketName: process.env.MINIO_BUCKET_NAME || 'rnd-bucket',
};
