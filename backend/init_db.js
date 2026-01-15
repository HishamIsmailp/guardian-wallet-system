const Database = require('better-sqlite3');
const db = new Database('dev.db');

const schema = `
-- Roles table (STUDENT role removed - students are separate entities)
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users table (Admins, Guardians, Vendors only - NOT students)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  name TEXT,
  roleId TEXT NOT NULL,
  phone TEXT,
  isVerified BOOLEAN DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(roleId) REFERENCES roles(id)
);

-- Students table (NEW: Students are separate entities, NOT users)
-- Students don't login - they only have a PIN for vendor transactions
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  studentId TEXT UNIQUE NOT NULL,
  pinHash TEXT NOT NULL,
  guardianId TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(guardianId) REFERENCES users(id)
);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  userId TEXT UNIQUE NOT NULL,
  storeName TEXT NOT NULL,
  description TEXT,
  approved BOOLEAN DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(userId) REFERENCES users(id)
);

-- Wallets table (supports both User wallets and Student wallets)
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  balance REAL DEFAULT 0.0,
  currency TEXT DEFAULT 'INR',
  userId TEXT,
  studentId TEXT UNIQUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(userId) REFERENCES users(id),
  FOREIGN KEY(studentId) REFERENCES students(id)
);

-- Wallet rules table (spending limits)
CREATE TABLE IF NOT EXISTS wallet_rules (
  id TEXT PRIMARY KEY,
  walletId TEXT NOT NULL,
  dailyLimit REAL,
  allowedVendors TEXT,
  active BOOLEAN DEFAULT 1,
  createdByUserId TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(walletId) REFERENCES wallets(id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  fromWalletId TEXT,
  toWalletId TEXT,
  amount REAL NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  description TEXT,
  initiatedByUserId TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(fromWalletId) REFERENCES wallets(id),
  FOREIGN KEY(toWalletId) REFERENCES wallets(id),
  FOREIGN KEY(initiatedByUserId) REFERENCES users(id)
);

-- Task checklists table
CREATE TABLE IF NOT EXISTS task_checklists (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  role TEXT,
  status TEXT DEFAULT 'PENDING',
  userId TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(userId) REFERENCES users(id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  userId TEXT,
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(userId) REFERENCES users(id)
);
`;

db.exec(schema);
console.log('Database initialized successfully.');
console.log('Tables created: roles, users, students, vendors, wallets, wallet_rules, transactions, task_checklists, audit_logs');
db.close();
