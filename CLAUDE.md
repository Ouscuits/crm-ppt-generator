# CRM PPT Generator & Sales Dashboard

SML Group multi-user tool for CRM reporting and sales analytics.

## Live URL
https://ouscuits.github.io/crm-ppt-generator/

## Features

### 1. Authentication & Multi-Account
- Firebase Auth (email/password)
- Login → Account Selector → Main App flow
- Users assigned to specific accounts by admin
- Roles: admin, user

### 2. CRM Report
- Upload CRM Excel file (visit log from sales team)
- View data cards grouped by Country or Brand
- Filter by month, year
- Generate PowerPoint reports per country/brand
- Slides: Cover, Executive Summary, Competitor Landscape, Brand Vendors, Priority Actions, Strategic Analysis

### 3. Pending Actions
- Tracks "Next Action" + "Action Date" from CRM Excel uploads
- Urgency levels: Overdue (red), Due Soon within 7 days (amber), Upcoming (green)
- Detects if vendor+country has had a follow-up visit after the action was recorded
- Filters by salesperson, country, urgency
- KPI cards: Overdue, Due Soon, Upcoming, No Follow-up counts
- Email reminder: generates mailto or copy-to-clipboard with full pending actions report
- Data persisted in Firestore (`crmData` subcollection) — loads from Firestore or in-memory fallback

### 4. Sales Dashboard (Power BI data)
- **Sales Overview**: by country, product type, RFID vs other products, monthly trend, top 15 customers
- **Brand Analysis**: by brand, product type by brand, RFID by brand, brand mix, top customers
- **Zara Breakdown**: ZARA main + sub-brands (Maag, Ecru, Vilet, Dub) with product/country/trend charts
- **Period Comparison**: quarterly sales, year-over-year, quarterly by country/brand
- Filters: country, brand, company (multi-select), year, month (multi-select)
- KPIs: Sales HKD, Sales USD, Quantity, Records, Vendors, Customers

### 4. Admin Panel (admin role only)
- **Users Management**: create, edit, delete users; assign accounts; reset passwords
- **Accounts Management**: create, edit, delete accounts (e.g., INDITEX)
- **Data Management**: upload Power BI Excel per account, clear/export data, migrate historical JSON
- User creation uses temp Firebase app instance to preserve admin session

## Data Architecture

### Backend: Firebase
- **Firebase Auth**: email/password authentication
- **Firestore**: all data stored in cloud

### Firestore Structure
```
/users/{uid} — email, name, role, accounts[], createdAt
/accounts/{accountId} — name, responsible, responsibleEmail, users[], createdAt
/accounts/{accountId}/salesData/{year_month} — year, month, records[]
/accounts/{accountId}/crmData/{uploadId} — uploadedBy, uploadedAt, records[]
```

### Data Sources
- **CRM Excel**: columns include Date, Salesperson, Site, Vendor, Brand, Status, Volume, Notes, etc.
- **Power BI Excel**: column O (`DB program Name SP.Program Name SP`) for brand, column K (`DB Country name.Country name SP`) for country, column I (`Customer Info[Customer Name]`) for customer
- Data split into ZARA file + ITX file (other brands) per year
- Sales data chunked by year-month in Firestore (avoids 1MB doc limit)

## File Structure
```
crm-ppt-generator/
├── index.html              — Main app (HTML + CSS + CRM core logic ~180 lines JS)
├── js/
│   ├── firebase-config.js  — Firebase project configuration
│   ├── utils.js            — Shared utilities (escHtml, showStatus, normStatus, fmtDate, etc.)
│   ├── firestore.js        — Firestore CRUD operations
│   ├── dashboard.js        — Sales Dashboard (4 tabs, 18+ charts, filters, KPIs)
│   ├── pptx.js             — PPTX report generation (6 slides per country/brand)
│   ├── pending-actions.js  — Pending Actions (urgency tracking, email reminders)
│   └── auth.js             — Authentication, navigation, admin panel UI (loads last)
├── historical-data.json    — Legacy backup (2024-2025 data, migrated to Firestore)
├── sml-animation.mp4       — Animated SML logo
├── sml-primary.svg         — SML primary logo
├── sml-logo.jpg            — SML logo image
└── .nojekyll               — GitHub Pages config
```

### Script load order
Firebase SDK → firebase-config → firestore → utils → dashboard → pptx → pending-actions → auth

## Tech Stack
- Vanilla HTML/CSS/JavaScript (no frameworks)
- Firebase 9.23.0 (CDN compat mode) — Auth + Firestore
- Chart.js 4.4.1 (CDN) — dashboard charts
- XLSX 0.18.5 (CDN) — Excel file parsing
- PptxGenJS 3.12.0 (CDN) — PowerPoint generation
- Fonts: DM Sans, Space Mono (Google Fonts)
- GitHub Pages for hosting

## Firebase Setup
1. Create project in Firebase Console (e.g., `sml-crm-tool`)
2. Enable Authentication > Email/Password
3. Create Firestore Database
4. Copy config to `js/firebase-config.js`
5. Set Firestore security rules (see plan)
6. Create first admin user manually in Firebase Console + Firestore

## Yearly Data Rotation
- At end of each year: data is already in Firestore per account
- Admin can clear specific year's data and re-upload from Data Management tab
- Current year: 2026
