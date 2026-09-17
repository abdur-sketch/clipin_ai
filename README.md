# KLIYU

**Create Your Moment.** KLIYU mengubah video panjang menjadi short content dengan Browser AI yang berjalan langsung pada perangkat pengguna.

## MVP v1.0

- Personal workspace dengan Sign in with ChatGPT
- Upload MP4/MOV atau gunakan link YouTube yang memiliki caption
- Transkripsi Whisper multilingual langsung di browser melalui WebGPU dengan fallback WebAssembly
- Deteksi momen memakai Browser AI bawaan bila tersedia, dengan ranking deterministik sebagai fallback
- My Clips: All, Hot, Ready, Exported
- Kliyu Studio: timeline dua-handle, Undo/Redo, zoom, safe area, editor subtitle, Karaoke per kata, preset visual, animasi judul, smart silence cleanup, dan tracking wajah bergerak
- AI Caption: hook, caption, CTA, hashtag, dan copy sekali klik
- Export MP4 melalui antrean FFmpeg dengan progress aktual, cancel, retry, H.264/AAC, dan normalisasi audio
- Manajemen project: rename, duplicate, dan delete beserta aset terkait
- Publikasi manual atau langsung melalui adapter OAuth eksternal
- Published tracker untuk URL, views, likes, comments, shares, dan followers gained
- Content Analytics untuk kategori, durasi, dan jam posting terbaik
- Monetization dashboard untuk platform revenue, affiliate, produk digital, dan client
- Cloudflare D1 untuk metadata dan R2 untuk source, logo, serta hasil render

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Gunakan Node.js `>=22.13.0`. Build dan verifikasi:

```bash
npm run lint
npm test
```

## Browser AI

Tidak ada Ollama, Whisper server, tunnel, atau API key yang dibutuhkan untuk proses utama. Model Whisper dimuat dan disimpan oleh browser saat pertama kali digunakan. Chrome/Edge dengan WebGPU memberikan performa terbaik; browser tanpa WebGPU otomatis memakai WebAssembly. Untuk link YouTube, KLIYU membaca caption sumber. Jika caption tidak tersedia, unggah file video aslinya.

## Konfigurasi produksi

Proses transkripsi dan pemilihan momen tidak memerlukan konfigurasi server. `OPENAI_API_KEY` bersifat opsional untuk fitur copywriting atau terjemahan cloud. Untuk deployment produksi, `RENDER_SERVICE_URL` dapat menunjuk ke layanan media eksternal. Endpoint `POST {RENDER_SERVICE_URL}/render` menerima konfigurasi clip sebagai JSON dan harus mengembalikan salah satu dari:

- respons body video (`video/mp4`), atau
- JSON `{ "downloadUrl": "https://.../result.mp4" }`.

Jika integrasi belum tersedia, API KLIYU mengembalikan error konfigurasi yang jelas dan tidak membuat hasil demo palsu. Setelah mengubah `db/schema.ts`, buat migration dengan `npm run db:generate`.

Publikasi langsung memakai `PUBLISH_SERVICE_URL` dan opsional `PUBLISH_SERVICE_TOKEN`. Adapter menerima `POST /publish` berupa multipart (`video`, `platform`, `caption`) dan mengembalikan `{ "externalUrl": "https://..." }`. Token OAuth YouTube, TikTok, Instagram, atau Facebook disimpan di adapter tersebut—bukan di browser KLIYU.

Semua endpoint mutasi utama memeriksa same-origin dan memakai rate limit dasar. Untuk produksi berskala besar, letakkan layanan render/publish di belakang autentikasi, rate limiting persisten, antrean job, serta observability milik provider.

## Storage dan authentication

`.openai/hosting.json` mendeklarasikan binding D1 `DB` dan R2 `MEDIA`. Deployment private memakai identity headers Sign in with ChatGPT yang disediakan platform hosting; route API selalu membatasi record berdasarkan pengguna aktif.
