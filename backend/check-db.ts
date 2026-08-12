import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    const userCount = await prisma.user.count();
    const companyCount = await prisma.company.count();
    const farmCount = await prisma.farm.count();
    console.log({ userCount, companyCount, farmCount });
    
    const superadmin = await prisma.user.findUnique({
      where: { email: 'tnicodemos@gmail.com' },
      include: { roles: true }
    });
    console.log('Superadmin:', superadmin ? { id: superadmin.id, roles: superadmin.roles.map(r => r.role) } : 'Not found');
    
  } catch (e) {
    console.error('DB Check failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
