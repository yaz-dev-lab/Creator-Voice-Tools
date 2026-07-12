// Bootstraps the first admin account. Usage:
//   node scripts/make-admin.mjs someone@example.com
// The user must already have signed up (this only flips their role).
import { PrismaClient } from '@prisma/client';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/make-admin.mjs <email>');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    console.error(`No user found with email "${email}". They need to sign up first.`);
    process.exit(1);
  }
  if (user.role === 'ADMIN') {
    console.log(`${email} is already an admin.`);
    return;
  }
  await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  console.log(`${email} is now an admin.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
