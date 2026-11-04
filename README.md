# Lands Commission - Survey and Mapping Division (EX DATA System)

A web system designed for the **Lands Commission of Ghana (Survey and Mapping Division)** to record EX DATA, generate official A4 dual-slip survey certificates with embedded scannable QR codes, download pixel-perfect official PDFs, and provide a digital verification portal when scanned.

---

## 🌟 Key Features

1. **Exact Document Replica (A4 Format)**
   - Official Copy (Top half) & Customer/Client Copy (Bottom half) separated by `✂ CUT HERE ✂`.
   - Exact typography, coordinates table (`BEACON INDEX`, `X`, `Y`), metadata layout, and authorization signature blocks.

2. **Worldwide Scannable QR Code (No Wi-Fi Restriction!)**
   - Automatically initializes a **Cloudflare Public HTTPS Tunnel** (`https://....trycloudflare.com`) on startup.
   - Anyone scanning the printed PDF from **ANY smartphone anywhere in the world** (on mobile cellular data like MTN, Telecel, AirtelTigo, 4G/5G, or any outside Wi-Fi) can open and verify the document without needing to be on the same local network!
   - Also provides 1-click toggles for Local Wi-Fi IP, Localhost, or Custom Production Domain.

3. **Official Public Verification Gateway (`/verify/:id`)**
   - Mobile-first, responsive portal.
   - Features the Lands Commission & Republic of Ghana branding.
   - Shows "✓ OFFICIAL EX DATA RECORD VERIFIED" badge with security audit timestamp.
   - Displays all matching beacon coordinates, client names, regional numbers, and locality.
   - Allows direct downloading of the original PDF directly onto mobile devices.

4. **1-Click High-Resolution PDF Download**
   - Direct PDF generation via `PDFKit` matching standard A4 dimensions (`[595.28, 841.89] pt`).
   - Browser print support (`@media print`) configured for standard office printers.

5. **Records Management Registry**
   - Save, load, search, re-print, and delete previous EX DATA submissions.
   - Pre-loaded with the exact sample data from the official document (`GX1722219`).

---

## 🚀 How to Run

1. Open a terminal or PowerShell in this directory:
   ```bash
   npm start
   ```
2. Open your web browser to:
   - **Local PC:** `http://localhost:5000`
   - **Mobile Phone / Wi-Fi Network:** `http://172.20.10.3:5000`
3. Click **"Load Sample"** to load test data if needed.
4. Click **"📥 Download PDF"** to get the official single-page A4 document with the scannable QR code.
5. Point any phone camera at the QR code to open the verification page!

