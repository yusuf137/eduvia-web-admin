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

`src/firebase/firebaseConfig.js` içine mobil Eduvia Firebase değerlerini girin.

```bash
npm run dev
```

## Yapı

- `src/contexts/AuthContext.jsx` — oturum + `users/{uid}` profili
- `src/layouts/` — Admin / SuperAdmin kabukları
- `src/pages/` — placeholder sayfalar
- `src/services/` — Firestore servisleri (ileriki aşama)
