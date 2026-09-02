# 💍 Wedding Studio Platform — Panduan Hosting Gratis (Production Ready)

Sistem platform pembuatan undangan digital berbasis **Node.js Express** dan **Template Engine Responsif**.

---

## 🚀 Panduan Deploy ke Render.com (100% Gratis)

### Langkah 1: Buat Repository di GitHub
1. Buka [github.com/new](https://github.com/new).
2. Beri nama repository (contoh: `wedding-studio`).
3. Pilih **Public** atau **Private**, lalu klik **Create repository**.

### Langkah 2: Push Kode dari Komputer Anda
Buka terminal/PowerShell di folder project ini, lalu jalankan:

```bash
# Ubah URL sesuai nama repo GitHub Anda:
git remote add origin https://github.com/USERNAME_ANDA/wedding-studio.git
git branch -M main
git push -u origin main
```

---

### Langkah 3: Deploy di Render.com
1. Buka [dashboard.render.com](https://dashboard.render.com) dan login dengan akun **GitHub**.
2. Klik tombol **New +** (kanan atas) ➔ Pilih **Web Service**.
3. Pilih repository `wedding-studio` yang baru Anda push.
4. Masukkan konfigurasi berikut:
   - **Name**: `wedding-studio-anda` *(atau nama brand Anda)*
   - **Region**: `Singapore` *(paling cepat untuk akses Indonesia)*
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Plan**: `Free`
5. Klik **Deploy Web Service**.

Dalam waktu ~2 menit, website Anda sudah online di alamat:
👉 **`https://wedding-studio-anda.onrender.com`**

---

## 🌟 Fitur URL Publik Undangan yang Sudah Otomatis Aktif
- **Editor / Studio**: `https://domain-anda.com/` atau `/app/index.html`
- **Login Pengguna & Admin**: `https://domain-anda.com/app/login.html`
- **Link Undangan Langsung (Pretty URL)**: `https://domain-anda.com/i/nama-undangan`
- **Link Undangan dengan Nama Tamu**: `https://domain-anda.com/i/nama-undangan?to=Budi+Santoso`
- **Live RSVP & Wishes**: Form konfirmasi kehadiran & ucapan tamu langsung tersimpan ke backend database secara real-time.

---

## 💻 Menjalankan Secara Lokal (Development)

```bash
# Menjalankan server & hot-reload:
npm run dev

# Atau menjalankan backend server saja:
npm start
```
Akses di browser: `http://localhost:5000` atau `http://localhost:5173`
