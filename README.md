# KLIYU

**Create Your Moment.** KLIYU mengubah video panjang menjadi short content yang layak dibagikan melalui transkripsi, deteksi momen AI, penyuntingan cepat, dan export MP4.

## MVP v1.0

- Personal workspace dengan Sign in with ChatGPT
- Upload MP4/MOV, impor file video publik, atau ambil video milik Anda dari YouTube/Instagram/TikTok pada mode lokal
- Transkripsi bertimestamp per kata melalui OpenAI Whisper atau estimasi berbobot dari whisper.cpp lokal
- Kliyu AI moment detection memakai OpenAI Responses API atau Ollama lokal dengan structured output
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

## AI lokal gratis (macOS)

Mode lokal menjalankan Ollama untuk analisis momen/caption dan whisper.cpp untuk transkripsi. Data video dan transkrip tidak dikirim ke penyedia AI berbayar.

```bash
npm run local-ai:setup
npm run dev
```

Setup menginstal `ollama`, `whisper-cpp`, `ffmpeg`, dan `yt-dlp` melalui Homebrew, lalu mengunduh model `qwen2.5:1.5b` dan Whisper multilingual `base`. Gunakan hanya video milik Anda atau video yang memang Anda berhak proses. Pada penggunaan berikutnya:

```bash
npm run local-ai:start
npm run local-ai:check
npm run dev
```

Perintah `npm run dev` juga memastikan seluruh layanan lokal aktif dan memakai port 3000 secara tetap. Jika browser pernah menampilkan overlay Vite setelah server berhenti, tutup overlay lalu muat ulang `http://localhost:3000` setelah perintah ini menampilkan status `Local`.

Mode ini hanya tersedia saat aplikasi berjalan lokal di Mac karena deployment cloud tidak dapat mengakses `127.0.0.1`. Untuk mematikan proses latar belakang yang dijalankan KLIYU gunakan `npm run local-ai:stop`.

## Konfigurasi produksi

`AI_PROVIDER=ollama` memakai `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, dan `WHISPER_BASE_URL`. `AI_PROVIDER=openai` memakai `OPENAI_API_KEY` dan `OPENAI_MODEL`. Untuk mode lokal, `LOCAL_RENDER_BASE_URL=http://127.0.0.1:8789` mengaktifkan ekspor MP4 melalui FFmpeg yang ikut dijalankan oleh `npm run local-ai:start`.

Untuk deployment produksi, `RENDER_SERVICE_URL` menunjuk ke layanan media eksternal. Endpoint `POST {RENDER_SERVICE_URL}/render` menerima konfigurasi clip sebagai JSON dan harus mengembalikan salah satu dari:

- respons body video (`video/mp4`), atau
- JSON `{ "downloadUrl": "https://.../result.mp4" }`.

Jika integrasi belum tersedia, API KLIYU mengembalikan error konfigurasi yang jelas dan tidak membuat hasil demo palsu. Setelah mengubah `db/schema.ts`, buat migration dengan `npm run db:generate`.

Publikasi langsung memakai `PUBLISH_SERVICE_URL` dan opsional `PUBLISH_SERVICE_TOKEN`. Adapter menerima `POST /publish` berupa multipart (`video`, `platform`, `caption`) dan mengembalikan `{ "externalUrl": "https://..." }`. Token OAuth YouTube, TikTok, Instagram, atau Facebook disimpan di adapter tersebut—bukan di browser KLIYU.

Semua endpoint mutasi utama memeriksa same-origin dan memakai rate limit dasar. Untuk produksi berskala besar, letakkan layanan render/publish di belakang autentikasi, rate limiting persisten, antrean job, serta observability milik provider.

## Storage dan authentication

`.openai/hosting.json` mendeklarasikan binding D1 `DB` dan R2 `MEDIA`. Deployment private memakai identity headers Sign in with ChatGPT yang disediakan platform hosting; route API selalu membatasi record berdasarkan pengguna aktif.
