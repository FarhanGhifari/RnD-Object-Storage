'use strict';
const express = require('express');
const fs = require('fs');
const path = require('path');
const fileRoutes = require('./routes/file-routes');

const app = express();

const UPLOAD_DIR = path.join(__dirname, '..', 'local_storage');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(express.json());
app.use('/files', fileRoutes);

module.exports = app;
