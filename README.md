# RnD Object Storage

Dokumen ini menjelaskan sistem pengunggahan file berbasis REST API menggunakan Node.js, Express, Sequelize ORM, PostgreSQL, dan Object Storage MinIO. Riset ini menguji perbandingan efisiensi penggunaan memori RAM antara transfer data menggunakan konsep Stream (aliran data langsung) dengan Buffer (penampungan data memori penuh).

---

## Konsep Arsitektur: Stream vs Buffer

Sistem ini dirancang untuk membandingkan dua pendekatan transfer data menggunakan form-data upload:

1. **Metode Stream**:
   File yang diterima melalui form-data akan disimpan dalam buffer oleh multer, kemudian dikonversi menjadi readable stream untuk dialirkan ke MinIO. Walaupun file sempat berada di memory (karena menggunakan memoryStorage dari multer), pendekatan stream tetap lebih efisien dalam transfer ke MinIO karena data dialirkan secara bertahap dalam bentuk potongan-potongan kecil (chunks).

2. **Metode Buffer**:
   File yang diterima melalui form-data disimpan langsung sebagai buffer di memory oleh multer, kemudian seluruh buffer dikirimkan sekaligus ke MinIO. Konsumsi memori RAM melonjak secara linear sesuai dengan ukuran file yang diunggah karena seluruh data file harus berada di memory sebelum dikirim.

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
* **src/config/env.js**: Memuat variabel dari berkas .env dan mengekspornya dalam bentuk objek JavaScript terstruktur.
* **src/config/minio.js**: Menginisialisasi dan mengekspor instance client untuk berinteraksi dengan API Object Storage MinIO.
* **src/config/sequelize-cli.js**: Menyediakan konfigurasi koneksi database untuk dibaca oleh perkakas Sequelize CLI saat menjalankan perintah migrasi.

### 4. Folder Middleware (src/middlewares)
* **src/middlewares/upload-middleware.js**: Mengkonfigurasi multer untuk menangani upload file dengan form-data (multipart/form-data). Menggunakan memoryStorage untuk menyimpan file di memory sebagai buffer.
* **src/middlewares/validate-upload-mode.js**: Middleware untuk memvalidasi mode upload (stream/buffer) sebelum request masuk ke controller.
* **src/middlewares/error-handler.js**: Global error handler untuk menangani semua error dengan format response yang konsisten.

### 5. Folder Helpers (src/helpers)
* **src/helpers/error-helper.js**: Berisi custom error classes (NotFoundError, ValidationError, SystemError) dan semua error messages dalam satu tempat untuk konsistensi.
* **src/helpers/file-helper.js**: Berisi fungsi helper untuk sanitasi nama file agar aman disimpan.
* **src/helpers/logger.js**: Centralized logger untuk logging memory comparison dan aplikasi logs.
* **src/helpers/minio-helper.js**: Berisi fungsi helper untuk memastikan bucket MinIO sudah ada sebelum upload, dengan mekanisme penguncian mutex untuk menghindari race condition.
* **src/helpers/upload-helper.js**: Berisi fungsi helper untuk upload file ke MinIO menggunakan metode Stream (mengkonversi buffer ke readable stream) atau Buffer (langsung mengirim buffer).
* **src/helpers/validation.js**: Berisi utilitas untuk memvalidasi apakah string ID yang diterima dari parameter request memiliki format UUIDv4 yang benar.

### 6. Folder Database (src/database)
* **src/database/connection.js**: Membuat instance koneksi ke database relasional PostgreSQL menggunakan Sequelize ORM.
* **src/database/models/index.js**: Skrip pemuat otomatis (autoloader) yang mengumpulkan seluruh definisi model database di dalam proyek.
* **src/database/models/file.js**: Mendefinisikan skema model Sequelize untuk tabel berkas, termasuk tipe data UUID, nama asli berkas, letak path penyimpanan, dan ukuran berkas.
* **src/database/repositories/file-repository.js**: Menyediakan database query helper (create, find, delete, update) agar query SQL terpisah dari logika bisnis.

