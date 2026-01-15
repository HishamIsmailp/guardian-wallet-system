const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const prisma = require('../utils/db');
const { createAuditLog } = require('../utils/auditLog');

// In-memory OTP store (in production, use Redis)
const otpStore = new Map();

// Device store - persisted to file
const deviceStorePath = path.resolve(__dirname, '../../device_store.json');

const loadDeviceStore = () => {
    try {
        if (fs.existsSync(deviceStorePath)) {
            return JSON.parse(fs.readFileSync(deviceStorePath, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to load device store:', e);
    }
    return {};
};

const saveDeviceStore = (store) => {
    try {
        fs.writeFileSync(deviceStorePath, JSON.stringify(store, null, 2));
    } catch (e) {
        console.error('Failed to save device store:', e);
    }
};

let deviceStore = loadDeviceStore();

// Guardian creates a new student with PIN
exports.createStudent = async (req, res) => {
    try {
        const { name, studentId, pin } = req.body;
        const guardianId = req.user.id;

        if (req.user.role !== 'GUARDIAN') {
            return res.status(403).json({ error: 'Only Guardians can create students' });
        }

        // Validate PIN (4-6 digits)
        if (!pin || !/^\d{4,6}$/.test(pin)) {
            return res.status(400).json({ error: 'PIN must be 4-6 digits' });
        }

        // Check if studentId already exists
        const existing = await prisma.student.findUnique({ where: { studentId } });
        if (existing) {
            return res.status(400).json({ error: 'Student ID already exists' });
        }

        // Hash the PIN
        const pinHash = await bcrypt.hash(pin, 10);

        // Create student and wallet in transaction
        const result = await prisma.$transaction(async (tx) => {
            const student = await tx.student.create({
                data: {
                    name,
                    studentId,
                    pinHash,
                    guardianId,
                    status: 'ACTIVE'
                }
            });

            // Create wallet for student
            await tx.wallet.create({
                data: {
                    studentId: student.id,
                    type: 'STUDENT',
                    balance: 0.0
                }
            });

            return student;
        });

        await createAuditLog('STUDENT_CREATED', guardianId, 'STUDENT', result.id, { name, studentId }, req.ip);

        // Return student without PIN hash
        const { pinHash: _, ...safeStudent } = result;
        res.status(201).json({
            message: 'Student created successfully',
            student: safeStudent
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create student' });
    }
};

// Guardian lists their students
exports.getMyStudents = async (req, res) => {
    try {
        const guardianId = req.user.id;

        if (req.user.role !== 'GUARDIAN') {
            return res.status(403).json({ error: 'Only Guardians can view students' });
        }

        const students = await prisma.student.findMany({
            where: { guardianId },
            orderBy: { createdAt: 'desc' }
        });

        // Get wallet info for each student
        const studentsWithWallet = await Promise.all(students.map(async (s) => {
            const wallet = await prisma.wallet.findFirst({
                where: { studentId: s.id }
            });
            const { pinHash, ...safeStudent } = s;
            return {
                ...safeStudent,
                walletBalance: wallet ? parseFloat(wallet.balance) : 0
            };
        }));

        res.json(studentsWithWallet);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
};

// Guardian updates student PIN
exports.updateStudentPin = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { newPin } = req.body;
        const guardianId = req.user.id;

        if (req.user.role !== 'GUARDIAN') {
            return res.status(403).json({ error: 'Only Guardians can update PIN' });
        }

        // Validate PIN
        if (!newPin || !/^\d{4,6}$/.test(newPin)) {
            return res.status(400).json({ error: 'PIN must be 4-6 digits' });
        }

        // Find student
        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Verify ownership
        if (student.guardianId !== guardianId) {
            return res.status(403).json({ error: 'Not authorized for this student' });
        }

        const pinHash = await bcrypt.hash(newPin, 10);
        await prisma.student.update({
            where: { id: studentId },
            data: { pinHash }
        });

        await createAuditLog('STUDENT_PIN_UPDATED', guardianId, 'STUDENT', studentId, {}, req.ip);

        res.json({ message: 'PIN updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update PIN' });
    }
};

// Guardian transfers money to student wallet
exports.transferToStudent = async (req, res) => {
    try {
        const { studentId, amount, description } = req.body;
        const guardianId = req.user.id;

        if (req.user.role !== 'GUARDIAN') {
            return res.status(403).json({ error: 'Only Guardians can transfer to students' });
        }

        // Verify student belongs to guardian
        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (!student || student.guardianId !== guardianId) {
            return res.status(403).json({ error: 'Not authorized for this student' });
        }

        // Get wallets
        const guardianWallet = await prisma.wallet.findFirst({
            where: { userId: guardianId, type: 'GUARDIAN' }
        });
        const studentWallet = await prisma.wallet.findFirst({
            where: { studentId: studentId, type: 'STUDENT' }
        });

        if (!guardianWallet || !studentWallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        // Check balance
        if (parseFloat(guardianWallet.balance) < parseFloat(amount)) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Transfer
        const result = await prisma.$transaction([
            prisma.wallet.update({
                where: { id: guardianWallet.id },
                data: { balance: { decrement: amount } }
            }),
            prisma.wallet.update({
                where: { id: studentWallet.id },
                data: { balance: { increment: amount } }
            }),
            prisma.transaction.create({
                data: {
                    fromWalletId: guardianWallet.id,
                    toWalletId: studentWallet.id,
                    amount,
                    type: 'TRANSFER',
                    status: 'COMPLETED',
                    initiatedByUserId: guardianId,
                    description: description || `Transfer to ${student.name}`
                }
            })
        ]);

        await createAuditLog('MONEY_TRANSFERRED', guardianId, 'TRANSACTION', result[2].id, { amount, studentId }, req.ip);

        res.json({
            message: 'Transfer successful',
            transaction: result[2],
            newStudentBalance: result[1].balance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Transfer failed' });
    }
};

// Guardian blocks/unblocks student
exports.updateStudentStatus = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { status } = req.body; // ACTIVE or BLOCKED
        const guardianId = req.user.id;

        if (req.user.role !== 'GUARDIAN') {
            return res.status(403).json({ error: 'Only Guardians can update status' });
        }

        if (!['ACTIVE', 'BLOCKED'].includes(status)) {
            return res.status(400).json({ error: 'Status must be ACTIVE or BLOCKED' });
        }

        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        if (student.guardianId !== guardianId) {
            return res.status(403).json({ error: 'Not authorized for this student' });
        }

        const updated = await prisma.student.update({
            where: { id: studentId },
            data: { status }
        });

        await createAuditLog('STUDENT_STATUS_UPDATED', guardianId, 'STUDENT', studentId, { status }, req.ip);

        const { pinHash, ...safeStudent } = updated;
        res.json(safeStudent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update status' });
    }
};

// Get student transaction history (for guardian)
exports.getStudentTransactions = async (req, res) => {
    try {
        const { studentId } = req.params;
        const guardianId = req.user.id;

        if (req.user.role !== 'GUARDIAN') {
            return res.status(403).json({ error: 'Only Guardians can view student transactions' });
        }

        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (!student || student.guardianId !== guardianId) {
            return res.status(403).json({ error: 'Not authorized for this student' });
        }

        const wallet = await prisma.wallet.findFirst({ where: { studentId } });
        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        const transactions = await prisma.transaction.findMany({
            orderBy: { createdAt: 'desc' }
        });

        const filtered = transactions.filter(t =>
            t.fromWalletId === wallet.id || t.toWalletId === wallet.id
        );

        res.json(filtered);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};

// Guardian sets spending limit for student
exports.setSpendingLimit = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { dailyLimit } = req.body;
        const guardianId = req.user.id;

        if (req.user.role !== 'GUARDIAN') {
            return res.status(403).json({ error: 'Only Guardians can set spending limits' });
        }

        // Verify student belongs to guardian
        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (!student || student.guardianId !== guardianId) {
            return res.status(403).json({ error: 'Not authorized for this student' });
        }

        // Get student's wallet
        const wallet = await prisma.wallet.findFirst({ where: { studentId } });
        if (!wallet) {
            return res.status(404).json({ error: 'Student wallet not found' });
        }

        // Check for existing rule
        const existingRule = await prisma.walletRule.findFirst({
            where: { walletId: wallet.id }
        });

        let rule;
        if (existingRule) {
            // Update existing rule
            rule = await prisma.walletRule.update({
                where: { id: existingRule.id },
                data: {
                    dailyLimit: parseFloat(dailyLimit),
                    active: dailyLimit > 0
                }
            });
        } else {
            // Create new rule
            rule = await prisma.walletRule.create({
                data: {
                    walletId: wallet.id,
                    dailyLimit: parseFloat(dailyLimit),
                    active: dailyLimit > 0,
                    createdByUserId: guardianId
                }
            });
        }

        await createAuditLog('SPENDING_LIMIT_SET', guardianId, 'WALLET_RULE', rule.id, { studentId, dailyLimit }, req.ip);

        res.json({
            message: 'Spending limit updated',
            dailyLimit: rule.dailyLimit,
            active: rule.active
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to set spending limit' });
    }
};

// Get student spending limit
exports.getSpendingLimit = async (req, res) => {
    try {
        const { studentId } = req.params;
        const guardianId = req.user.id;

        if (req.user.role !== 'GUARDIAN') {
            return res.status(403).json({ error: 'Only Guardians can view spending limits' });
        }

        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (!student || student.guardianId !== guardianId) {
            return res.status(403).json({ error: 'Not authorized for this student' });
        }

        const wallet = await prisma.wallet.findFirst({ where: { studentId } });
        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        const rule = await prisma.walletRule.findFirst({
            where: { walletId: wallet.id }
        });

        // Calculate today's spending
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const transactions = await prisma.transaction.findMany({
            where: {
                fromWalletId: wallet.id,
                type: 'PAYMENT',
                status: 'COMPLETED'
            }
        });

        const todaySpent = transactions
            .filter(t => new Date(t.createdAt) >= today)
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        res.json({
            dailyLimit: rule?.dailyLimit || 0,
            active: rule?.active || false,
            todaySpent,
            remaining: rule?.dailyLimit ? Math.max(0, rule.dailyLimit - todaySpent) : null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get spending limit' });
    }
};

// Admin: Get all students
exports.getAllStudents = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const students = await prisma.student.findMany({
            orderBy: { createdAt: 'desc' }
        });

        // Get wallet and guardian info
        const enriched = await Promise.all(students.map(async (s) => {
            const wallet = await prisma.wallet.findFirst({ where: { studentId: s.id } });
            const guardian = await prisma.user.findUnique({ where: { id: s.guardianId } });
            const { pinHash, ...safeStudent } = s;
            return {
                ...safeStudent,
                walletBalance: wallet ? parseFloat(wallet.balance) : 0,
                guardianName: guardian?.name,
                guardianEmail: guardian?.email
            };
        }));

        res.json(enriched);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
};

// ============ STUDENT BIOMETRIC/OTP ENDPOINTS ============

// Student login (for mobile app - first time setup)
exports.studentLogin = async (req, res) => {
    try {
        const { studentId, pin } = req.body;

        if (!studentId || !pin) {
            return res.status(400).json({ error: 'Student ID and PIN are required' });
        }

        // Find student
        const student = await prisma.student.findUnique({ where: { studentId } });
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Check status
        if (student.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Student account is blocked' });
        }

        // Verify PIN
        const pinValid = await bcrypt.compare(pin, student.pinHash);
        if (!pinValid) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        // Get wallet balance
        const wallet = await prisma.wallet.findFirst({ where: { studentId: student.id } });

        // Generate a session token for the student
        const jwt = require('jsonwebtoken');
        const accessToken = jwt.sign(
            { id: student.id, studentId: student.studentId, role: 'STUDENT', isStudent: true },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '30d' }
        );

        const { pinHash, ...safeStudent } = student;

        await createAuditLog('STUDENT_LOGIN', student.id, 'STUDENT', student.id, { studentId }, req.ip);

        res.json({
            student: safeStudent,
            accessToken,
            balance: wallet ? parseFloat(wallet.balance) : 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed' });
    }
};

// Register device for biometric auth
exports.registerDevice = async (req, res) => {
    try {
        const { deviceKey, deviceName } = req.body;
        const studentId = req.user.id; // From JWT

        if (!deviceKey) {
            return res.status(400).json({ error: 'Device key is required' });
        }

        // Store device registration (persisted to file)
        deviceStore[deviceKey] = {
            studentId,
            deviceName,
            registeredAt: new Date().toISOString()
        };
        saveDeviceStore(deviceStore);

        // Get wallet balance
        const wallet = await prisma.wallet.findFirst({ where: { studentId } });

        await createAuditLog('DEVICE_REGISTERED', studentId, 'STUDENT', studentId, { deviceName }, req.ip);

        res.json({
            message: 'Device registered successfully',
            balance: wallet ? parseFloat(wallet.balance) : 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Device registration failed' });
    }
};

// Verify device registration
exports.verifyDevice = async (req, res) => {
    try {
        const studentId = req.user.id;

        // Reload device store from file
        deviceStore = loadDeviceStore();

        // Check if any device is registered for this student
        let registered = false;
        for (const key in deviceStore) {
            if (deviceStore[key].studentId === studentId) {
                registered = true;
                break;
            }
        }

        // Get wallet balance
        const wallet = await prisma.wallet.findFirst({ where: { studentId } });

        res.json({
            registered,
            balance: wallet ? parseFloat(wallet.balance) : 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Verification failed' });
    }
};

// Generate OTP for payment
exports.generateOTP = async (req, res) => {
    try {
        const { deviceKey } = req.body;
        const studentId = req.user.id;

        // Reload and verify device
        deviceStore = loadDeviceStore();
        const device = deviceStore[deviceKey];
        if (!device || device.studentId !== studentId) {
            return res.status(403).json({ error: 'Device not registered. Please re-register.' });
        }

        // Get student info
        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (!student || student.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Student account is inactive' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP with 60-second expiry
        otpStore.set(student.studentId, {
            otp,
            studentInternalId: studentId,
            expiresAt: Date.now() + 60000 // 60 seconds
        });

        // Get wallet balance
        const wallet = await prisma.wallet.findFirst({ where: { studentId } });

        await createAuditLog('OTP_GENERATED', studentId, 'STUDENT', studentId, {}, req.ip);

        res.json({
            otp,
            expiresIn: 60,
            balance: wallet ? parseFloat(wallet.balance) : 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'OTP generation failed' });
    }
};

// Validate OTP (called by vendor transaction)
exports.validateOTP = (studentId, otp) => {
    const stored = otpStore.get(studentId);

    if (!stored) {
        return { valid: false, error: 'No OTP found' };
    }

    if (Date.now() > stored.expiresAt) {
        otpStore.delete(studentId);
        return { valid: false, error: 'OTP expired' };
    }

    if (stored.otp !== otp) {
        return { valid: false, error: 'Invalid OTP' };
    }

    // OTP is valid - delete it (one-time use)
    otpStore.delete(studentId);

    return { valid: true, studentInternalId: stored.studentInternalId };
};
