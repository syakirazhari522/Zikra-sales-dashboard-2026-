# Dashboard Jualan Zikra 2026

Dashboard jualan dan pendaftaran Zikra yang dibina menggunakan Next.js, Supabase dan Vercel.

## Fungsi

- Ringkasan harian, mingguan, bulanan dan keseluruhan
- Jumlah jualan dan pendaftaran
- Filter satu atau beberapa kelas
- Pecahan jualan mengikut kelas
- Sync Google Sheets melalui Apps Script dan Supabase

## Development

```bash
pnpm install
pnpm dev
```

Salin `.env.example` kepada `.env.local` dan isi environment variables yang diperlukan. Jangan commit fail `.env` atau secret keys.

## Production

[Buka dashboard](https://sales-dashboard-kohl-sigma.vercel.app)
