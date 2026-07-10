'use strict';
const env = require('./env');

module.exports = {
  development: {
    username: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    host: env.dbHost,
    port: env.dbPort,
    dialect: 'postgres'
  },
  test: {
    username: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    host: env.dbHost,
    port: env.dbPort,
    dialect: 'postgres'
  },
  production: {
    username: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    host: env.dbHost,
    port: env.dbPort,
    dialect: 'postgres'
  }
};
