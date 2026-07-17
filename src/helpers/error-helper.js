'use strict';

class NotFoundError extends Error {
  constructor(message = 'Resource tidak ditemukan') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class ValidationError extends Error {
  constructor(message = 'Validasi gagal') {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

class SystemError extends Error {
  constructor(message = 'Kesalahan sistem') {
    super(message);
    this.name = 'SystemError';
    this.statusCode = 500;
  }
}

const ERROR_MESSAGES = {
  FILE_NOT_FOUND: 'File tidak ditemukan',
  FILE_NOT_IN_FORM_DATA: 'File tidak ditemukan dalam form data. Gunakan field \'file\'.',
  INVALID_UPLOAD_MODE: 'Mode upload tidak valid. Gunakan \'stream\' atau \'buffer\'.',
  SYSTEM_ERROR: 'Kesalahan sistem',
  FILE_UPLOAD_SUCCESS: 'File sukses diupload menggunakan metode',
  FILE_DELETE_SUCCESS: 'File berhasil dihapus',
  ENDPOINT_NOT_FOUND: 'Endpoint tidak ditemukan',
};

module.exports = {
  NotFoundError,
  ValidationError,
  SystemError,
  ERROR_MESSAGES,
};
