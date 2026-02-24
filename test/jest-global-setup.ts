import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const ROOT = path.resolve(__dirname, '..');

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(ROOT, '.env.test') });

  console.log('🔄 Aplicando migraciones en DB de test...');
  execSync('npx prisma migrate deploy', {
    env: { ...process.env },
    stdio: 'inherit',
    cwd: ROOT,
  });

  console.log('🌱 Corriendo seed de test...');
  const prisma = new PrismaClient();

  try {
    const password = await bcrypt.hash('123456', 10);

    await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: { email: 'admin@test.com', password, role: Role.ADMIN },
    });

    await prisma.user.upsert({
      where: { email: 'seller@test.com' },
      update: {},
      create: { email: 'seller@test.com', password, role: Role.SELLER },
    });

    await prisma.user.upsert({
      where: { email: 'customer@test.com' },
      update: {},
      create: { email: 'customer@test.com', password, role: Role.CUSTOMER },
    });

    console.log('✅ DB de test lista');
  } finally {
    await prisma.$disconnect();
  }
}