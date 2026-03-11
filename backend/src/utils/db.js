const { PrismaClient } = require('@prisma/client');

// Initialize Prisma Client for PostgreSQL via DATABASE_URL
const prisma = new PrismaClient();

module.exports = prisma;
