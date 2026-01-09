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
        fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
        console.log('Created task checklists');
    }
}

main();
