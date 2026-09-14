# KLIYU

**Create Your Moment.** KLIYU mengubah video panjang menjadi short content yang layak dibagikan melalui transkripsi, deteksi momen AI, penyuntingan cepat, dan export MP4.

## MVP v1.0

- Personal workspace dengan Sign in with ChatGPT
- Upload MP4/MOV atau impor link file video MP4/WebM publik
- Transkripsi bertimestamp melalui OpenAI Whisper atau whisper.cpp lokal
- Kliyu AI moment detection memakai OpenAI Responses API atau Ollama lokal dengan structured output
- My Clips: All, Hot, Ready, Exported
- Kliyu Studio: trim, rasio 9:16/1:1/16:9, captions, subtitle style, hook, font size, logo, dan watermark
- AI Caption: hook, caption, CTA, hashtag, dan copy sekali klik
- Export MP4 melalui layanan FFmpeg
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

Setup menginstal `ollama`, `whisper-cpp`, dan `ffmpeg` melalui Homebrew, lalu mengunduh model `qwen2.5:1.5b` dan Whisper multilingual `base`. Pada penggunaan berikutnya:

```bash
npm run local-ai:start
npm run local-ai:check
npm run dev
```

Mode ini hanya tersedia saat aplikasi berjalan lokal di Mac karena deployment cloud tidak dapat mengakses `127.0.0.1`. Untuk mematikan proses latar belakang yang dijalankan KLIYU gunakan `npm run local-ai:stop`.

## Konfigurasi produksi

`AI_PROVIDER=ollama` memakai `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, dan `WHISPER_BASE_URL`. `AI_PROVIDER=openai` memakai `OPENAI_API_KEY` dan `OPENAI_MODEL`. Untuk mode lokal, `LOCAL_RENDER_BASE_URL=http://127.0.0.1:8789` mengaktifkan ekspor MP4 melalui FFmpeg yang ikut dijalankan oleh `npm run local-ai:start`.

Untuk deployment produksi, `RENDER_SERVICE_URL` menunjuk ke layanan media eksternal. Endpoint `POST {RENDER_SERVICE_URL}/render` menerima konfigurasi clip sebagai JSON dan harus mengembalikan salah satu dari:

- respons body video (`video/mp4`), atau
- JSON `{ "downloadUrl": "https://.../result.mp4" }`.

Jika integrasi belum tersedia, API KLIYU mengembalikan error konfigurasi yang jelas dan tidak membuat hasil demo palsu. Setelah mengubah `db/schema.ts`, buat migration dengan `npm run db:generate`.

## Storage dan authentication

`.openai/hosting.json` mendeklarasikan binding D1 `DB` dan R2 `MEDIA`. Deployment private memakai identity headers Sign in with ChatGPT yang disediakan platform hosting; route API selalu membatasi record berdasarkan pengguna aktif.
