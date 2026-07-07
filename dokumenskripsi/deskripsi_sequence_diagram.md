# Deskripsi Sequence Diagram E-Voting Pilkada

Berikut adalah seluruh deskripsi untuk 18 *Sequence Diagram* sistem E-Voting Pilkada sesuai dengan implementasi dan alur kerja proyek:

---

## 1. Lihat Quick Count
*Sequence Diagram* ini menggambarkan alur akses informasi perolehan suara secara cepat (*Quick Count*) oleh Publik melalui dasbor transparansi utama. Masyarakat umum dapat mengakses dasbor ini secara terbuka tanpa memerlukan login. Aplikasi *frontend* secara otomatis mengirim request `GET /public/results` ke *backend API*. *Backend* kemudian melakukan penghitungan agregat suara paslon secara *real-time* dari tabel *votes*, serta menarik status TPS beserta *transaction hash* dari tabel *blockchain_records* di *database*. Hasil pemrosesan data tersebut dikembalikan dalam format JSON, untuk kemudian di-render oleh *frontend* dalam bentuk grafik diagram interaktif dan daftar status TPS untuk dipantau oleh Publik.

---

## 2. Lihat Profil Paslon
*Sequence Diagram* ini menggambarkan alur kerja saat Publik mengakses informasi profil lengkap pasangan calon. Pengguna membuka halaman atau mengklik salah satu paslon pada layar utama dasbor transparansi. Hal ini memicu *frontend* untuk mengirim request `GET /public/results` guna meminta data profil kandidat yang lengkap dari *backend API*. *Backend* kemudian melakukan query detail informasi (visi, misi, motto, pendidikan, karir, dan URL foto paslon) dari tabel *candidate_pairs* di *database* SQLite. Data tersebut dikembalikan ke *frontend* dalam format JSON dan di-render ke layar Publik dalam bentuk halaman profil interaktif.

---

## 3. Login Auth
*Sequence Diagram* ini menggambarkan alur masuk pengguna (*auth login*) ke dalam dasbor sistem (Admin, KPPS, dan Saksi). Pengguna memasukkan alamat email dan kata sandi pada antarmuka *frontend* untuk divalidasi ke *backend API* melalui request `POST /auth/login`. *Backend* mencocokkan email di tabel *users* dan mencocokkan kata sandi menggunakan pustaka *bcryptjs*. Jika data terbukti valid, sistem akan mengeluarkan token akses *JSON Web Token* (JWT) yang kemudian disimpan oleh *frontend* pada penyimpanan lokal untuk proses otorisasi sesi dasbor pengguna sesuai dengan peran (*role*) masing-masing.

---

## 4. Validasi Sesi Aktif
*Sequence Diagram* ini menggambarkan mekanisme berkala (*polling*) yang dilakukan oleh aplikasi bilik suara (*Frontend Kiosk*) untuk membuka kunci layar secara otomatis. *Frontend* mengirimkan request `GET /voting-sessions/booth/:boothId/status` ke *backend API*. *Backend* menyeleksi status token pada tabel *voting_sessions* untuk melihat apakah ada sesi berstatus *ACTIVE* yang belum kedaluwarsa. Apabila sesi aktif ditemukan, respon *UNLOCKED* dikirimkan ke bilik suara, memicu layar terbuka dan menampilkan menu pasangan calon untuk pemilih. Jika tidak ada sesi aktif, layar bilik tetap berada pada kondisi terkunci (*LOCKED*).

---

## 5. Buka Bilik Suara
*Sequence Diagram* ini menggambarkan alur kerja Ketua KPPS dalam mengaktifkan bilik suara fisik agar pemilih dapat menyalurkan hak suaranya. Proses diawali saat KPPS memilih bilik kosong di dasbor petugas dan menekan tombol "Buka Bilik". *Frontend* mengirim request `POST /voting-sessions/unlock` ke *backend API*. *Backend* memvalidasi hak akses petugas untuk TPS tersebut, men-generate token acak dan waktu kedaluwarsa (5 menit), lalu menyimpan sesi baru (status *ACTIVE*) ke tabel *voting_sessions* di *database* serta mencatat log audit. Dasbor KPPS akan menampilkan status bilik terbuka (*UNLOCKED*).

