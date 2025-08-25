import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@covestack.dev' },
    update: {},
    create: { name: 'Demo User', email: 'demo@covestack.dev' }
  });

  await prisma.workspace.upsert({
    where: { id: 'seed-demo-ws' },
    update: {},
    create: {
      id: 'seed-demo-ws',
      name: 'Demo Workspace',
      description: 'Seeded data',
      ownerId: user.id,
      members: { create: [{ userId: user.id, role: 'OWNER' }] },
      channels: { create: [{ name: 'general' }] },
      tasks: { create: [{ title: 'First task', createdById: user.id }] },
      notes: { create: { content: 'Welcome to CoveStack!', version: 1, updatedById: user.id } }
    }
  });

  console.log('Seeded ');
}
main().finally(() => prisma.$disconnect());
