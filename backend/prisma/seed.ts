// backend/prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.rideRequest.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding Demo Data...');

  // ১. জসিম এবং তার গাড়ি (Bullet) তৈরি
  const jashim = await prisma.user.create({
    data: {
      name: 'Jashim',
      role: Role.DRIVER,
      phone: '01700000001',
      vehicles: {
        create: {
          name: 'Bullet',
          capacity: 3, // ৩ সিট
        },
      },
    },
  });

  // ২. প্যাসেঞ্জার তৈরি (নুসরাত, রফিক, শিরিন)
  await prisma.user.createMany({
    data: [
      { name: 'Nusrat', role: Role.PASSENGER, phone: '01700000002' },
      { name: 'Rafiq', role: Role.PASSENGER, phone: '01700000003' },
      { name: 'Shirin', role: Role.PASSENGER, phone: '01700000004' },
    ],
  });

  console.log('Demo data seeded successfully!');
  console.log(`Driver: ${jashim.name} with vehicle Bullet (Capacity: 3)`);
  console.log('Passengers: Nusrat, Rafiq, Shirin');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });