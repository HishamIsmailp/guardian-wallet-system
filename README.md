# Guardian Wallet System

Digital wallet management system for college environments. Guardians (parents) control student spending, vendors process transactions using student ID and PIN.

## Key Concept

**Students have limited app access for biometric payments.**
- Guardians create student accounts with a unique Student ID and PIN
- Students can login to generate biometric-authenticated payment codes (OTP)
- Students can also use their ID + PIN directly at vendor locations
- Vendors can scan QR codes or enter details manually
- This ensures controlled spending with optional biometric convenience

## Project Structure

```
guardian-wallet-system/
├── backend/          # Node.js + Express API (Port 3000)
├── admin-panel/      # React + Vite Admin Dashboard (Port 5173)
├── mobile-app/       # React Native (Expo) Mobile App (Port 8081)
└── package.json      # Monorepo scripts
```

## Features

- **Razorpay Integration:** Guardians can add money to wallet using UPI, cards, net banking
- **Guardian Controls:** Parents manage student wallets, set spending limits, view transaction history
- **Biometric Payments:** Students can use fingerprint/Face ID to generate secure OTP codes
- **QR Code Scanning:** Vendors can scan student QR codes for quick identification
- **Item-Based Billing:** Vendors can create menus and bill students for specific items
- **Dual Authentication:** Support for both PIN and OTP (biometric) authentication
- **Real-time Balance:** Live wallet balance tracking for all users
- **Settlement System:** Vendors request withdrawals, admins approve settlements
- **Audit Logging:** Complete transaction and action audit trail

## Tech Stack

| Service | Technologies |
|---------|-------------|
| Backend | Node.js, Express, Prisma ORM, JWT, bcrypt |
| Admin Panel | React, Vite, Tailwind CSS, Axios |
| Mobile App | React Native, Expo, React Navigation, expo-camera, expo-local-authentication |
| Database | SQLite (dev) / PostgreSQL (prod) |

## Quick Start

### Prerequisites
- Node.js v18+
- npm or yarn

### Installation

```bash
# Install all dependencies
npm run install:all

# Initialize database
cd backend && node init_db.js

# Seed the database with test data
npm run db:seed
```

### Running the Application

**Recommended: Run in two terminals**

```bash
# Terminal 1: Backend + Admin Panel
npm start

# Terminal 2: Mobile App
npm run start:mobile
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Run backend + admin panel |
| `npm run start:backend` | Backend only (port 3000) |
| `npm run start:admin` | Admin panel only |
| `npm run start:mobile` | Mobile app with Expo |
| `npm run db:seed` | Seed database with test data |
| `npm run db:reset` | Reset and reseed database |

## Transaction Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                      GUARDIAN WALLET SYSTEM                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  GUARDIAN (App)         STUDENT (App)              VENDOR (App)       │
│  ┌──────────────┐      ┌─────────────────┐       ┌────────────────┐  │
│  │ 1. Add Money │      │ Option A: PIN   │       │ 3. Scan QR or  │  │
│  │    to Wallet │      │ (at vendor)     │       │    Enter ID    │  │
│  └──────┬───────┘      ├─────────────────┤       ├────────────────┤  │
│         │              │ Option B: OTP   │       │ 4. Select Menu │  │
│         ▼              │ (biometric app) │       │    Items       │  │
│  ┌──────────────┐      │ - Fingerprint   │       └───────┬────────┘  │
│  │ 2. Create    │      │ - Face ID       │               │           │
│  │    Student   │      │ - Show QR/Code  │               ▼           │
│  │    (ID+PIN)  │      └────────┬────────┘       ┌────────────────┐  │
│  └──────┬───────┘               │                │ 5. Validate    │  │
│         │                       │                │    PIN or OTP  │  │
│         ▼                       │                └───────┬────────┘  │
│  ┌──────────────┐               │                        │           │
│  │ Transfer $   │               │                        ▼           │
│  │ to Student   │───────────────┴───────────────►┌────────────────┐  │
│  │ Wallet       │                                │ 6. Itemized    │  │
│  └──────────────┘                                │    Payment     │  │
│                                                  └────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

## User Roles

| Role | Login | Capabilities |
|------|-------|-------------|
| Admin | Yes | Manage users, approve vendors, view reports, audit logs |
| Guardian | Yes | Create students, add funds, transfer to students, set spending limits, view QR codes |
| Student | Yes (Limited) | Login with ID+PIN, register device, generate OTP via biometrics |
| Vendor | Yes | Process payments (PIN/OTP), manage menu items, scan QR codes, request withdrawals |

## Database Schema

| Model | Description |
|-------|-------------|
| User | Admins, Guardians, Vendors (NOT students) |
| Student | Student profiles with PIN (separate from users) |
| Role | User roles (ADMIN, GUARDIAN, VENDOR) |
| Wallet | User/Student wallets with balance tracking |
| Transaction | Money transfers (Deposit, Transfer, Payment, Withdrawal) |
| TransactionItem | Line items for itemized billing (what was purchased) |
| WalletRule | Spending limits and vendor restrictions |
| Vendor | Vendor profiles and store information |
| MenuItem | Vendor menu items (name, price, category, availability) |
| TaskChecklist | Role-based task management |
| AuditLog | System audit trail |

## API Endpoints

**Base URL:** `http://localhost:3000/api`

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register (Guardian/Vendor only) |
| POST | `/auth/login` | Login and get tokens |
| POST | `/auth/refresh` | Refresh access token |

