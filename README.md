# KLIYU

**Create Your Moment.** KLIYU mengubah video panjang menjadi short content yang layak dibagikan melalui transkripsi, deteksi momen AI, penyuntingan cepat, dan export MP4.

## MVP v1.0

- Personal workspace dengan Sign in with ChatGPT
- Upload MP4/MOV atau impor link file video MP4/WebM publik
- Transkripsi OpenAI Whisper dengan timestamp
- Kliyu AI moment detection memakai Responses API dan strict JSON schema
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

## Konfigurasi produksi

`OPENAI_API_KEY` mengaktifkan transkripsi dan deteksi momen. `RENDER_SERVICE_URL` menunjuk ke layanan media Anda. Endpoint `POST {RENDER_SERVICE_URL}/render` menerima konfigurasi clip sebagai JSON dan harus mengembalikan salah satu dari:

- respons body video (`video/mp4`), atau
- JSON `{ "downloadUrl": "https://.../result.mp4" }`.

Jika integrasi belum tersedia, API KLIYU mengembalikan error konfigurasi yang jelas dan tidak membuat hasil demo palsu. Setelah mengubah `db/schema.ts`, buat migration dengan `npm run db:generate`.

## Storage dan authentication

`.openai/hosting.json` mendeklarasikan binding D1 `DB` dan R2 `MEDIA`. Deployment private memakai identity headers Sign in with ChatGPT yang disediakan platform hosting; route API selalu membatasi record berdasarkan pengguna aktif.
