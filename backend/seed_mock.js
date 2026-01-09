const prisma = require('./src/utils/db');
const bcrypt = require('bcrypt');

async function main() {
    console.log('Seeding data...');

    const roles = ['ADMIN', 'GUARDIAN', 'STUDENT', 'VENDOR'];

    for (const r of roles) {
        const existing = await prisma.role.findUnique({ where: { name: r } });
        if (!existing) {
            await prisma.role.create({
                data: {
                    name: r,
                    description: `${r} Role`
                }
            });
            console.log(`Created role: ${r}`);
        }
    }

    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@college.edu' } });

    if (!existingAdmin) {
        const passwordHash = await bcrypt.hash('admin123', 10);
        try {
            // create method in mock handles UUID if ID missing
            await prisma.user.create({
                data: {
                    email: 'admin@college.edu',
                    passwordHash,
                    name: 'Super Admin',
                    roleId: adminRole.id,
                    isVerified: true
                }
            });
            console.log('Created Admin User: admin@college.edu');
        } catch (e) {
            console.error('Failed to create admin:', e);
        }
    }

    // Create test users with wallets
    const guardianRole = await prisma.role.findUnique({ where: { name: 'GUARDIAN' } });
    const studentRole = await prisma.role.findUnique({ where: { name: 'STUDENT' } });
    const vendorRole = await prisma.role.findUnique({ where: { name: 'VENDOR' } });

    const passwordHash = await bcrypt.hash('password', 10);

    // Create Guardian
    const existingGuardian = await prisma.user.findUnique({ where: { email: 'guardian@test.com' } });
    if (!existingGuardian) {
        const guardian = await prisma.user.create({
            data: {
                email: 'guardian@test.com',
                passwordHash,
                name: 'Test Guardian',
                roleId: guardianRole.id,
                isVerified: true
            }
        });
        await prisma.wallet.create({
            data: {
                userId: guardian.id,
                type: 'GUARDIAN',
                balance: 5000
            }
        });
        console.log('Created Guardian: guardian@test.com (password: password)');
    }

    // Create Student
    const existingStudent = await prisma.user.findUnique({ where: { email: 'student@test.com' } });
    if (!existingStudent) {
        const guardian = await prisma.user.findFirst({ where: { email: 'guardian@test.com' } });
        const student = await prisma.user.create({
            data: {
                email: 'student@test.com',
                passwordHash,
                name: 'Test Student',
                roleId: studentRole.id,
                guardianId: guardian.id,
                isVerified: true
            }
        });
        await prisma.wallet.create({
            data: {
                userId: student.id,
                type: 'STUDENT',
                balance: 500
            }
        });
        console.log('Created Student: student@test.com (password: password)');
    }

    // Create Vendor
    const existingVendor = await prisma.user.findUnique({ where: { email: 'vendor@test.com' } });
    if (!existingVendor) {
        const vendor = await prisma.user.create({
            data: {
                email: 'vendor@test.com',
                passwordHash,
                name: 'Test Vendor',
                roleId: vendorRole.id,
                isVerified: true
            }
        });
        await prisma.wallet.create({
            data: {
                userId: vendor.id,
                type: 'VENDOR',
                balance: 0
            }
        });
        await prisma.vendor.create({
            data: {
                userId: vendor.id,
                storeName: 'Campus Store',
                approved: true
            }
        });
        console.log('Created Vendor: vendor@test.com (password: password)');
    }

    // Create Task Checklists
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');
    const dbPath = path.resolve(__dirname, 'database.json');
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    if (!dbData.task_checklists || dbData.task_checklists.length === 0) {
        const checklists = [
            {
                id: crypto.randomUUID(),
                title: 'Complete Profile Setup',
                description: 'Add your personal information and verify your email',
                role: 'GUARDIAN',
                userId: null,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: crypto.randomUUID(),
                title: 'Add Initial Funds',
                description: 'Load money into your guardian wallet',
                role: 'GUARDIAN',
                userId: null,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: crypto.randomUUID(),
                title: 'Link Student Account',
                description: 'Connect your student to your guardian account',
                role: 'GUARDIAN',
                userId: null,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: crypto.randomUUID(),
                title: 'Set Spending Limits',
                description: 'Configure daily spending limits for your student',
                role: 'GUARDIAN',
                userId: null,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: crypto.randomUUID(),
                title: 'Verify Student ID',
                description: 'Upload and verify your student ID card',
                role: 'STUDENT',
                userId: null,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: crypto.randomUUID(),
                title: 'Explore Campus Vendors',
                description: 'Browse approved vendors on campus',
                role: 'STUDENT',
                userId: null,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: crypto.randomUUID(),
                title: 'Submit Business License',
                description: 'Upload your business license for verification',
                role: 'VENDOR',
                userId: null,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: crypto.randomUUID(),
                title: 'Generate QR Code',
                description: 'Create your vendor QR code for payments',
                role: 'VENDOR',
                userId: null,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: crypto.randomUUID(),
                title: 'Setup Bank Account',
                description: 'Link your bank account for settlements',
                role: 'VENDOR',
                userId: null,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        dbData.task_checklists = checklists;
        console.log('Created task checklists');
    }

    // Add comprehensive test data
    const guardian = await prisma.user.findFirst({ where: { email: 'guardian@test.com' } });
    const student = await prisma.user.findFirst({ where: { email: 'student@test.com' } });
    const vendor = await prisma.user.findFirst({ where: { email: 'vendor@test.com' } });
    const admin = await prisma.user.findFirst({ where: { email: 'admin@college.edu' } });

    if (guardian && student && vendor) {
        const guardianWallet = await prisma.wallet.findFirst({ where: { userId: guardian.id } });
        const studentWallet = await prisma.wallet.findFirst({ where: { userId: student.id } });
        const vendorWallet = await prisma.wallet.findFirst({ where: { userId: vendor.id } });

        // Add Wallet Rules for student
        const existingRule = await prisma.walletRule.findFirst({ where: { walletId: studentWallet.id } });
        if (!existingRule) {
            await prisma.walletRule.create({
                data: {
                    walletId: studentWallet.id,
                    dailyLimit: 200,
                    allowedVendors: JSON.stringify([vendor.id]),
                    active: true,
                    createdByUserId: guardian.id
                }
            });
            console.log('Created wallet rule for student');
        }

        // Add sample transactions
        const existingTransactions = await prisma.transaction.findMany({});
        if (existingTransactions.length === 0) {
            // Guardian deposits money
            await prisma.transaction.create({
                data: {
                    fromWalletId: null,
                    toWalletId: guardianWallet.id,
                    amount: 5000,
                    type: 'DEPOSIT',
                    status: 'COMPLETED',
                    description: 'Initial deposit',
                    initiatedByUserId: guardian.id,
                    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
                }
            });

            // Guardian transfers to student
            await prisma.transaction.create({
                data: {
                    fromWalletId: guardianWallet.id,
                    toWalletId: studentWallet.id,
                    amount: 500,
                    type: 'TRANSFER',
                    status: 'COMPLETED',
                    description: 'Weekly allowance',
                    initiatedByUserId: guardian.id,
                    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
                }
            });

            // Student pays vendor
            await prisma.transaction.create({
                data: {
                    fromWalletId: studentWallet.id,
                    toWalletId: vendorWallet.id,
                    amount: 150,
                    type: 'PAYMENT',
                    status: 'COMPLETED',
                    description: 'Lunch at Campus Store',
                    initiatedByUserId: student.id,
                    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
                }
            });

            // Another student payment
            await prisma.transaction.create({
                data: {
                    fromWalletId: studentWallet.id,
                    toWalletId: vendorWallet.id,
                    amount: 75,
                    type: 'PAYMENT',
                    status: 'COMPLETED',
                    description: 'Books and supplies',
                    initiatedByUserId: student.id,
                    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
                }
            });

            // Pending transaction
            await prisma.transaction.create({
                data: {
                    fromWalletId: studentWallet.id,
                    toWalletId: vendorWallet.id,
                    amount: 50,
                    type: 'PAYMENT',
                    status: 'PENDING',
                    description: 'Snacks',
                    initiatedByUserId: student.id
                }
            });

            console.log('Created sample transactions');
        }

        // Add money requests
        const existingRequests = await prisma.moneyRequest.findMany({});
        if (existingRequests.length === 0) {
            // Approved request
            await prisma.moneyRequest.create({
                data: {
                    studentId: student.id,
                    amount: 200,
                    reason: 'Need money for textbooks',
                    status: 'APPROVED',
                    reviewedByUserId: guardian.id,
                    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
                }
            });

            // Pending request
            await prisma.moneyRequest.create({
                data: {
                    studentId: student.id,
                    amount: 100,
                    reason: 'Extra money for weekend trip',
                    status: 'PENDING',
                    reviewedByUserId: null
                }
            });

            // Rejected request
            await prisma.moneyRequest.create({
                data: {
                    studentId: student.id,
                    amount: 500,
                    reason: 'Want to buy new gadget',
                    status: 'REJECTED',
                    reviewedByUserId: guardian.id,
                    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
                }
            });

            console.log('Created money requests');
        }

        // Add audit logs
        if (!dbData.audit_logs || dbData.audit_logs.length === 0) {
            dbData.audit_logs = [
                {
                    id: crypto.randomUUID(),
                    action: 'USER_LOGIN',
                    userId: admin.id,
                    details: 'Admin logged in',
                    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: crypto.randomUUID(),
                    action: 'USER_VERIFIED',
                    userId: admin.id,
                    details: `Verified user: ${guardian.email}`,
                    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: crypto.randomUUID(),
                    action: 'WALLET_RULE_CREATED',
                    userId: guardian.id,
                    details: `Created spending limit for student: ₹200/day`,
                    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: crypto.randomUUID(),
                    action: 'MONEY_TRANSFER',
                    userId: guardian.id,
                    details: `Transferred ₹500 to ${student.name}`,
                    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: crypto.randomUUID(),
                    action: 'PAYMENT_COMPLETED',
                    userId: student.id,
                    details: `Paid ₹150 to Campus Store`,
                    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: crypto.randomUUID(),
                    action: 'MONEY_REQUEST_APPROVED',
                    userId: guardian.id,
                    details: `Approved money request for ₹200`,
                    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: crypto.randomUUID(),
                    action: 'MONEY_REQUEST_REJECTED',
                    userId: guardian.id,
                    details: `Rejected money request for ₹500`,
                    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
                }
            ];
            console.log('Created audit logs');
        }

        fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
        console.log('✅ Database seeded successfully with comprehensive test data!');
    }
}

main();
