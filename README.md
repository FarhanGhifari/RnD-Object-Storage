# RnD Object Storage

Dokumen ini menjelaskan sistem pengunggahan file berbasis REST API menggunakan Node.js, Express, Sequelize ORM, PostgreSQL, dan Object Storage MinIO. Riset ini menguji perbandingan efisiensi penggunaan memori RAM antara transfer data menggunakan konsep Stream (aliran data langsung) dengan Buffer (penampungan data memori penuh).

---

## Konsep Arsitektur: Stream vs Buffer

Sistem ini dirancang untuk membandingkan dua pendekatan transfer data:

1. **Metode Stream**:
   Mengalirkan data file secara langsung dari soket request jaringan client ke server Object Storage MinIO. Data mengalir dalam bentuk potongan-potongan memori kecil (chunks) secara real-time tanpa pernah disimpan secara utuh di RAM server lokal. Konsumsi memori RAM bersifat konstan dan sangat kecil, tidak dipengaruhi oleh ukuran file yang diunggah.

2. **Metode Buffer**:
   Mengumpulkan seluruh potongan data dari request jaringan client terlebih dahulu ke dalam alokasi memori RAM server lokal sampai file utuh terbentuk. Setelah file terkumpul secara penuh di RAM, server baru mengirimkan file tersebut sekaligus ke Object Storage MinIO. Konsumsi memori RAM melonjak secara linear sesuai dengan ukuran file yang diunggah.

Sistem ini juga menerapkan mekanisme penguncian asinkron (Mutex Lock) pada operasi pembuatan kontainer penyimpanan objek (bucket) untuk mengamankan proses tersebut dari kondisi balapan data (race condition), serta memastikan integritas transaksi di mana berkas fisik harus sukses disimpan di penyimpanan objek terlebih dahulu sebelum metadatanya dicatat ke database relasional PostgreSQL.

---

## Penjelasan Lengkap File Proyek

Berikut adalah fungsi dari setiap berkas yang ada di dalam struktur proyek ini:

### 1. File Konfigurasi di Folder Root
* **.gitignore**: Menyatakan berkas dan folder yang harus diabaikan oleh sistem Git agar tidak terunggah ke repositori online (seperti node_modules dan file .env).
* **.sequelizerc**: Mengatur jalur pemetaan folder untuk kebutuhan perkakas command-line interface (CLI) milik Sequelize.
* **package.json**: Berkas manifes utama aplikasi Node.js yang mendefinisikan meta-informasi proyek, dependensi modul, dan perintah skrip eksekusi.
* **package-lock.json**: Berkas otomatis yang mengunci versi tepat dari seluruh sub-dependensi modul agar instalasi tetap konsisten di setiap mesin.
* **.env**: Menyimpan variabel lingkungan sensitif yang digunakan untuk konfigurasi port aplikasi, koneksi database PostgreSQL, dan kredensial Object Storage MinIO.

### 2. Folder Migrasi Database
* **migrations/20260709000000-create-local-files.js**: Skrip migrasi database relasional yang berisi instruksi untuk membuat tabel skema penyimpanan berkas di PostgreSQL.

### 3. Folder Konfigurasi Aplikasi (src/config)
* **src/config/database.js**: Membuat instance koneksi ke database relasional PostgreSQL menggunakan Sequelize ORM.
* **src/config/env.js**: Memuat variabel dari berkas .env dan mengekspornya dalam bentuk objek JavaScript terstruktur.
* **src/config/minio.js**: Menginisialisasi dan mengekspor instance client untuk berinteraksi dengan API Object Storage MinIO.
* **src/config/sequelize-cli.js**: Menyediakan konfigurasi koneksi database untuk dibaca oleh perkakas Sequelize CLI saat menjalankan perintah migrasi.

### 4. Folder Model & Repository Database (src/models & src/repositories)
* **src/models/index.js**: Skrip pemuat otomatis (autoloader) yang mengumpulkan seluruh definisi model database di dalam proyek.
* **src/models/file.js**: Mendefinisikan skema model Sequelize untuk tabel berkas, termasuk tipe data UUID, nama asli berkas, letak path penyimpanan, dan ukuran berkas.
* **src/repositories/file-repository.js**: Menyediakan database query helper (create, find, delete, update) agar query SQL terpisah dari logika bisnis.

### 5. Folder Router & Controller (src/routes & src/controllers)
* **src/routes/file-routes.js**: Mendefinisikan rute/endpoint HTTP (URL endpoint) untuk pengoperasian berkas dan menghubungkannya dengan controller yang sesuai.
* **src/controllers/file-controller.js**: Menangani request dan response HTTP, mengekstrak data dari client, serta mencatat statistik perbandingan RAM (sebelum, sesudah, dan selisih penggunaan memori).

### 6. Folder Layanan Bisnis (src/services)
* **src/services/file-service.js**: Mengandung logika bisnis utama untuk pengunggahan dengan metode Stream. Berkas ini juga menyimpan salinan arsip kode lama penulisan local storage secara stream di bagian bawah sebagai komentar.
* **src/services/file-buffer-service.js**: Mengandung logika bisnis utama untuk pengunggahan dengan metode Buffer. Berkas ini juga menyimpan salinan arsip kode lama penulisan local storage secara buffer di bagian bawah sebagai komentar.

### 7. Folder Utilitas & Entry Point (src/utils & src/server.js)
* **src/utils/validation.js**: Berisi utilitas untuk memvalidasi apakah string ID yang diterima dari parameter request memiliki format UUIDv4 yang benar.
* **src/server.js**: Berkas entry point utama aplikasi yang bertugas memuat middleware, inisialisasi awal database, serta menjalankan server HTTP pada port yang ditentukan.
* **src/app.js**: Mengatur konfigurasi Express, mendaftarkan middleware penanganan body JSON, rute global, serta penanganan error rute tidak ditemukan (404).

---

## Cara Menjalankan Aplikasi

1. Jalankan perintah instalasi dependensi:
   ```bash
   npm install
   ```
2. Pastikan database PostgreSQL dan server MinIO sudah aktif.
3. Jalankan migrasi skema database:
   ```bash
   npx sequelize-cli db:migrate
   ```
4. Jalankan aplikasi server:
   ```bash
   npm start
   ```

---

## Petunjuk Pengujian Perbandingan Memori

Pengujian dilakukan menggunakan client HTTP seperti Postman atau cURL dengan mengirimkan berkas biner mentah (raw binary) pada endpoint upload.

* **URL Endpoint**: `POST http://localhost:3000/files/upload`
* **HTTP Headers**:
  * `x-file-name`: nama_file.ext (contoh: video.mp4)
  * `Content-Type`: `application/octet-stream`
  * `x-service-mode`: `stream` atau `buffer`
* **Body Request**: Pilih tipe **binary** lalu muat berkas uji coba.

### Contoh Log Output Hasil Pengujian di Terminal

#### Pengujian Metode STREAM:
```text
Sebelum: 18.00 MB
Sesudah: 18.00 MB
Selisih: 0.00 MB
Ukuran file: 132.42 MB
```

#### Pengujian Metode BUFFER:
```text
Sebelum: 18.00 MB
Sesudah: 150.45 MB
Selisih: 132.45 MB
Ukuran file: 132.42 MB
```
