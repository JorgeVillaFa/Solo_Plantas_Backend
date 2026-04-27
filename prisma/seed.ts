/**
 * prisma/seed.ts
 * ===========================
 * Dev seed — populates the database with sample data for local development.
 * Run: npx ts-node prisma/seed.ts  (or: npm run prisma:seed)
 *
 * Seeds:
 *   - 6 PlantGenetics records (L-System definitions)
 *   - 6 Plant records with inventory
 *   - 5 Nursery pickup locations
 * ===========================
 */
import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ---- Plant Genetics (L-System seeds) ----

  const geneticsPrimavera = await prisma.plantGenetics.upsert({
    where: { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
    update: {},
    create: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      axiom: 'X',
      rules: { X: 'F-[[X]+X]+F[+FX]-X', F: 'FF' },
      branchAngle: 22.5,
      depth: 4,
      baseThickness: 0.035,
      lengthMultiplier: 0.95,
      leafScale: 0.2,
      flowerScale: 0.2,
      stemColor: '#4A3B2C',
      leafColor: '#EBE02E',
      flowerColor: '#EBE02E',
      seedJson: JSON.stringify({
        axiom: 'X',
        rules: { X: 'F-[[X]+X]+F[+FX]-X', F: 'FF' },
        branchAngle: 22.5,
        depth: 4,
        baseThickness: 0.035,
        lengthMultiplier: 0.95,
        leafScale: 0.2,
        flowerScale: 0.2,
        stemColor: '#4A3B2C',
        leafColor: '#EBE02E',
        flowerColor: '#EBE02E',
      }),
    },
  });

  const geneticsGuachumil = await prisma.plantGenetics.upsert({
    where: { id: 'b33dcc62-3462-11f1-8d3a-345a601cd3cc' },
    update: {},
    create: {
      id: 'b33dcc62-3462-11f1-8d3a-345a601cd3cc',
      axiom: 'X',
      rules: { X: 'F[+X]F[-X]+X', F: 'FF' },
      branchAngle: 35.0,
      depth: 4,
      baseThickness: 0.030,
      lengthMultiplier: 0.94,
      leafScale: 0.19,
      flowerScale: 0.18,
      stemColor: '#5C4A3D',
      leafColor: '#3B7A2E',
      flowerColor: '#FFFFFF',
      seedJson: JSON.stringify({
        axiom: 'X',
        rules: { X: 'F[+X]F[-X]+X', F: 'FF' },
        branchAngle: 35.0,
        depth: 4,
        baseThickness: 0.030,
        lengthMultiplier: 0.94,
        leafScale: 0.19,
        flowerScale: 0.18,
        stemColor: '#5C4A3D',
        leafColor: '#3B7A2E',
        flowerColor: '#FFFFFF',
      }),
    },
  });

  const geneticsMezquite = await prisma.plantGenetics.upsert({
    where: { id: 'c26b86da-00f3-4be6-963d-f50a1e3026e8' },
    update: {},
    create: {
      id: 'c26b86da-00f3-4be6-963d-f50a1e3026e8',
      axiom: 'X',
      rules: { X: 'F-[[X]+X]+F[+FX]-X', F: 'FF' },
      branchAngle: 38.0,
      depth: 4,
      baseThickness: 0.040,
      lengthMultiplier: 0.93,
      leafScale: 0.17,
      flowerScale: 0.16,
      stemColor: '#3E362E',
      leafColor: '#556B2F',
      flowerColor: '#F5F5DC',
      seedJson: JSON.stringify({
        axiom: 'X',
        rules: { X: 'F-[[X]+X]+F[+FX]-X', F: 'FF' },
        branchAngle: 38.0,
        depth: 4,
        baseThickness: 0.040,
        lengthMultiplier: 0.93,
        leafScale: 0.17,
        flowerScale: 0.16,
        stemColor: '#3E362E',
        leafColor: '#556B2F',
        flowerColor: '#F5F5DC',
      }),
    },
  });

  const geneticsSalvia = await prisma.plantGenetics.upsert({
    where: { id: 'c9af1d49-3462-11f1-806b-345a601cd3cc' },
    update: {},
    create: {
      id: 'c9af1d49-3462-11f1-806b-345a601cd3cc',
      axiom: 'X',
      rules: { X: 'F-[[X]+X]+F[+FX]-X', F: 'FF' },
      branchAngle: 18.0,
      depth: 3,
      baseThickness: 0.010,
      lengthMultiplier: 0.96,
      leafScale: 0.06,
      flowerScale: 0.06,
      stemColor: '#6B8E23',
      leafColor: '#4B0082',
      flowerColor: '#4B0082',
      seedJson: JSON.stringify({
        axiom: 'X',
        rules: { X: 'F-[[X]+X]+F[+FX]-X', F: 'FF' },
        branchAngle: 18.0,
        depth: 3,
        baseThickness: 0.010,
        lengthMultiplier: 0.96,
        leafScale: 0.06,
        flowerScale: 0.06,
        stemColor: '#6B8E23',
        leafColor: '#4B0082',
        flowerColor: '#4B0082',
      }),
    },
  });

  const geneticsTronadora = await prisma.plantGenetics.upsert({
    where: { id: '36062053-323e-4c64-9d79-e8124b43966f' },
    update: {},
    create: {
      id: '36062053-323e-4c64-9d79-e8124b43966f',
      axiom: 'X',
      rules: { X: 'F-[[X]+X]+F[+FX]-X', F: 'FF' },
      branchAngle: 28.0,
      depth: 3,
      baseThickness: 0.022,
      lengthMultiplier: 0.93,
      leafScale: 0.15,
      flowerScale: 0.17,
      stemColor: '#8B7355',
      leafColor: '#FFD700',
      flowerColor: '#FFD700',
      seedJson: JSON.stringify({
        axiom: 'X',
        rules: { X: 'F-[[X]+X]+F[+FX]-X', F: 'FF' },
        branchAngle: 28.0,
        depth: 3,
        baseThickness: 0.022,
        lengthMultiplier: 0.93,
        leafScale: 0.15,
        flowerScale: 0.17,
        stemColor: '#8B7355',
        leafColor: '#FFD700',
        flowerColor: '#FFD700',
      }),
    },
  });

  const geneticsCempasuchil = await prisma.plantGenetics.upsert({
    where: { id: 'e55a4dfb-3462-11f1-8e01-345a601cd3cc' },
    update: {},
    create: {
      id: 'e55a4dfb-3462-11f1-8e01-345a601cd3cc',
      axiom: 'X',
      rules: { X: 'F[+X][-X]F[-X]+X', F: 'FF' },
      branchAngle: 42.0,
      depth: 3,
      baseThickness: 0.012,
      lengthMultiplier: 0.91,
      leafScale: 0.10,
      flowerScale: 0.16,
      stemColor: '#228B22',
      leafColor: '#FFA500',
      flowerColor: '#FFA500',
      seedJson: JSON.stringify({
        axiom: 'X',
        rules: { X: 'F[+X][-X]F[-X]+X', F: 'FF' },
        branchAngle: 42.0,
        depth: 3,
        baseThickness: 0.012,
        lengthMultiplier: 0.91,
        leafScale: 0.10,
        flowerScale: 0.16,
        stemColor: '#228B22',
        leafColor: '#FFA500',
        flowerColor: '#FFA500',
      }),
    },
  });

  // ---- Plants ----

  const plant1 = await prisma.plant.upsert({
    where: { id: '4eedc0de-3445-11f1-81bf-345a601cd3cc' },
    update: {},
    create: {
      id: '4eedc0de-3445-11f1-81bf-345a601cd3cc',
      name: 'Primavera',
      scientificName: 'Roseodendron donnell-smithii',
      price: 49900,
      priceActive: true,
      description: 'A magnificent canopy tree reaching up to 30 meters, exploding with clustered yellow flowers that scatter winged seeds into the wind.',
      illustrationName: 'primavera',
      ecologicalRole: 'Provides crucial high canopy shelter and early season nectar for native insects.',
      tempMin: 15,
      tempMax: 38,
      season: 'Blooms January–March',
      seasonCategory: 'spring',
      growthType: 'tall',
      dominantColor: 'yellow',
      growthMilestones: [5, 20, 40, 70],
      riddle: 'I reach for the sky with a golden crown. Seek my bright yellow petals when the dry season comes.',
      careInstructions: [
        'Select a planting spot with at least 5 to 7 meters of open space for the future canopy.',
        'Dig a hole twice as wide as the root ball and just as deep.',
        'Place the tree in the hole, ensuring the base of the trunk is level with the surrounding soil.',
        'Fill the hole with native soil, tamping it down gently to remove air pockets.',
        'Water deeply immediately after planting, then water once a week during the first dry season.',
      ],
      lSeedId: geneticsPrimavera.id,
      inventory: {
        create: { stock: 50, reserved: 0, sold: 0 },
      },
    },
  });

  const plant2 = await prisma.plant.upsert({
    where: { id: '1a1c605b-ebf8-42fd-87e5-44cd08e6fedd' },
    update: {},
    create: {
      id: '1a1c605b-ebf8-42fd-87e5-44cd08e6fedd',
      name: 'Guachumil',
      scientificName: 'Leucaena macrophylla',
      price: 39900,
      priceActive: true,
      description: 'A highly resilient tree with a wide crown, featuring fragrant white puffball flowers and twisted pendant pods.',
      illustrationName: 'guachumil',
      ecologicalRole: 'Highly adaptable soil stabilizer that resists prolonged droughts and urban conditions.',
      tempMin: 10,
      tempMax: 40,
      season: 'Blooms February–March',
      seasonCategory: 'spring',
      growthType: 'wide',
      dominantColor: 'white',
      growthMilestones: [4, 15, 30, 60],
      riddle: 'My flowers look like fluffy white clouds resting on twisted pods. Find a resilient survivor dressed in white.',
      careInstructions: [
        'Choose a location that receives full, direct sunlight for most of the day.',
        'Loosen the soil at the planting site, as this plant adapts well to various soil types.',
        'Plant the seedling at the same depth it was growing in its nursery pot.',
        'Apply a light layer of mulch around the base to retain moisture, keeping it away from the trunk.',
        'Cover the young plant with a frost blanket during unexpectedly cold winter nights.',
      ],
      lSeedId: geneticsGuachumil.id,
      inventory: {
        create: { stock: 50, reserved: 0, sold: 0 },
      },
    },
  });

  const plant3 = await prisma.plant.upsert({
    where: { id: '041f5bca-3463-11f1-9b6e-345a601cd3cc' },
    update: {},
    create: {
      id: '041f5bca-3463-11f1-9b6e-345a601cd3cc',
      name: 'Mezquite',
      scientificName: 'Prosopis laevigata',
      price: 39900,
      priceActive: true,
      description: 'A legendary, deeply rooted tree with cracked blackish bark, thorny branches, and fragrant cream-yellowish flowers.',
      illustrationName: 'mesquite',
      ecologicalRole: 'A keystone desert species whose wide ecological range allows it to shelter countless wildlife species.',
      tempMin: 5,
      tempMax: 45,
      season: 'Blooms Spring',
      seasonCategory: 'spring',
      growthType: 'wide',
      dominantColor: 'yellow',
      growthMilestones: [6, 25, 45, 80],
      riddle: 'Deep roots, thorny arms, and pale blooms. Look for the creamy-yellow desert king.',
      careInstructions: [
        'Find a spacious, flat area where the deep taproot can grow without hitting pipes or foundations.',
        'Dig a deep hole, ensuring the taproot points straight down and is not bent or crowded.',
        'Backfill with the original soil without adding rich compost, as they prefer native, arid soil.',
        'Water thoroughly at planting, then restrict watering to encourage the roots to seek deep water.',
        'Prune only broken or crossing branches during its dormant winter season.',
      ],
      lSeedId: geneticsMezquite.id,
      inventory: {
        create: { stock: 50, reserved: 0, sold: 0 },
      },
    },
  });

  const plant4 = await prisma.plant.upsert({
    where: { id: 'dec2732f-e763-495e-ad88-2b417632a8c9' },
    update: {},
    create: {
      id: 'dec2732f-e763-495e-ad88-2b417632a8c9',
      name: 'Salvia',
      scientificName: 'Salvia mexicana',
      price: 24900,
      priceActive: true,
      description: 'An ancient native resident featuring tall, straight vertical stalks that end in striking deep purple flower spikes.',
      illustrationName: 'salvia',
      ecologicalRole: 'A crucial, high value nectar source for migrating hummingbirds across Jalisco.',
      tempMin: 8,
      tempMax: 32,
      season: 'Blooms Late Summer–Fall',
      seasonCategory: 'fall',
      growthType: 'tall',
      dominantColor: 'purple',
      growthMilestones: [2, 7, 14, 30],
      riddle: 'Hummingbirds love my vibrant spikes. Search for the royal purple stalks standing tall.',
      careInstructions: [
        'Select a garden bed or large pot that drains quickly and gets partial to full sun.',
        'Dig a hole slightly larger than the root ball and place the plant inside.',
        'Backfill the soil and water the base until the soil is fully saturated.',
        'Check the soil moisture every few days, watering only when the top inch feels completely dry.',
        'Cut the tall stalks back by a third after the fall blooming season ends to encourage new growth.',
      ],
      lSeedId: geneticsSalvia.id,
      inventory: {
        create: { stock: 50, reserved: 0, sold: 0 },
      },
    },
  });

  const plant5 = await prisma.plant.upsert({
    where: { id: '14c2b391-3463-11f1-b08f-345a601cd3cc' },
    update: {},
    create: {
      id: '14c2b391-3463-11f1-b08f-345a601cd3cc',
      name: 'Tronadora',
      scientificName: 'Tecoma stans',
      price: 24900,
      priceActive: true,
      description: 'A beautiful, vibrant shrub that explodes with bright yellow, trumpet-shaped flowers. Easily pruned to fit any garden.',
      illustrationName: 'tronadora',
      ecologicalRole: 'Provides a continuous source of nectar for native bees and local bird populations.',
      tempMin: 10,
      tempMax: 38,
      season: 'Blooms Spring–Fall',
      seasonCategory: 'summer',
      growthType: 'balanced',
      dominantColor: 'yellow',
      growthMilestones: [3, 10, 20, 45],
      riddle: 'I am a vibrant shrub shaped like golden trumpets. Find my bright yellow bells ringing in the sun.',
      careInstructions: [
        'Pick a bright, sunny spot in your garden to guarantee maximum yellow blooms.',
        'Dig a hole twice the width of the container and plant it at the same soil level.',
        'Water the shrub twice a week for the first month to help the root system establish.',
        'Reduce watering to once a week once established, letting the soil dry between waterings.',
        'Prune the shrub heavily in late winter to shape it and encourage bushy spring growth.',
      ],
      lSeedId: geneticsTronadora.id,
      inventory: {
        create: { stock: 50, reserved: 0, sold: 0 },
      },
    },
  });

  const plant6 = await prisma.plant.upsert({
    where: { id: '32c7b089-0ccc-46ec-ab1a-cacdab50ce64' },
    update: {},
    create: {
      id: '32c7b089-0ccc-46ec-ab1a-cacdab50ce64',
      name: 'Cempasúchil',
      scientificName: 'Tagetes erecta',
      price: 19900,
      priceActive: true,
      description: 'The iconic Mexican Marigold. A bushy, structural plant with brilliant orange blooms deeply tied to Mexican heritage.',
      illustrationName: 'cempasuchil',
      ecologicalRole: 'Releases natural compounds into the soil that protect neighboring plants from harmful nematodes.',
      tempMin: 10,
      tempMax: 35,
      season: 'Blooms Autumn (Día de Muertos)',
      seasonCategory: 'fall',
      growthType: 'balanced',
      dominantColor: 'orange',
      growthMilestones: [2, 5, 12, 25],
      riddle: 'I light the way for spirits with my brilliant colors. Seek the vibrant orange of autumn.',
      careInstructions: [
        'Prepare a spot with full sun exposure and loosen the top few inches of soil.',
        'Plant the seeds about a quarter-inch deep, or transplant seedlings level with the soil.',
        'Water the soil gently at the base to keep it moist but never soggy.',
        'Pinch off the top growing tips when the plant is young to encourage a wider, bushier shape.',
        'Remove dead or fading orange flowers regularly to force the plant to produce new blooms.',
      ],
      lSeedId: geneticsCempasuchil.id,
      inventory: {
        create: { stock: 50, reserved: 0, sold: 0 },
      },
    },
  });

  // ---- Nurseries ----
  await prisma.nursery.upsert({
    where: { id: 'feaf12ef-27a9-4083-b7d3-5f4f22bf3c72' },
    update: {},
    create: {
      id: 'feaf12ef-27a9-4083-b7d3-5f4f22bf3c72',
      name: 'Bosque Urbano Extra A.C.',
      address: 'Av. Patria 1000, Bosque Los Colomos, Guadalajara',
      description: 'NGO offering free plant adoption with just your ID. Take up to 2 trees or plants per visit. Mon-Fri 9am-4pm, Sat 9am-2pm.',
      lat: 20.7090,
      lon: -103.3960,
      schedule: 'Lun-Vie 9am-6pm, Sáb 9am-3pm',
      phone: '+52 33 1234 5678',
    },
  });

  await prisma.nursery.upsert({
    where: { id: '2733f36f-3463-11f1-a2d3-345a601cd3cc' },
    update: {},
    create: {
      id: '2733f36f-3463-11f1-a2d3-345a601cd3cc',
      name: 'Vivero Estatal Colomos – SEMADET',
      address: 'Bosque Los Colomos, Guadalajara',
      description: "State government nursery donating forest, fruit, and ornamental trees for urban reforestation. Open to citizens, schools, and municipalities via request.",
      lat: 20.7080,
      lon: -103.3955,
      schedule: 'Lun-Dom 8am-7pm',
      phone: '+52 33 8765 4321',
    },
  });

  await prisma.nursery.upsert({
    where: { id: 'b1cc5147-eff4-43b6-b793-153d04ba88cf' },
    update: {},
    create: {
      id: 'b1cc5147-eff4-43b6-b793-153d04ba88cf',
      name: 'Vivero Municipal de Zapopan',
      address: 'Av. Tesistán 801, Santa Margarita, Zapopan',
      description: 'Free tree and plant donations for Zapopan residents. Requires a written request, ID, and photos of the planting area.',
      lat: 20.7220,
      lon: -103.4410,
      schedule: 'Lun-Vie 8am-5pm, Sáb 9am-1pm',
      phone: '+52 33 3658 1200',
    },
  });

  await prisma.nursery.upsert({
    where: { id: '43c7e025-3463-11f1-a492-345a601cd3cc' },
    update: {},
    create: {
      id: '43c7e025-3463-11f1-a492-345a601cd3cc',
      name: 'FIPRODEFO State Forest Nursery',
      address: 'Av. Patria 299, Col. Niños Héroes, Guadalajara',
      description: 'State forestry trust producing and distributing native plants (pines, oaks, palo dulce) for reforestation. Serves communities, municipalities, and civil organizations.',
      lat: 20.7100,
      lon: -103.3890,
      schedule: 'Lun-Vie 9am-4pm',
      phone: '+52 33 3030 0440',
    },
  });

  await prisma.nursery.upsert({
    where: { id: 'fe98da66-bf5c-47b7-a642-36ec7bf7d58e' },
    update: {},
    create: {
      id: 'fe98da66-bf5c-47b7-a642-36ec7bf7d58e',
      name: 'OPD Bosque La Primavera',
      address: 'Av. Vallarta 6503, Local E-38, Ciudad Granja, Zapopan',
      description: 'Public agency managing La Primavera protected forest. Runs native plant reforestation drives and environmental education programs open to volunteers.',
      lat: 20.6800,
      lon: -103.4700,
      schedule: 'Lun-Dom 7am-6pm',
      phone: '+52 33 3777 5200',
    },
  });

  console.log('Seed complete.');
  console.log(`  PlantGenetics: 6`);
  console.log(`  Plants: 6 (${plant1.name}, ${plant2.name}, ${plant3.name} , ${plant4.name}, ${plant5.name}, ${plant6.name})`);
  console.log(`  Nurseries: 5`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
