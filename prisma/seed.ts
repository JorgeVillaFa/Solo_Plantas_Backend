/**
 * prisma/seed.ts
 * ===========================
 * Dev seed — populates the database with sample data for local development.
 * Run: npx ts-node prisma/seed.ts  (or: npm run prisma:seed)
 *
 * Seeds:
 *   - 2 PlantGenetics records (L-System definitions)
 *   - 3 Plant records with inventory
 *   - 2 Nursery pickup locations
 * ===========================
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ---- Plant Genetics (L-System seeds) ----
  const genetics1 = await prisma.plantGenetics.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      axiom: 'F',
      rules: { F: 'FF+[+F-F-F]-[-F+F+F]' },
      angle: 22.5,
      depth: 4,
      seedJson: JSON.stringify({
        axiom: 'F',
        rules: { F: 'FF+[+F-F-F]-[-F+F+F]' },
        angle: 22.5,
        depth: 4,
      }),
    },
  });

  const genetics2 = await prisma.plantGenetics.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      axiom: 'X',
      rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' },
      angle: 25,
      depth: 5,
      seedJson: JSON.stringify({
        axiom: 'X',
        rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' },
        angle: 25,
        depth: 5,
      }),
    },
  });

  // ---- Plants ----
  const plant1 = await prisma.plant.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      commonName: 'Pothos Dorado',
      scientificName: 'Epipremnum aureum',
      priceInCents: 29900, // $299 MXN
      description: 'Planta trepadora de interior, muy resistente y fácil de cuidar.',
      tempMin: 15,
      tempMax: 35,
      season: null,
      careWater: 'Regar cuando la capa superior del sustrato esté seca.',
      careLight: 'Luz indirecta brillante a media.',
      careTemperature: '15-35 °C. Evitar heladas.',
      lSeedId: genetics1.id,
      inventory: {
        create: { stock: 50, reserved: 0, sold: 0 },
      },
    },
  });

  const plant2 = await prisma.plant.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      commonName: 'Cactus Barril',
      scientificName: 'Echinocactus grusonii',
      priceInCents: 49900, // $499 MXN
      description: 'Cactus globoso originario del centro de México.',
      tempMin: 5,
      tempMax: 45,
      season: 'summer',
      careWater: 'Regar muy esporádicamente en verano, casi nada en invierno.',
      careLight: 'Pleno sol.',
      careTemperature: '5-45 °C. Tolera heladas leves.',
      lSeedId: genetics2.id,
      inventory: {
        create: { stock: 30, reserved: 0, sold: 0 },
      },
    },
  });

  const plant3 = await prisma.plant.upsert({
    where: { id: '00000000-0000-0000-0000-000000000012' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000012',
      commonName: 'Helecho de Boston',
      scientificName: 'Nephrolepis exaltata',
      priceInCents: 34900, // $349 MXN
      description: 'Helecho frondoso ideal para ambientes húmedos.',
      tempMin: 10,
      tempMax: 28,
      season: 'spring',
      careWater: 'Mantener sustrato húmedo. Riego frecuente.',
      careLight: 'Luz indirecta. Evitar sol directo.',
      careTemperature: '10-28 °C.',
      lSeedId: genetics1.id,
      inventory: {
        create: { stock: 20, reserved: 0, sold: 0 },
      },
    },
  });

  // ---- Nurseries ----
  await prisma.nursery.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      name: 'Vivero Tlaquepaque',
      address: 'Av. Niños Héroes 1234, Tlaquepaque, Jalisco',
      lat: 20.6414,
      lon: -103.3082,
      schedule: 'Lun-Vie 9am-6pm, Sáb 9am-3pm',
      phone: '+52 33 1234 5678',
    },
  });

  await prisma.nursery.upsert({
    where: { id: '00000000-0000-0000-0000-000000000021' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000021',
      name: 'Vivero Zapopan',
      address: 'Av. Patria 456, Zapopan, Jalisco',
      lat: 20.7205,
      lon: -103.3862,
      schedule: 'Lun-Dom 8am-7pm',
      phone: '+52 33 8765 4321',
    },
  });

  console.log('Seed complete.');
  console.log(`  PlantGenetics: 2`);
  console.log(`  Plants: 3 (${plant1.commonName}, ${plant2.commonName}, ${plant3.commonName})`);
  console.log(`  Nurseries: 2`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
