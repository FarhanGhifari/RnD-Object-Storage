'use strict';

class Logger {
  logMemoryComparison(mode, ramBefore, ramAfter, ramDelta) {
    const modeName = mode.toUpperCase();
    console.log('\n[LOG KOMPARASI MEMORI UPLOAD]');
    console.log('==========================================');
    console.log(`Metode Terpilih : ${modeName}`);
    console.log(`RAM Sebelum     : ${ramBefore.toFixed(2)} MB`);
    console.log(`RAM Sesudah     : ${ramAfter.toFixed(2)} MB`);
    console.log(`Lonjakan RAM    : ${ramDelta.toFixed(2)} MB`);
    console.log('==========================================\n');
  }

  info(message) {
    console.log(`[INFO] ${message}`);
  }

  error(message, error) {
    console.error(`[ERROR] ${message}`, error);
  }

  warn(message) {
    console.warn(`[WARN] ${message}`);
  }
}

module.exports = new Logger();
