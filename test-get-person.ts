import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: '',
    },
  },
});

async function main() {
  console.log('--- TEST START ---');
  try {
    const person = await prisma.user.findUnique({
      where: { id: '622e1ce8-0884-42ee-84a9-732aa5d76998' },
      include: {
        employments: true,
        roles: true,
      },
    });
    console.log('RESULT:', JSON.stringify(person, null, 2));
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
