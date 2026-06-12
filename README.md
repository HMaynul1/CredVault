# CrdxCube — Zero-Knowledge Credential Vault

A production-grade, mobile-first PWA with a deep-dark glassmorphic gradient UI.
**True zero-knowledge**: all encryption/decryption happens in your browser with
AES-256-GCM (key derived via PBKDF2, 250k iterations). The server (NeonDB) only
ever stores opaque ciphertext — never your master password, never plaintext data.

## Features

- 🔐 Zero-knowledge AES-256-GCM client-side encryption (NeonDB stores ciphertext only)
- 📱 Mobile-first installable PWA, offline-capable, animated glassmorphic dark theme
- 🧾 **40+ field credential form** across Login, API & Cloud, SSH/Certs, Payment Cards, Banking, Identity, Custom, Attachments
- 📄 **OCR import** from any image/PDF (Tesseract.js, runs in-browser)
- 📷 **Camera scan** import (mobile camera capture → OCR → auto-filled form)
- 📎 **Encrypted attachments** via Cloudinary — files are AES-encrypted *before* upload, so Cloudinary only stores opaque bytes
- 📊 **Export to XLSX** (SheetJS) and **📕 PDF** (jsPDF) of your full vault
- 🔎 Search, category tabs, favorites, tags, folders
- 🎲 Strong password generator + strength meter
- 📋 One-tap copy with auto-clearing clipboard (20s)

## Stack

- Next.js 14 (App Router) + TypeScript
- **NeonDB** (serverless Postgres) via Prisma — stores only `{ email, passwordHash, salt, encrypted vault blob }`
- **Cloudinary** — stores client-encrypted attachment blobs (raw resource type)
- Tesseract.js for OCR (client-side, no data sent to a third party)
- xlsx + jspdf/jspdf-autotable for exports

## Setup

1. **NeonDB**: create a project at neon.tech, copy the connection string into `DATABASE_URL`.
2. **Cloudinary**: create a free account, copy cloud name / API key / API secret.
3. Copy `.env.example` to `.env` and fill in all values (including a random `JWT_SECRET`).
4. Install deps and push the schema:

```bash
npm install
npx prisma db push
npm run dev
```

## Deploy to Vercel

```bash
git init
git add .
git commit -m "Initial commit: CrdxCube zero-knowledge vault"
git branch -M main
git remote add origin https://github.com/HMaynul1/CrdxCube.git
git push -u origin main
```

In Vercel:
1. Import the `HMaynul1/CrdxCube` repo.
2. Framework preset: **Next.js** (auto-detected).
3. Add environment variables from `.env.example` (`DATABASE_URL`, `JWT_SECRET`, `CLOUDINARY_*`).
4. Deploy. Build command `prisma generate && next build` runs automatically.

## How "zero-knowledge" works here

1. On signup, your master password derives:
   - An **encryption key** (PBKDF2 → AES-256-GCM key) — used to encrypt/decrypt your vault. **Never leaves the browser.**
   - A separate **auth hash** (different PBKDF2 derivation) — sent to the server and bcrypt-hashed for login verification only.
2. Your vault (all 40+ fields per item) is serialized to JSON, encrypted client-side, and the resulting ciphertext+IV is the *only* thing sent to `/api/vault`.
3. Attachments are AES-GCM encrypted client-side before being uploaded to Cloudinary as raw bytes.
4. Forgetting your master password means the vault **cannot be recovered** by you, the server, or anyone — that's the security guarantee.

## ⚠️ Notes on exports

XLSX/PDF exports contain **decrypted** data (since they're generated after you unlock your vault). Store exported files securely and delete them when no longer needed.
