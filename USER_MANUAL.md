# SML CRM Tool — User Manual

## Overview

The SML CRM Tool is a multi-user, multi-account web application for CRM reporting and sales analytics. It is built for SML Group and hosted on GitHub Pages.

**Live URL:** https://ouscuits.github.io/crm-ppt-generator/

### Key Capabilities

1. **CRM Report Generator** — Upload CRM Excel files (visit logs from the sales team), view data cards grouped by Country or Brand, filter by month/year, and generate PowerPoint reports with slides for Executive Summary, Competitor Landscape, Brand Vendors, Priority Actions, and Strategic Analysis.

2. **Sales Dashboard** — Interactive dashboard with 4 tabs:
   - **Sales Overview**: sales by country, product type, RFID vs other products, monthly trend, top 15 customers
   - **Brand Analysis**: sales by brand, product type by brand, RFID by brand, brand mix percentage, top customers
   - **Zara Breakdown**: ZARA main program + sub-brands (Maag, Ecru, Vilet, Dub) with product/country/trend charts
   - **Period Comparison**: quarterly sales comparison, year-over-year trends, quarterly by country/brand
   - Filters available: country, brand, company (multi-select), year, month (multi-select)
   - KPIs displayed: Sales HKD, Sales USD, Quantity, Records, Vendors, Customers

3. **Admin Panel** — Full user, account, and data management (admin role only)

### Architecture

- **Authentication**: Firebase Auth with email/password
- **Data storage**: Google Firestore (cloud database)
- **Hosting**: GitHub Pages (static site)
- **Libraries**: Chart.js (charts), XLSX (Excel parsing), PptxGenJS (PowerPoint generation)

---

## User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access: manage users, manage accounts, upload/delete data, use CRM and Dashboard |
| **User** | Access assigned accounts only, use CRM and Dashboard, no admin panel |

---

## Application Flow

```
Login → Account Selector → Main App (CRM Report / Sales Dashboard)
                              ↓
                         Admin Panel (admin only)
                           ├── Users Management
                           ├── Accounts Management
                           └── Data Management
```

### Login
1. Open the application URL
2. Enter your email and password
3. Click "Sign In"
4. You will be taken to the Account Selector

### Account Selector
- Shows all accounts assigned to your user
- Click on an account card to enter the main application for that account
- Admin users see an "Admin Panel" button at the top
- Click "Sign Out" to log out

### Main App
- After selecting an account, you see the main app with two modes:
  - **CRM Report**: upload a CRM Excel file to generate PowerPoint reports
  - **Sales Dashboard**: view interactive charts and KPIs from Power BI sales data
- The top bar shows the current account name and navigation buttons:
  - "Switch Account" — go back to account selector
  - "Admin" — open admin panel (admin users only)
  - "Sign Out" — log out

---

## Admin Guide

### How to Access the Admin Panel
1. Log in with an admin account
2. From the Account Selector or Main App, click the **"Admin Panel"** or **"Admin"** button
3. The Admin Panel has 3 tabs: **Users**, **Accounts**, **Data Management**

---

### How to Create Users

1. Go to **Admin Panel** → **Users** tab
2. Click **"+ Add User"**
3. Fill in the form:
   - **Name**: full name of the user
   - **Email**: the email address the user will use to log in
   - **Password**: a temporary password (minimum 6 characters) — the user can change it later via password reset
   - **Role**: select "User" for regular users or "Admin" for administrators
   - **Assign Accounts**: check the boxes for the accounts this user should have access to
4. Click **"Create User"**
5. The user can now log in with the email and password you provided

#### Other User Actions
- **Edit User**: click "Edit" next to a user to change their name, role, or account assignments
- **Reset Password**: click "Reset Pwd" to send a password reset email to the user
- **Delete User**: click "Delete" to remove the user's access (requires confirmation)

---

### How to Create Accounts

An account represents a client or business unit (e.g., INDITEX). Each account has its own separate sales data and CRM data.

1. Go to **Admin Panel** → **Accounts** tab
2. Click **"+ Add Account"**
3. Fill in the form:
   - **Account Name**: the name of the account (e.g., "INDITEX", "H&M", "NIKE")
   - **Responsible Person**: the name of the person responsible for this account
   - **Responsible Email**: contact email for the responsible person
4. Click **"Create Account"**

#### Other Account Actions
- **Edit Account**: click "Edit" to change account details
- **Delete Account**: click "Delete" to permanently remove the account and ALL its data (requires confirmation)

---

### How to Assign Accounts to Users

There are two ways to assign accounts to users:

#### Method 1: When Creating a User
- During user creation, check the account boxes in the "Assign Accounts" section