### 7. Folder Router & Controller (src/routes & src/controllers)
* **src/routes/file-routes.js**: Mendefinisikan rute/endpoint HTTP (URL endpoint) untuk pengoperasian berkas dan menghubungkannya dengan controller yang sesuai. Menggunakan multer middleware untuk menangani upload file.
* **src/controllers/file-controller.js**: Menangani request dan response HTTP, mengekstrak data dari form-data (req.file), serta mencatat statistik perbandingan RAM (sebelum, sesudah, dan selisih penggunaan memori).

### 8. Folder Layanan Bisnis (src/services)
* **src/services/file-service.js**: Mengandung logika bisnis utama untuk pengunggahan file dengan menerima buffer dari multer dan mengirimkannya ke MinIO menggunakan metode Stream atau Buffer.

### 9. Folder Entry Point (src/)
* **src/server.js**: Berkas entry point utama aplikasi yang bertugas memuat middleware, inisialisasi awal database, serta menjalankan server HTTP pada port yang ditentukan.
* **src/app.js**: Mengatur konfigurasi Express, mendaftarkan middleware penanganan body JSON, rute global, health check endpoint, serta penanganan error rute tidak ditemukan (404).

---

## Cara Menjalankan Aplikasi

### Prasyarat
- Node.js v16+ sudah terinstall
- Docker Desktop sudah terinstall dan running

### Setup dengan Docker (Recommended)

1. **Clone repository dan install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment variables:**
   ```bash
   # Copy .env.example ke .env (sudah ada default values untuk Docker)
   copy .env.example .env
   ```

3. **Start Docker containers (PostgreSQL + MinIO):**
   ```bash
   # Windows
   docker-start.bat
   
   # Atau manual
   docker-compose up -d
   ```

4. **Tunggu containers ready (10-15 detik), lalu jalankan migrasi database:**
   ```bash
   npx sequelize-cli db:migrate
   ```

5. **Jalankan aplikasi:**
   ```bash
   npm start
   ```

6. **Test health check endpoint:**
   ```bash
   curl http://localhost:3000/health
   ```

### Setup Manual (Tanpa Docker)

1. Install PostgreSQL dan MinIO secara manual
2. Update `.env` dengan connection details Anda
3. Jalankan migrasi database:
   ```bash
   npx sequelize-cli db:migrate
   ```
4. Jalankan aplikasi:
   ```bash
   npm start
   ```

### Access URLs

- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin123)
- **PostgreSQL**: localhost:5432 (postgres / postgres123)

Untuk dokumentasi Docker lengkap, lihat [DOCKER_SETUP.md](./DOCKER_SETUP.md)

---

## Arsitektur Aplikasi

Aplikasi ini menggunakan **Simplified Clean Architecture** dengan separation of concerns yang jelas:

- **Routes**: Mendefinisikan endpoint dan middleware
- **Controllers**: Handle HTTP request/response
- **Services**: Business logic dan orchestration
- **Repositories**: Database access layer
- **Helpers**: Helper functions, errors, dan utilities (semua dalam 1 folder untuk kesederhanaan)
- **Middlewares**: Request validation dan error handling
- **Config**: Configuration files (database, MinIO, environment)

> **💡 Kenapa Simplified?** Untuk aplikasi R&D sederhana, tidak perlu struktur yang terlalu kompleks. Semua helper functions (termasuk errors dan constants) digabung dalam folder `helpers/` agar lebih mudah dinavigasi.

Untuk dokumentasi arsitektur lengkap, lihat [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Petunjuk Pengujian Perbandingan Memori

Pengujian dilakukan menggunakan client HTTP seperti Postman atau cURL dengan mengirimkan file melalui form-data (multipart/form-data) pada endpoint upload.

* **URL Endpoint**: `POST http://localhost:3000/files/upload`
* **HTTP Headers**:
  * `x-service-mode`: `stream` atau `buffer`
* **Body Request**: Pilih tipe **form-data**, buat field dengan key `file` (type: File), lalu pilih berkas uji coba.

### Contoh penggunaan dengan cURL:

#### Upload dengan mode STREAM:
```bash
curl -X POST http://localhost:3000/files/upload \
  -H "x-service-mode: stream" \
  -F "file=@/path/to/your/file.pdf"
```

#### Upload dengan mode BUFFER:
```bash
curl -X POST http://localhost:3000/files/upload \
  -H "x-service-mode: buffer" \
  -F "file=@/path/to/your/file.pdf"
```

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
