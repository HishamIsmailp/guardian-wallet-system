const bcrypt = require('bcrypt');
const prisma = require('../utils/db');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');

exports.register = async (req, res) => {
    try {
        const { email, password, name, roleName, storeName, guardianId } = req.body;

        // Check if user exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ error: 'User already exists' });

        // Find Role
        const role = await prisma.role.findUnique({ where: { name: roleName } });
        if (!role) return res.status(400).json({ error: 'Invalid role' });

        const passwordHash = await bcrypt.hash(password, 10);

        // Transaction to create User + Wallet
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    name,
                    roleId: role.id,
                    guardianId: guardianId || null,
                    isVerified: false // Admin must approve
                },
                include: { role: true }
            });

            // Create Wallet
            let walletType = 'STUDENT';
            if (roleName === 'GUARDIAN') walletType = 'GUARDIAN';
            if (roleName === 'VENDOR') walletType = 'VENDOR';

            await tx.wallet.create({
                data: {
                    userId: user.id,
                    type: walletType,
                    balance: 0.0
                }
            });

            // If Vendor, create profile
            if (roleName === 'VENDOR' && storeName) {
                await tx.vendor.create({
                    data: { userId: user.id, storeName, approved: false }
                });
            }

            return user;
        });

        const accessToken = generateAccessToken(result);
        const refreshToken = generateRefreshToken(result);

        res.status(201).json({ user: result, accessToken, refreshToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Registration failed' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({
            where: { email },
            include: { role: true }
        });

        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Remove hash
        const { passwordHash, ...safeUser } = user;

        res.json({ user: safeUser, accessToken, refreshToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed' });
    }
};


exports.getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: { role: true },
            orderBy: { createdAt: 'desc' }
        });
        // Remove passwords
        const safeUsers = users.map(u => {
            const { passwordHash, ...safe } = u;
            return safe;
        });
        res.json(safeUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

exports.verifyUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { isVerified } = req.body;

        const user = await prisma.user.update({
            where: { id },
            data: { isVerified }
        });

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};