#### Method 2: Editing an Existing User
1. Go to **Admin Panel** → **Users** tab
2. Click **"Edit"** next to the user
3. Check or uncheck account boxes in the "Assign Accounts" section
4. Click **"Save Changes"**

A user can be assigned to multiple accounts. They will see all assigned accounts in their Account Selector after login.

---

### How to Upload Sales Data

Sales data comes from Power BI Excel exports. Each account has its own data stored separately in the cloud.

1. Go to **Admin Panel** → **Data Management** tab
2. Select the target account from the **"Select Account"** dropdown
3. You will see the current data status (number of records per year)
4. Click the **"Upload Power BI Excel"** zone
5. Select one or multiple Excel files (.xlsx, .xls, or .csv)
   - Typically you upload 2 files per period: one ZARA file and one ITX file (other brands)
   - You can select multiple files at once
6. Wait for the upload to complete — you will see a confirmation message with the number of records uploaded
7. The data status will update automatically

#### Important Notes About Data Upload
- **Data is appended**: uploading new files adds records to existing data. It does not replace previous uploads.
- **Upload all related files together**: if you have ZARA + ITX files for the same period, upload them in the same batch.
- **Data is stored by year-month**: each year-month combination is stored as a separate chunk in Firestore.

#### Other Data Actions
- **Clear Data by Year**: removes all data for a specific year (or all data). You will be prompted to enter a year.
- **Export Data (JSON)**: downloads all sales data for the selected account as a JSON file
- **Migrate historical-data.json**: one-time operation to import legacy historical data (2024-2025) from the repository file into Firestore for the selected account

---

## Data Sources

### CRM Excel File
The CRM Excel file is a visit log from the sales team. It contains columns such as:
- Date, Salesperson, Site (Country), Vendor Name, Brand
- Competitors, Volume, Status (Active/Potential/Hold/No Go)
- Call Outs, Notes, Next Action, Action Date, Priority

This file is uploaded directly in the Main App → CRM Report mode.

### Power BI Excel Files
Power BI Excel files contain sales data exported from the company's BI system. Key columns:
- `[Month]`, `[Year]`, `[Day]` — time dimensions
- `[Invoice_QTY__Pcs_2]` — quantity in pieces
- `[Sales_Amount_in_HKD]` — sales in HKD
- `[SumAmount_USD]` — sales in USD
- `DB Country name.Country name SP` — country
- `DB program Name SP.Program Name SP` — brand
- `Customer Info[Customer Name]` — customer name
- `Sales Details[Company]` — company code
- `Sales Details[Product Type Eng Desc]` — product type
- `Sales Details[Vendor Name]` — vendor name
- `Program[Sub Program Name]` — sub-program (for Zara breakdown)

These files are uploaded via Admin Panel → Data Management.

---

## Yearly Data Rotation

At the end of each year:
1. The year's data is already stored in Firestore (uploaded throughout the year)
2. No manual migration needed — data persists in the cloud
3. Simply continue uploading the new year's Power BI files
4. If needed, use "Clear Data by Year" to remove old data

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Account not authorized" on login | Admin needs to create a user document in Firestore for this email |
| "No accounts assigned" after login | Admin needs to assign at least one account to the user (Admin Panel → Users → Edit) |
| "No data available" on Dashboard | Admin needs to upload Power BI Excel data for this account (Admin Panel → Data Management) |
| Dashboard not loading | Check browser console (F12) for errors. Ensure Firebase config is correct. |
| Forgot password | Ask admin to click "Reset Pwd" in Users tab, or use Firebase Console to reset |

---

## Technical Reference

### Firebase Project
- Project: `sml-crm-tool`
- Auth: Email/Password
- Database: Firestore

### Firestore Data Structure
```
/users/{uid}
  - email (string)
  - name (string)
  - role (string): "admin" or "user"
  - accounts (array of strings): account IDs
  - createdAt (timestamp)

/accounts/{accountId}
  - name (string)
  - responsible (string)
  - responsibleEmail (string)
  - users (array of strings): user UIDs
  - createdAt (timestamp)

/accounts/{accountId}/salesData/{year_month}
  - year (string)
  - month (string)
  - records (array): sales records
  - updatedAt (timestamp)

/accounts/{accountId}/crmData/{uploadId}
  - uploadedBy (string): UID
  - uploadedAt (timestamp)
  - records (array): CRM records
```

### File Structure
```
crm-ppt-generator/
├── index.html              — Main application
├── js/
│   ├── firebase-config.js  — Firebase credentials
│   ├── auth.js             — Authentication & admin panel
│   └── firestore.js        — Database operations
├── historical-data.json    — Legacy data backup
├── firestore.rules         — Security rules
├── sml-animation.mp4       — Animated logo
├── sml-primary.svg         — Static logo
└── sml-logo.jpg            — Logo image
```