---

## 6. Batalkan Sesi
*Sequence Diagram* ini menjelaskan proses pembatalan sesi token aktif oleh Ketua KPPS. Alur dimulai ketika petugas KPPS memilih sesi token yang sedang aktif di dasbor petugas dan menekan tombol "Batalkan Sesi". Request dikirim ke *backend* melalui endpoint `POST /voting-sessions/:id/cancel`. *Backend* kemudian melakukan perubahan status sesi menjadi *CANCELLED* pada tabel *voting_sessions* dan mencatat riwayat pembatalan ke tabel *audit_logs*. Setelah data berhasil diperbarui, *backend* mengirimkan respon sukses untuk memicu *frontend* memperbarui tampilan status bilik menjadi terkunci (*LOCKED*) kembali.

---

## 7. Generate Rekap TPS
*Sequence Diagram* ini menggambarkan alur rekapitulasi perolehan suara tingkat TPS oleh Ketua KPPS. Proses diawali saat KPPS menekan tombol "Generate Rekap TPS" di *frontend*. *Frontend* mengirim request `POST /recaps/tps/:tpsId/generate` ke *backend API*. *Backend* melakukan penghitungan total suara paslon dari tabel *votes* di *database*, memvalidasi kesesuaian total suara dengan jumlah pemilih terverifikasi, lalu menyimpan hasilnya ke tabel *tps_recaps* dan *tps_recap_candidate_totals*. TPS status diperbarui menjadi *RECAP_GENERATED*.

---

## 8. Finalisasi Hasil
*Sequence Diagram* ini menggambarkan proses akhir rekapitulasi tingkat TPS di mana data hasil pemilihan dijangkar (*anchored*) secara permanen ke jaringan *blockchain*. Proses diawali oleh Ketua KPPS dengan menekan tombol "Finalisasi & Anchor ke Blockchain". Aplikasi *frontend* mengirim request `POST /finalization/tps/:tpsId` ke *backend API*. *Backend* kemudian menarik data rekap dari tabel *tps_recaps*, mengambil nilai *hash* dokumen C.Hasil-KWK dari tabel *documents*, serta memproses nilai *hash* berantai dari tabel *audit_logs*. Ketiga elemen data ini dikirimkan ke *smart contract* di jaringan *blockchain* melalui fungsi `anchorTpsResult`. Begitu transaksi dikonfirmasi oleh *blockchain*, *backend* menyimpan struk transaksi (*transaction hash*) ke tabel *blockchain_records*, mengubah status TPS menjadi *BLOCKCHAIN_ANCHORED* di *database* lokal, dan menampilkan bukti struk transaksi ke layar KPPS.

---

## 9. Generate C Hasil
*Sequence Diagram* ini menggambarkan proses pembentukan berkas formulir C.Hasil-KWK oleh Ketua KPPS. Proses diawali saat KPPS menekan tombol "Generate Dokumen C.Hasil-KWK". *Frontend* mengirimkan request `POST /documents/tps/:tpsId/chasil/generate` ke *backend*. Sistem *backend* mengambil rekapitulasi perolehan suara dari tabel *tps_recaps* dan me-render template dokumen menggunakan *chasilTemplate.ts*. Berkas HTML/PDF tersebut kemudian disimpan pada direktori lokal server, dan metadatanya dicatat ke tabel *documents* dengan status *GENERATED*. Alur ditutup dengan kembalinya URL pratinjau dokumen untuk ditampilkan pada layar KPPS.

---

