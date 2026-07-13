'use strict';
const express = require('express');
const fileRoutes = require('./routes/file-routes');

const app = express();

app.use(express.json());
app.use('/files', fileRoutes);

module.exports = app;
