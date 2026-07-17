'use strict';

const express = require('express');
const fileRoutes = require('./routes/file-routes');
const errorHandler = require('./middlewares/error-handler');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString() 
  });
});

app.use('/files', fileRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

app.use(errorHandler);

module.exports = app;
