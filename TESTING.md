# 🚀 Finansialin Frontend + Backend Testing

## Status

✅ **Backend (Laravel)** - Running on `http://127.0.0.1:8000`
⏳ **Frontend (Next.js)** - Installing dependencies, will start on `http://127.0.0.1:3000`

## Flow Testing

1. **Landing Page** → Teks ketikan "Selamat datang di Finansialin"
2. **Login/Register** → Pilih login atau register
3. **OTP Verification** → Masukkan 6 digit OTP code
4. **Wallet Setup Popup** → Isi MBanking, E Money, Cash (disimpan ke backend)
5. **Dashboard** → Lihat dompet, tambah transaksi income/expense

## API Endpoints Connected

- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register user
- `POST /api/auth/2fa/verify-login` - OTP verification
- `GET /api/funding-sources` - List dompet
- `POST /api/funding-sources` - Tambah dompet
- `PUT /api/funding-sources/{id}` - Edit dompet
- `DELETE /api/funding-sources/{id}` - Hapus dompet
- `POST /api/transactions` - Tambah transaksi
- `GET /api/transactions?per_page=50` - List transaksi

## Environment

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api
```

**Backend (.env):**
- Database: PostgreSQL di Supabase
- API: http://127.0.0.1:8000
- Debug: ON

## Next Steps

1. Tunggu `npm install` selesai di frontend
2. Jalankan `npm run dev` di frontend (port 3000)
3. Buka http://127.0.0.1:3000 di browser
4. Test flow: Login → OTP → Wallet Popup → Dashboard

## Troubleshooting

**Backend not responding?**
- Check: http://127.0.0.1:8000 (should show 404 or welcome page)
- Terminal: Backend harus show "Server running on [http://127.0.0.1:8000]"

**Frontend port error?**
- Kill port 3000: `lsof -ti:3000 | xargs kill -9`
- Atau run dengan port lain: `npm run dev -- -p 3001`

**API connection error?**
- Check CORS di backend (.env CORS settings)
- Check .env.local di frontend (NEXT_PUBLIC_API_BASE_URL)
- Check database connection di backend

---

**Created:** May 1, 2026  
**Mode:** Development
