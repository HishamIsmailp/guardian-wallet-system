const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, '../../database.json');

// Initialize DB structure
const initialData = {
    users: [],
    roles: [],
    students: [],      // NEW: Students are separate from users (no login)
    wallets: [],
    transactions: [],
    wallet_rules: [],
    vendors: [],
    task_checklists: [],
    audit_logs: []
    // money_requests removed - students don't interact with system
};

// Load or Init
let dbData = initialData;
if (fs.existsSync(dbPath)) {
    try {
        const content = fs.readFileSync(dbPath, 'utf8');
        if (content.trim()) dbData = JSON.parse(content);
    } catch (e) {
        console.error('Failed to load DB, resetting', e);
    }
} else {
    saveDb();
}

function saveDb() {
    fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
}

// Helpers
function matchWhere(item, where) {
    if (!where) return true;
    for (const [key, val] of Object.entries(where)) {
        if (val === undefined) continue;
        // Handle operators if passed (simplified)
        if (typeof val === 'object' && val !== null) {
            if (val.in) {
                if (!val.in.includes(item[key])) return false;
            } else if (val.gte) { // Date or number
                if (new Date(item[key]) < new Date(val.gte)) return false;
                // Note: date comparison slightly loose
            }
        } else {
            if (item[key] !== val) return false;
        }
    }
    return true;
}

class Model {
    constructor(key) {
        this.key = key; // users, roles
    }

    get items() {
        return dbData[this.key];
    }

    findUnique({ where, include }) {
        const item = this.items.find(i => matchWhere(i, where));
        if (item && include) {
            return Promise.resolve(this.enrich(item, include));
        }
        return Promise.resolve(item || null);
    }

    findFirst({ where, include }) {
        const item = this.items.find(i => matchWhere(i, where));
        if (item && include) {
            return Promise.resolve(this.enrich(item, include));
        }
        return Promise.resolve(item || null);
    }

    findMany({ where, include, orderBy }) {
        let res = this.items.filter(i => matchWhere(i, where));

        // Sort
        if (orderBy) {
            const k = Object.keys(orderBy)[0];
            const dir = orderBy[k]; // asc, desc
            res.sort((a, b) => {
                if (a[k] < b[k]) return dir === 'asc' ? -1 : 1;
                if (a[k] > b[k]) return dir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        if (include) {
            res = res.map(i => this.enrich(i, include));
        }
        return Promise.resolve(res);
    }

    create({ data, include }) {
        const newItem = { ...data };
        if (!newItem.id) {
            newItem.id = crypto.randomUUID();
        }
        if (!newItem.createdAt) newItem.createdAt = new Date().toISOString();
        if (!newItem.updatedAt) newItem.updatedAt = new Date().toISOString();

        // Ensure boolean fields are actual booleans, not strings
        if ('isVerified' in newItem) newItem.isVerified = Boolean(newItem.isVerified);
        if ('approved' in newItem) newItem.approved = Boolean(newItem.approved);
        if ('active' in newItem) newItem.active = Boolean(newItem.active);

        // Ensure numeric fields are actual numbers, not strings
        if ('amount' in newItem) newItem.amount = parseFloat(newItem.amount);
        if ('balance' in newItem) newItem.balance = parseFloat(newItem.balance);
        if ('dailyLimit' in newItem && newItem.dailyLimit !== null) newItem.dailyLimit = parseFloat(newItem.dailyLimit);

        this.items.push(newItem);
        saveDb();

        if (include) return Promise.resolve(this.enrich(newItem, include));
        return Promise.resolve(newItem);
    }

    update({ where, data }) {
        const idx = this.items.findIndex(i => matchWhere(i, where));
        if (idx === -1) throw new Error('Record not found');

        const existing = this.items[idx];
        const updated = { ...existing, updatedAt: new Date().toISOString() };

        for (const [key, val] of Object.entries(data)) {
            if (typeof val === 'object' && val.increment) {
                updated[key] = (parseFloat(updated[key]) + parseFloat(val.increment));
            } else if (typeof val === 'object' && val.decrement) {
                updated[key] = (parseFloat(updated[key]) - parseFloat(val.decrement));
            } else {
                // Ensure boolean fields are actual booleans
                if (key === 'isVerified' || key === 'approved' || key === 'active') {
                    updated[key] = Boolean(val);
                }
                // Ensure numeric fields are actual numbers
                else if (key === 'amount' || key === 'balance' || key === 'dailyLimit') {
                    updated[key] = val !== null ? parseFloat(val) : null;
                }
                else {
                    updated[key] = val;
                }
            }
        }

        this.items[idx] = updated;
        saveDb();
        return Promise.resolve(updated);
    }

    count() {
        return Promise.resolve(this.items.length);
    }

    enrich(item, include) {
        // Basic manual relations
        const res = { ...item };
        if (include.role && res.roleId) {
            res.role = dbData['roles'].find(r => r.id === res.roleId);
        }
        if (include.student && res.studentId) {
            res.student = dbData['students'].find(s => s.id === res.studentId);
        }
        if (include.guardian && res.guardianId) {
            res.guardian = dbData['users'].find(u => u.id === res.guardianId);
        }
        if (include.wallet && res.id) {
            // For student, find wallet by studentId
            res.wallet = dbData['wallets'].find(w => w.studentId === res.id);
        }
        return res; // Return directly, not wrapped in Promise
    }
}

const prisma = {
    user: new Model('users'),
    role: new Model('roles'),
    student: new Model('students'),  // NEW: Student model
    wallet: new Model('wallets'),
    transaction: new Model('transactions'),
    walletRule: new Model('wallet_rules'),
    vendor: new Model('vendors'),

    $transaction: async (items) => {
        if (Array.isArray(items)) return Promise.all(items);
        if (typeof items === 'function') return items(prisma);
    },

    $disconnect: () => Promise.resolve()
};

module.exports = prisma;
