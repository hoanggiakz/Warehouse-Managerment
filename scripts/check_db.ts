import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';`;
    console.log("Existing tables in database:");
    console.log(result);
  } catch (e) {
    console.error("Error querying database:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
