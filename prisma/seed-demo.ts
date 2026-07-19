import { countRows, createPrismaClient } from './seed-utils';
import { seedDemoEvents } from './seed-demo-events';
import { seedDemoFoundation } from './seed-demo-foundation';
import { seedDemoOperations } from './seed-demo-operations';
import { seedDemoPayments } from './seed-demo-payments';
import { seedDemoSessions } from './seed-demo-sessions';

async function main() {
  const prisma = createPrismaClient();

  try {
    let inserted = 0;
    inserted += await seedDemoFoundation(prisma);
    inserted += await seedDemoEvents(prisma);
    inserted += await seedDemoPayments(prisma);
    inserted += await seedDemoSessions(prisma);
    inserted += await seedDemoOperations(prisma);

    console.log(`Demonstration rows inserted: ${inserted}`);
    console.log(`Demo stations total: ${await countRows(prisma, 'stations')}`);
    console.log(`Demo payments total: ${await countRows(prisma, 'payments')}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
