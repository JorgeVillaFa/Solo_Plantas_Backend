/**
 * src/services/catalog.service.ts
 * ===========================
 * Plant catalog business logic.
 *
 * Handles:
 *   - Listing all plants with owned status per user
 *   - Plant detail + care guide
 *   - L-System seed retrieval
 *   - Climate-based recommendations via OpenWeather API
 * ===========================
 */

import axios from 'axios';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middlewares/error.middleware';

/**
 * Returns all plants with inventory status and whether the user owns each one.
 */
export async function getAllPlants(userId: string) {
  const plants = await prisma.plant.findMany({
    include: {
      inventory: {
        select: { stock: true },
      },
      userPlants: {
        where: { userId },
        select: { owned: true },
      },
    },
    orderBy: { commonName: 'asc' },
  });

  // Flatten owned status into the plant object
  return plants.map((p) => ({
    id: p.id,
    commonName: p.commonName,
    scientificName: p.scientificName,
    priceInCents: p.priceInCents,
    description: p.description,
    illustrationName: p.illustrationName,
    stock: p.inventory?.stock ?? 0,
    owned: p.userPlants[0]?.owned ?? false,
    season: p.season,
    growthType: p.growthType,
    dominantColor: p.dominantColor,
  }));
}

/**
 * Returns full plant detail including care guide for the detail screen.
 */
export async function getPlantById(plantId: string, userId: string) {
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    include: {
      inventory: { select: { stock: true } },
      userPlants: {
        where: { userId },
        select: { owned: true, activatedAt: true },
      },
    },
  });

  if (!plant) {
    throw new AppError('Plant not found', 404);
  }

  return {
    id: plant.id,
    commonName: plant.commonName,
    scientificName: plant.scientificName,
    priceInCents: plant.priceInCents,
    description: plant.description,
    illustrationName: plant.illustrationName,
    ecologicalRole: plant.ecologicalRole,
    tempMin: plant.tempMin,
    tempMax: plant.tempMax,
    season: plant.season,
    careInstructions: plant.careInstructions,
    growthMilestones: plant.growthMilestones,
    riddle: plant.riddle,
    stock: plant.inventory?.stock ?? 0,
    owned: plant.userPlants[0]?.owned ?? false,
    activatedAt: plant.userPlants[0]?.activatedAt ?? null,
  };
}

/**
 * Returns the L-System JSON seed for a plant.
 * Only accessible to users who own the plant.
 */
export async function getPlantSeed(plantId: string, userId: string) {
  // Verify ownership before returning the seed
  const userPlant = await prisma.userPlant.findUnique({
    where: { userId_plantId: { userId, plantId } },
  });

  if (!userPlant?.owned) {
    throw new AppError('Plant not owned. Purchase required to access seed.', 403);
  }

  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    include: { genetics: true },
  });

  if (!plant) {
    throw new AppError('Plant not found', 404);
  }

  return {
    plantId: plant.id,
    seed: JSON.parse(plant.genetics.seedJson),
  };
}

/**
 * Returns plants recommended based on the user's current location (lat/lon).
 * Uses OpenWeather API to get current temperature, then filters by tempMin/tempMax.
 */
export async function getRecommendations(
  userId: string,
  lat: number,
  lon: number
) {
  if (!env.OPENWEATHER_API_KEY) {
    throw new AppError('Climate recommendations not configured', 503);
  }

  // Fetch current temperature from OpenWeather
  const weatherUrl =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${lat}&lon=${lon}&units=metric&appid=${env.OPENWEATHER_API_KEY}`;

  let currentTemp: number;
  try {
    const response = await axios.get<{ main: { temp: number } }>(weatherUrl);
    currentTemp = response.data.main.temp;
  } catch {
    throw new AppError('Could not fetch weather data', 502);
  }

  // Find plants whose temperature range includes the current temp
  const plants = await prisma.plant.findMany({
    where: {
      tempMin: { lte: currentTemp },
      tempMax: { gte: currentTemp },
    },
    include: {
      inventory: { select: { stock: true } },
      userPlants: {
        where: { userId },
        select: { owned: true },
      },
    },
  });

  return {
    currentTemp,
    lat,
    lon,
    recommendations: plants.map((p) => ({
      id: p.id,
      commonName: p.commonName,
      scientificName: p.scientificName,
      priceInCents: p.priceInCents,
      illustrationName: p.illustrationName,
      stock: p.inventory?.stock ?? 0,
      owned: p.userPlants[0]?.owned ?? false,
    })),
  };
}
