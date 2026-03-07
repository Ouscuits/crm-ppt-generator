# CRM PPT Generator & Sales Dashboard

SML Group internal tool for CRM reporting and sales analytics.

## Live URL
https://ouscuits.github.io/crm-ppt-generator/

## Features

### 1. CRM Report
- Upload CRM Excel file (visit log from sales team)
- View data cards grouped by Country or Brand
- Filter by month, year
- Generate PowerPoint reports per country/brand
- Slides: Cover, Executive Summary, Competitor Landscape, Brand Vendors, Priority Actions, Strategic Analysis

### 2. Sales Dashboard (Power BI data)
- **Sales Overview**: by country, product type, RFID vs other products, monthly trend, top 15 customers
- **Brand Analysis**: by brand, product type by brand, RFID by brand, brand mix, top customers
- **Zara Breakdown**: ZARA main + sub-brands (Maag, Ecru, Vilet, Dub) with product/country/trend charts
- **Period Comparison**: quarterly sales, year-over-year, quarterly by country/brand
- Filters: country, brand, company (multi-select), year, month (multi-select)
- KPIs: Sales HKD, Sales USD, Quantity, Records, Vendors, Customers

### 3. Admin Panel
- Access: click "Admin" link at bottom-right corner
- Password protected
- Upload current year Power BI data (supports multiple files at once)
- Data stored in IndexedDB (persists across sessions)
- Clear current year data / Export all data as JSON

## Data Architecture
- `historical-data.json` — 2024-2025 aggregated sales data (served from repo)
- **IndexedDB** (`sml_dashboard`) — current year data uploaded by admin
- Dashboard combines both sources automatically

### Data Sources
- **CRM Excel**: columns include Date, Salesperson, Site, Vendor, Brand, Status, Volume, Notes, etc.
- **Power BI Excel**: column O (`DB program Name SP.Program Name SP`) for brand, column K (`DB Country name.Country name SP`) for country, column I (`Customer Info[Customer Name]`) for customer
- Data split into ZARA file + ITX file (other brands) per year

## Structure
- `index.html` — Main application (single-file HTML app with embedded CSS/JS)
- `historical-data.json` — 2024-2025 sales data (aggregated)
- `sml-animation.mp4` — Animated SML logo
- `sml-primary.svg` — SML primary logo
- `sml-logo.jpg` — SML logo image
- `.nojekyll` — Disables Jekyll processing on GitHub Pages

## Tech Stack
- Vanilla HTML/CSS/JavaScript (no frameworks)
- Chart.js 4.4.1 (CDN) — dashboard charts
- XLSX 0.18.5 (CDN) — Excel file parsing
- PptxGenJS 3.12.0 (CDN) — PowerPoint generation
- Fonts: DM Sans, Space Mono (Google Fonts)
- IndexedDB for client-side data storage
- GitHub Pages for hosting

## Yearly Data Rotation
- At end of each year: add full year data to historical-data.json, clear current year from IndexedDB
- Current year: 2026. When 2026 ends, add to historical, current becomes 2027
