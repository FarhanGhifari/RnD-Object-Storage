'use strict';
const { Sequelize } = require('sequelize');
const env = require('./env');

const sequelize = new Sequelize(env.dbName, env.dbUser, env.dbPassword, {
  host: env.dbHost,
  port: env.dbPort,
  dialect: 'postgres',
  logging: false,
});

module.exports = sequelize;
