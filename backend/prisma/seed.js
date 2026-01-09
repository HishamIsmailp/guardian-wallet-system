const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const bcrypt = require('bcrypt')

async function main() {
  const roles = ['ADMIN', 'GUARDIAN', 'STUDENT', 'VENDOR']
  for (const r of roles) {
    const roleId = r // Use name as ID? No, schema uses UUID default.
    // We want to find or create by name.
    
    // Check if exists
    const existing = await prisma.role.findUnique({ where: { name: r } })
    if (!existing) {
      await prisma.role.create({
        data: {
          name: r,
          description: `${r} Role`
        }
      })
      console.log(`Created role: ${r}`)
    }
  }

  // Create Admin
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } })
  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@college.edu' } })
  
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10)
    const admin = await prisma.user.create({
      data: {
        email: 'admin@college.edu',
        passwordHash,
        name: 'Super Admin',
        roleId: adminRole.id,
        isVerified: true
      }
    })
    console.log('Created Admin User:', admin.email)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
