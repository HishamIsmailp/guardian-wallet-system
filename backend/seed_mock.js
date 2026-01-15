const prisma = require('./src/utils/db');
const bcrypt = require('bcrypt');

async function main() {
    console.log('Seeding data for new flow (Students as separate entities)...');

    // Only create ADMIN, GUARDIAN, VENDOR roles (STUDENT removed - not a user)
    const roles = ['ADMIN', 'GUARDIAN', 'VENDOR'];

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
            await prisma.user.create({
                data: {
                    email: 'admin@college.edu',
                    passwordHash,
                    name: 'Super Admin',
                    roleId: adminRole.id,
                    isVerified: true
                }
            });
            console.log('Created Admin User: admin@college.edu (password: admin123)');
        } catch (e) {
            console.error('Failed to create admin:', e);
        }
    }

    const guardianRole = await prisma.role.findUnique({ where: { name: 'GUARDIAN' } });
    const vendorRole = await prisma.role.findUnique({ where: { name: 'VENDOR' } });
    const passwordHash = await bcrypt.hash('password', 10);

    // Create Guardian
    const existingGuardian = await prisma.user.findUnique({ where: { email: 'guardian@test.com' } });
    let guardian;
    if (!existingGuardian) {
        guardian = await prisma.user.create({
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
    } else {
        guardian = existingGuardian;
    }

    // Create Student (NEW: As separate entity, not a user)
    const existingStudent = await prisma.student.findUnique({ where: { studentId: 'STU001' } });
    let student;
    if (!existingStudent) {
        const pinHash = await bcrypt.hash('1234', 10); // PIN: 1234
        student = await prisma.student.create({
            data: {
                name: 'Test Student',
                studentId: 'STU001',
                pinHash,
                guardianId: guardian.id,
                status: 'ACTIVE'
            }
        });
        await prisma.wallet.create({
            data: {
                studentId: student.id,
                type: 'STUDENT',
                balance: 500
            }
        });
        console.log('Created Student: STU001 (PIN: 1234) - Linked to guardian@test.com');
    } else {
        student = existingStudent;
    }

    // Create another student for testing
    const existingStudent2 = await prisma.student.findUnique({ where: { studentId: 'STU002' } });
    if (!existingStudent2) {
        const pinHash = await bcrypt.hash('5678', 10); // PIN: 5678
        const student2 = await prisma.student.create({
            data: {
                name: 'Jane Doe',
                studentId: 'STU002',
                pinHash,
                guardianId: guardian.id,
                status: 'ACTIVE'
            }
        });
        await prisma.wallet.create({
            data: {
                studentId: student2.id,
                type: 'STUDENT',
                balance: 300
            }
        });
        console.log('Created Student: STU002 (PIN: 5678) - Linked to guardian@test.com');
    }

    // Create Vendor
    const existingVendor = await prisma.user.findUnique({ where: { email: 'vendor@test.com' } });
    let vendor;
    if (!existingVendor) {
        vendor = await prisma.user.create({
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
        console.log('Created Vendor: vendor@test.com (password: password) - Store: Campus Store');
    } else {
        vendor = existingVendor;
    }

    // Create another vendor
    const existingVendor2 = await prisma.user.findUnique({ where: { email: 'cafeteria@test.com' } });
    if (!existingVendor2) {
        const vendor2 = await prisma.user.create({
            data: {
                email: 'cafeteria@test.com',
                passwordHash,
                name: 'Cafeteria Owner',
                roleId: vendorRole.id,
                isVerified: true
            }
        });
        await prisma.wallet.create({
            data: {
                userId: vendor2.id,
                type: 'VENDOR',
                balance: 0
            }
        });
        await prisma.vendor.create({
            data: {
                userId: vendor2.id,
                storeName: 'Campus Cafeteria',
                approved: true
            }
        });
        console.log('Created Vendor: cafeteria@test.com (password: password) - Store: Campus Cafeteria');
    }

    // Create Task Checklists
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');
    const dbPath = path.resolve(__dirname, 'database.json');
    let dbData;
    try {
        dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        dbData = { task_checklists: [], audit_logs: [] };
    }

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
                title: 'Create Student Account',
                description: 'Add your student with their college ID and set a PIN',
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
                title: 'Learn Transaction Process',
                description: 'Understand how to process student payments using ID and PIN',
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

    // Ensure students array exists in dbData
    if (!dbData.students) {
        dbData.students = [];
    }

    // Get fresh references
    const guardianFresh = await prisma.user.findFirst({ where: { email: 'guardian@test.com' } });
    const vendorFresh = await prisma.user.findFirst({ where: { email: 'vendor@test.com' } });
    const adminFresh = await prisma.user.findFirst({ where: { email: 'admin@college.edu' } });
    const studentFresh = await prisma.student.findFirst({ where: { studentId: 'STU001' } });

    if (guardianFresh && vendorFresh && studentFresh) {
        const guardianWallet = await prisma.wallet.findFirst({ where: { userId: guardianFresh.id } });
        const studentWallet = await prisma.wallet.findFirst({ where: { studentId: studentFresh.id } });
        const vendorWallet = await prisma.wallet.findFirst({ where: { userId: vendorFresh.id } });

        // Add Wallet Rules for student
        if (studentWallet) {
            const existingRule = await prisma.walletRule.findFirst({ where: { walletId: studentWallet.id } });
            if (!existingRule) {
                await prisma.walletRule.create({
                    data: {
                        walletId: studentWallet.id,
                        dailyLimit: 200,
                        allowedVendors: JSON.stringify([vendorFresh.id]),
                        active: true,
                        createdByUserId: guardianFresh.id
                    }
                });
                console.log('Created wallet rule for student (Daily limit: ₹200)');
            }
        }

        // Add sample transactions
        const existingTransactions = await prisma.transaction.findMany({});
        if (existingTransactions.length === 0 && guardianWallet && studentWallet && vendorWallet) {
            // Guardian deposits money
            await prisma.transaction.create({
                data: {
                    fromWalletId: null,
                    toWalletId: guardianWallet.id,
                    amount: 5000,
                    type: 'DEPOSIT',
                    status: 'COMPLETED',
                    description: 'Initial deposit',
                    initiatedByUserId: guardianFresh.id,
                    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
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
                    initiatedByUserId: guardianFresh.id,
                    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
                }
            });

            // Vendor processes payment (new flow: vendor initiates)
            await prisma.transaction.create({
                data: {
                    fromWalletId: studentWallet.id,
                    toWalletId: vendorWallet.id,
                    amount: 150,
                    type: 'PAYMENT',
                    status: 'COMPLETED',
                    description: 'Lunch at Campus Store',
                    initiatedByUserId: vendorFresh.id,  // Vendor initiates!
                    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
                }
            });

            // Another payment
            await prisma.transaction.create({
                data: {
                    fromWalletId: studentWallet.id,
                    toWalletId: vendorWallet.id,
                    amount: 75,
                    type: 'PAYMENT',
                    status: 'COMPLETED',
                    description: 'Books and supplies',
                    initiatedByUserId: vendorFresh.id,
                    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
                }
            });

            console.log('Created sample transactions');
        }

        // Add audit logs
        if (adminFresh && (!dbData.audit_logs || dbData.audit_logs.length === 0)) {
            dbData.audit_logs = [
                {
                    id: crypto.randomUUID(),
                    action: 'USER_LOGIN',
                    userId: adminFresh.id,
                    details: 'Admin logged in',
                    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: crypto.randomUUID(),
                    action: 'USER_VERIFIED',
                    userId: adminFresh.id,
                    details: `Verified user: ${guardianFresh.email}`,
                    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: crypto.randomUUID(),
                    action: 'STUDENT_CREATED',
                    userId: guardianFresh.id,
                    details: `Created student: ${studentFresh.name} (${studentFresh.studentId})`,
                    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: crypto.randomUUID(),
                    action: 'WALLET_RULE_CREATED',
                    userId: guardianFresh.id,
                    details: `Created spending limit for student: ₹200/day`,
                    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: crypto.randomUUID(),
                    action: 'MONEY_TRANSFER',
                    userId: guardianFresh.id,
                    details: `Transferred ₹500 to ${studentFresh.name}`,
                    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: crypto.randomUUID(),
                    action: 'VENDOR_PAYMENT',
                    userId: vendorFresh.id,
                    details: `Received ₹150 from ${studentFresh.name}`,
                    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
                }
            ];
            console.log('Created audit logs');
        }

        fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin:    admin@college.edu / admin123');
    console.log('Guardian: guardian@test.com / password');
    console.log('Vendor:   vendor@test.com / password');
    console.log('Vendor:   cafeteria@test.com / password');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Test Students (for vendor transactions):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Student 1: ID = STU001, PIN = 1234');
    console.log('Student 2: ID = STU002, PIN = 5678');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main();