## 10. Upload C Hasil
*Sequence Diagram* ini menggambarkan alur kerja Ketua KPPS saat mengunggah berkas formulir C.Hasil-KWK fisik yang telah ditandatangani basah oleh petugas dan saksi. KPPS memilih berkas (format PDF, JPG, atau PNG) dan menekan tombol "Upload". Berkas dikirim via `POST /documents/:documentId/signed-upload` dengan format *multipart/form-data*. *Backend API* akan memvalidasi format dan ukuran file, lalu menyimpannya secara lokal di server pada direktori *uploads*. Selanjutnya, sistem menghitung nilai sidik digital (*SHA-256 Hash*) dari berkas biner tersebut secara otomatis guna menjaga integritas dokumen. Nilai *hash* dan lokasi berkas disimpan ke tabel *documents* melalui operasi *update*, diiringi dengan pencatatan log pada tabel *audit_logs*.

---

## 11. Verifikasi Rekap TPS
*Sequence Diagram* ini menggambarkan alur kerja verifikasi rekapitulasi suara oleh Saksi di tingkat TPS. Alur dimulai ketika Saksi membuka menu Verifikasi TPS, memicu *frontend* untuk mengirim request `GET /witness/recap` ke *backend API*. *Backend* kemudian melakukan query data rekapitulasi TPS tempat Saksi ditugaskan dari *database*. Setelah data ditampilkan di layar, Saksi dapat memilih opsi APPROVED untuk menyetujui hasil rekapitulasi, mengisi catatan opsional, lalu kirim data via `POST /witness/verify` dengan status *APPROVED*. *Backend* menyimpan data verifikasi saksi ke tabel *witness_verifications* di *database* serta mencatat riwayat aktivitas ke tabel *audit_logs*.

---

## 12. Upload Bukti Keberatan
*Sequence Diagram* ini menjelaskan alur pelaporan keberatan hasil rekapitulasi suara oleh Saksi TPS yang tidak menyetujui hasil perhitungan. Saksi menuliskan alasan penolakan pada kolom catatan dan mengunggah berkas bukti keberatan berupa file PDF/JPG/PNG ke sistem. Data dikirimkan menggunakan format *multipart/form-data* melalui request `POST /witness/verify` dengan status *OBJECTED*. *Backend API* memproses file bukti ke folder penyimpanan lokal, mencatat data keberatan saksi pada tabel *witness_verifications*, dan menyimpan jejak aktivitas pada tabel *audit_logs* sebelum mengirimkan status sukses ke layar Saksi.

---

## 13. Manajemen Akun KPPS dan Saksi
*Sequence Diagram* ini menggambarkan alur pembuatan (penjanaan) akun petugas KPPS dan Saksi yang dilakukan oleh Admin KPU secara otomatis. Ketika Admin memilih perintah generate akun, *frontend* akan mengirimkan request `POST /kpps/generate` atau `POST /witnesses/generate` ke *backend API*. *Backend* kemudian melakukan query ke *database* untuk menyeleksi TPS yang belum memiliki akun petugas. Selanjutnya, sistem secara otomatis men-generate kata sandi acak, melakukan enkripsi (*hashing*) menggunakan algoritma *bcryptjs*, dan menyimpan akun baru ke tabel *users* dengan peran *KPPS* atau *WITNESS*. Sebagai hasil akhir, *backend* mengirimkan data daftar akun beserta *password* mentahnya untuk ditampilkan di antarmuka Admin agar dapat diekspor.

---

## 14. Manajemen DPT
*Sequence Diagram* ini menggambarkan alur konfigurasi jumlah Daftar Pemilih Tetap (DPT) per TPS oleh Admin KPU untuk menjaga keamanan dan kerahasiaan data pemilih. Proses dimulai dengan Admin membuka menu Manajemen DPT/TPS, di mana aplikasi *frontend* meminta data daftar TPS ke *backend API* (melalui query ke database SQLite) untuk menampilkan kuota pemilih saat ini. Pada alur penambahan atau perubahan DPT, Admin menginputkan "Jumlah DPT" pada form TPS. *Backend* akan melakukan validasi batas maksimal (500 pemilih per TPS) sesuai regulasi KPU. Jika valid, *backend* memperbarui kolom *registered_voters_total* pada tabel *tps* di *database*. Proses diakhiri dengan pengembalian status sukses dan notifikasi pada layar Admin.