### Student Management (Guardian)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/student` | Create student with PIN |
| GET | `/student` | List my students |
| POST | `/student/transfer` | Transfer money to student |
| PATCH | `/student/:id/pin` | Update student PIN |
| PATCH | `/student/:id/status` | Block/unblock student |
| GET | `/student/:id/transactions` | Student transaction history |

### Student App (Biometric Auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/student/login` | Student login with ID + PIN |
| POST | `/student/device/register` | Register device for biometrics |
| GET | `/student/device/verify` | Check device registration |
| POST | `/student/generate-otp` | Generate OTP (requires biometric) |

### Vendor Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/vendor/transaction` | Process payment (ID + PIN/OTP + Amount/Items) |
| GET | `/vendor/transactions` | Vendor's transaction history |
| POST | `/vendor/withdrawal` | Request withdrawal |
| GET | `/vendor/qr-code` | Generate vendor QR code |

### Menu Management (Vendor)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/menu` | Get vendor's menu items |
| POST | `/menu` | Add new menu item |
| PUT | `/menu/:id` | Update menu item |
| DELETE | `/menu/:id` | Delete menu item |
| PATCH | `/menu/:id/toggle` | Toggle item availability |

### Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wallet/balance` | Get wallet balance |
| GET | `/wallet/transactions` | Transaction history |
| POST | `/wallet/rules` | Set spending rules |

### Payment (Razorpay)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/payment/key` | Get Razorpay public key |
| POST | `/payment/create-order` | Create Razorpay order |
| POST | `/payment/verify` | Verify payment and update wallet |
| GET | `/payment/history` | Get payment history |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard/stats` | Dashboard statistics |
| GET | `/student/all` | List all students |
| GET | `/admin/audit-logs` | Audit logs |
| PATCH | `/vendor/:id/approve` | Approve vendor |

## Test Credentials

### Users (Can Login)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@college.edu | admin123 |
| Guardian | guardian@test.com | password |
| Vendor | vendor@test.com | password |
| Vendor | cafeteria@test.com | password |

### Students (For Vendor Transactions)

| Name | Student ID | PIN |
|------|------------|-----|
| Test Student | STU001 | 1234 |
| Jane Doe | STU002 | 5678 |

## How to Test

1. **As Guardian (Mobile App):**
   - Login with `guardian@test.com` / `password`
   - Create a new student (or use existing STU001)
   - Add money to your wallet
   - Transfer money to student
   - Tap "Show QR" on student card to display their QR code

2. **As Student (Mobile App):**
   - Tap "Student Login" on login screen
   - Enter Student ID: `STU001` and PIN: `1234`
   - Register device for biometric payments
   - Generate OTP using fingerprint/Face ID
   - Show code or QR to vendor

3. **As Vendor (Mobile App):**
   - Login with `vendor@test.com` / `password`
   - **Menu Tab:** Add cafeteria items (e.g., "Tea ₹15", "Samosa ₹20")
   - **Payment Tab:**
     - Scan student QR or enter ID manually
     - Select PIN or OTP authentication
     - Add items from menu OR enter amount manually
     - Process payment
   - **History Tab:** View transaction history with itemized details

4. **As Admin (Web Panel):**
   - Login at `http://localhost:5173` with `admin@college.edu` / `admin123`
   - View all users, students, transactions
   - Approve/reject vendors
   - Approve settlement requests

## Environment Variables

Create `backend/.env`:

```env
# Server
PORT=3000

# Database
DATABASE_URL="file:./dev.db"

# JWT Secrets (change in production!)
JWT_SECRET="your-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-change-in-production"

# Razorpay (Get keys from https://dashboard.razorpay.com/app/keys)
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxxxxxx"
```

### Razorpay Setup
1. Create account at [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to Settings → API Keys
3. Generate Test API keys
4. Add keys to `.env` file
5. For production, use Live API keys

## Database Commands

```bash
# Initialize database
cd backend && node init_db.js

# Seed with test data
npm run db:seed

# Reset database
npm run db:reset

# View database (Prisma Studio)

## Backend database setup (Postgres)

The backend now uses PostgreSQL (Neon) instead of local SQLite. Follow these steps:

1. Ensure `DATABASE_URL` is set in `backend/.env` (e.g. Neon connection string).
2. `cd backend` and install dependencies (`npm install`).
3. Push the Prisma schema to the database:
   ```bash
   npx prisma db push        # or `npm run db:push` (you can add this script)
   ```
4. Seed the database:
   ```bash
   npm run db:seed           # defined in backend/package.json
   ```
   or run the workspace-level script from root: `npm run db:seed`.

Once seeded, you can open Prisma Studio:
```bash
npm run db:studio
```

npm run db:studio
```

## Project Ports

| Service | Port |
|---------|------|
| Backend API | 3000 |
| Admin Panel | 5173 |
| Mobile (Expo) | 8081 |

## Security Features

- PIN hashed with bcrypt (10 rounds)
- JWT authentication (7-day access, 30-day refresh)
- Rate limiting on transactions
- Failed PIN attempts logged
- Student accounts can be blocked by guardian

## License

MIT
