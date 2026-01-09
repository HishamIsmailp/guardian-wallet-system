# Guardian Wallet System

Digital wallet management system for college environments. Parents can manage student spending with administrative oversight.

## Project Structure

```
guardian-wallet-system/
├── backend/          # Node.js + Express API (Port 3000)
├── admin-panel/      # React + Vite Admin Dashboard
├── mobile-app/       # React Native (Expo) Mobile App
└── package.json      # Monorepo scripts
```

## Tech Stack

| Service | Technologies |
|---------|-------------|
| Backend | Node.js, Express, Prisma ORM, JWT |
| Admin Panel | React, Vite, Tailwind CSS, Axios |
| Mobile App | React Native, Expo, React Navigation |
| Database | SQLite (dev) / PostgreSQL (prod) |

## Quick Start

### Prerequisites
- Node.js v18+
- npm or yarn

### Installation

```bash
# Install all dependencies
npm run install:all

# Seed the database with test data
npm run db:seed
```

### Running the Application

**Recommended: Run in two terminals**

```bash
# Terminal 1: Backend + Admin Panel
npm start

# Terminal 2: Mobile App (separate terminal required for QR scanner)
npm run start:mobile
```

> **Note:** Mobile app must run in a separate terminal for Expo's QR scanner to work properly.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Run backend + admin panel |
| `npm run start:backend` | Backend only (port 3000) |
| `npm run start:admin` | Admin panel only |
| `npm run start:mobile` | Mobile app with QR scanner |
| `npm run start:mobile:tunnel` | Mobile app with tunnel URL |
| `npm run start:mobile:android` | Launch on Android |
| `npm run start:mobile:ios` | Launch on iOS |
| `npm run db:seed` | Seed database with test data |
| `npm run db:reset` | Reset and reseed database |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |

## Database Configuration

### Development (SQLite)

Default configuration uses SQLite for easy local development.

**Location:** `backend/prisma/dev.db`

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

### Production (PostgreSQL)

For production, update `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Environment variable format:**
```
DATABASE_URL="postgresql://username:password@host:5432/guardian_wallet_db?schema=public"
```

### Database Schema

| Model | Description |
|-------|-------------|
| User | All users with role-based access (Admin, Guardian, Student, Vendor) |
| Role | User roles with permissions |
| Wallet | User wallets with balance tracking |
| Transaction | Money transfers (Deposit, Transfer, Payment, Withdrawal) |
| MoneyRequest | Student requests for money from guardians |
| WalletRule | Spending limits and vendor restrictions |
| Vendor | Vendor profiles and store information |
| TaskChecklist | Role-based task management |
| AuditLog | System audit trail |

### Database Commands

```bash
# View database in browser
npm run db:studio

# Reset database and reseed
npm run db:reset

# Generate Prisma client after schema changes
cd backend && npx prisma generate

# Run migrations
cd backend && npx prisma migrate dev
```

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
```

## API Endpoints

**Base URL:** `http://localhost:3000/api`

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login and get tokens |
| POST | `/auth/refresh` | Refresh access token |

### Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wallet/balance` | Get wallet balance |
| POST | `/wallet/add-money` | Add money (Guardian) |
| POST | `/wallet/transfer` | Transfer to student |
| POST | `/wallet/pay` | Pay vendor (Student) |
| GET | `/wallet/transactions` | Transaction history |

### Money Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/request/create` | Create request (Student) |
| POST | `/request/:id/approve` | Approve request (Guardian) |
| POST | `/request/:id/reject` | Reject request (Guardian) |
| GET | `/request/list` | List all requests |

### Vendors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vendor/qr-code` | Generate payment QR code |
| POST | `/vendor/withdrawal` | Request withdrawal |
| GET | `/vendor/transactions` | Vendor transactions |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard/stats` | Dashboard statistics |
| GET | `/admin/users` | List all users |
| GET | `/admin/audit-logs` | Audit logs |
| POST | `/admin/approve-vendor/:id` | Approve vendor |

## User Roles

| Role | Capabilities |
|------|-------------|
| Admin | Manage users, approve vendors, view reports, audit logs |
| Guardian | Add funds, transfer to students, set spending limits |
| Student | Request money, pay vendors, view balance |
| Vendor | Accept payments, generate QR codes, request withdrawals |

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@college.edu | admin123 |
| Guardian | guardian@test.com | password |
| Student | student@test.com | password |
| Vendor | vendor@test.com | password |

## Project Ports

| Service | Port |
|---------|------|
| Backend API | 3000 |
| Admin Panel | 5173 |
| Mobile (Expo) | 8081 |

## License

MIT
