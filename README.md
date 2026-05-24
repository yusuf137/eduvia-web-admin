# Eduvia Web Admin

Eduvia mobil uygulamasıyla aynı Firebase projesini kullanan masaüstü odaklı web yönetim paneli.

## Roller

- `superAdmin` → `/superadmin`
- `admin` → `/admin` (kurum `institutionId` zorunlu)
- `teacher` / `student` → yetkisiz

## Kurulum

```bash
cd eduvia-web-admin
npm install
```

Proje kökünde `.env.example` dosyasını `.env` olarak kopyalayın ve Firebase Console değerlerini doldurun:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Canlı ortam (Vercel): Project Settings → Environment Variables içine aynı `VITE_*` anahtarlarını ekleyin.

```bash
npm run dev
```

## Yapı

- `src/contexts/AuthContext.jsx` — oturum + `users/{uid}` profili
- `src/layouts/` — Admin / SuperAdmin kabukları
- `src/pages/` — placeholder sayfalar
- `src/services/` — Firestore servisleri (ileriki aşama)