---

## 15. Manajemen TPS
*Sequence Diagram* ini menggambarkan alur kerja administratif saat Admin KPU mengelola data Pemilihan (Pilkada) dan TPS di dalam sistem. Proses dimulai saat Admin mengakses menu Manajemen Pilkada & TPS, di mana *frontend* akan mengirimkan request `GET /elections` and `GET /tps` ke *backend API* untuk memuat data dari *database* SQLite. Pada alur penambahan Pilkada, data nama pemilihan, tanggal, dan yurisdiksi wilayah yang diinputkan Admin disimpan ke dalam tabel *elections*. Sementara itu, pada alur penambahan TPS, Admin menentukan nomor TPS, wilayah administratif, dan kuota DPT yang kemudian disimpan ke tabel *tps* dengan menghubungkannya ke ID Pemilihan terkait. Kedua alur diakhiri dengan konfirmasi sukses yang muncul pada antarmuka pengguna.

---

## 16. Manajemen Paslon
*Sequence Diagram* ini menggambarkan alur pendaftaran dan pengelolaan data Pasangan Calon (Paslon) oleh Admin KPU. Proses diawali saat Admin membuka menu Manajemen Pasangan Calon, di mana aplikasi *frontend* meminta data paslon terdaftar (`GET /candidate-pairs`) ke *backend* untuk dimuat dari tabel *candidate_pairs* di *database*. Pada alur penambahan paslon baru, Admin menginputkan nomor urut, data nama calon dan wakil calon, visi-misi, serta mengunggah file foto paslon. Request dikirimkan menggunakan format *multipart/form-data* ke *backend API*. Selanjutnya, *backend* menyimpan file foto tersebut secara lokal ke folder *uploads* dan melakukan *insert* data paslon beserta URL fotonya ke *database*. Konfirmasi keberhasilan kemudian ditampilkan pada antarmuka pengguna.

---

## 17. Pantau Audit Logs
*Sequence Diagram* ini menggambarkan alur kerja saat Admin KPU memantau aktivitas sistem melalui halaman audit logs. Proses ini bersifat *read-only* (hanya membaca data). Diawali dengan Admin membuka halaman Audit Logs di dasbor, yang kemudian memicu aplikasi *frontend* untuk mengirimkan request `GET /audit-logs` ke *backend API*. *Backend* akan melakukan query pada tabel *audit_logs* di *database* SQLite. Setelah *database* mengembalikan data riwayat log, *backend* memformat data tersebut ke dalam bentuk JSON dan mengirimkannya kembali ke *frontend* untuk ditampilkan dalam bentuk tabel kronologis yang rapi pada layar Admin.

---

## 18. Pilih dan Confirm Paslon
*Sequence Diagram* ini menggambarkan alur pemilihan suara di bilik suara oleh Pemilih. Layar bilik suara (*Frontend Kiosk*) mendeteksi status bilik telah terbuka (*UNLOCKED*). Daftar pasangan calon ditampilkan ke layar bilik. Pemilih kemudian menentukan pilihan dan mengklik tombol konfirmasi. *Frontend* mengirimkan data pilihan via `POST /votes/cast`. *Backend* memvalidasi waktu kedaluwarsa sesi, lalu secara transaksional menyimpan suara secara anonim ke tabel *votes*, mengubah status sesi menjadi terpakai (*USED*), serta mencatat riwayat aktivitas ke tabel *audit_logs*. Alur selesai ketika layar bilik suara mengonfirmasi keberhasilan perekaman dan mengunci layarnya kembali secara otomatis.
