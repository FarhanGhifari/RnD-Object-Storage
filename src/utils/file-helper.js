'use strict';
const path = require('path');

/**
 * Membersihkan nama file dari karakter berbahaya dan spasi agar aman disimpan.
 * @param {string} fileName
 * @returns {string}
 */

function sanitizeFileName(fileName) {
  if (typeof fileName !== 'string') return 'file_tanpa_nama.bin';
  return path.basename(fileName).replace(/[^\w.-]/g, '_') || 'file_tanpa_nama.bin';
}

module.exports = { sanitizeFileName };
