/**
 * src/services/catalog.service.test.ts
 * =====================================
 * Unit tests for catalog.service.ts
 *
 * Mocks:
 *   - prisma
 *   - axios
 *   - env
 *   - serializePrice
 */

import axios from 'axios';
import {
    getAllPlants,
    getPlantById,
    getPlantSeed,
    getRecommendations,
} from '../services/catalog.service';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middlewares/error.middleware';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../config/database', () => ({
    prisma: {
        plant: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
        },
        userPlant: {
            findUnique: jest.fn(),
        },
    },
}));

jest.mock('axios');

jest.mock('../config/env', () => ({
    env: { OPENWEATHER_API_KEY: 'test-api-key' },
}));

jest.mock('../utils/price.utils', () => ({
    serializePrice: jest.fn((price: number, active: boolean) =>
        active ? price / 100 : null
    ),
}));

// ── Typed helpers ──────────────────────────────────────────────────────────

const mockedPrisma = prisma;
const mockedAxios = axios as jest.Mocked<typeof axios>;

// ── Shared fixtures ────────────────────────────────────────────────────────

const USER_ID = '00000000-0000-0000-0000-000000000000';
const PLANT_ID = '00000000-0000-0000-0000-000000000001';

const basePlant = {
    id: PLANT_ID,
    name: 'Rosa',
    scientificName: 'Rosa rubiginosa',
    price: 17442,
    priceActive: true,
    description: 'A beautiful flower',
    illustrationName: 'rose.svg',
    season: 'Blooms Spring-Summer',
    growthType: 'balanced',
    dominantColor: '#e63946',
    ecologicalRole: 'It serves as a pollinator attractor',
    tempMin: 5,
    tempMax: 30,
    growthMilestones: [2, 5, 12, 25],
    riddle: 'What has thorns but smells sweet?',
    careInstructions: ['Water weekly', 'Full sun'],
    lsystem: {
        axiom: 'F',
        rules: { F: 'FF' },
        branchAngle: 25,
        baseThickness: 3,
        lengthMultiplier: 1.5,
        leafScale: 1,
        flowerScale: 1,
        stemColor: '#3d2b1f',
        leafColor: '#2d6a4f',
        flowerColor: '#e63946',
        seedJson: JSON.stringify({ seed: 42 }),
    },
    inventory: { stock: 10 },
    userPlants: [{ owned: true, activatedAt: new Date('2024-01-01') }],
};

// ── getAllPlants ────────────────────────────────────────────────────────────

describe('getAllPlants', () => {
    it('returns mapped plants with owned status', async () => {
        (mockedPrisma.plant.findMany as jest.Mock).mockResolvedValue([basePlant]);

        const result = await getAllPlants(USER_ID);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            id: PLANT_ID,
            name: 'Rosa',
            scientificName: 'Rosa rubiginosa',
            stock: 10,
            owned: true,
            season: 'Blooms Spring-Summer',
            growthType: 'balanced',
            dominantColor: '#e63946',
        });
    });

    it('defaults stock to 0 when inventory is null', async () => {
        (mockedPrisma.plant.findMany as jest.Mock).mockResolvedValue([
            { ...basePlant, inventory: null, userPlants: [] },
        ]);

        const result = await getAllPlants(USER_ID);

        expect(result[0].stock).toBe(0);
    });

    it('defaults owned to false when userPlants is empty', async () => {
        (mockedPrisma.plant.findMany as jest.Mock).mockResolvedValue([
            { ...basePlant, userPlants: [] },
        ]);

        const result = await getAllPlants(USER_ID);

        expect(result[0].owned).toBe(false);
    });

    it('filters userPlants by the provided userId', async () => {
        (mockedPrisma.plant.findMany as jest.Mock).mockResolvedValue([]);

        await getAllPlants(USER_ID);

        expect(mockedPrisma.plant.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                include: expect.objectContaining({
                    userPlants: expect.objectContaining({
                        where: { userId: USER_ID },
                    }),
                }),
            })
        );
    });

    it('returns an empty array when there are no plants', async () => {
        (mockedPrisma.plant.findMany as jest.Mock).mockResolvedValue([]);

        const result = await getAllPlants(USER_ID);

        expect(result).toEqual([]);
    });
});

// ── getPlantById ───────────────────────────────────────────────────────────

describe('getPlantById', () => {
    it('returns full plant detail for an existing plant', async () => {
        (mockedPrisma.plant.findUnique as jest.Mock).mockResolvedValue(basePlant);

        const result = await getPlantById(PLANT_ID, USER_ID);

        expect(result).toMatchObject({
            id: PLANT_ID,
            name: 'Rosa',
            ecologicalRole: 'It serves as a pollinator attractor',
            careInstructions: ['Water weekly', 'Full sun'],
            owned: true,
            stock: 10,
        });
        expect(result.lsystem).toMatchObject({
            axiom: 'F',
            rules: { F: 'FF' },
            branchAngle: 25,
        });
    });

    it('includes activatedAt from userPlants', async () => {
        (mockedPrisma.plant.findUnique as jest.Mock).mockResolvedValue(basePlant);

        const result = await getPlantById(PLANT_ID, USER_ID);

        expect(result.activatedAt).toEqual(new Date('2024-01-01'));
    });

    it('sets activatedAt to null when userPlants is empty', async () => {
        (mockedPrisma.plant.findUnique as jest.Mock).mockResolvedValue({
            ...basePlant,
            userPlants: [],
        });

        const result = await getPlantById(PLANT_ID, USER_ID);

        expect(result.activatedAt).toBeNull();
        expect(result.owned).toBe(false);
    });

    it('throws 404 AppError when plant is not found', async () => {
        (mockedPrisma.plant.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(getPlantById('nonexistent', USER_ID)).rejects.toThrow(
            new AppError('Plant not found', 404)
        );
    });

    it('defaults stock to 0 when inventory is null', async () => {
        (mockedPrisma.plant.findUnique as jest.Mock).mockResolvedValue({
            ...basePlant,
            inventory: null,
        });

        const result = await getPlantById(PLANT_ID, USER_ID);

        expect(result.stock).toBe(0);
    });
});

// ── getPlantSeed ───────────────────────────────────────────────────────────

describe('getPlantSeed', () => {
    it('returns parsed seed JSON for an owned plant', async () => {
        (mockedPrisma.userPlant.findUnique as jest.Mock).mockResolvedValue({
            owned: true,
        });
        (mockedPrisma.plant.findUnique as jest.Mock).mockResolvedValue(basePlant);

        const result = await getPlantSeed(PLANT_ID, USER_ID);

        expect(result).toEqual({
            plantId: PLANT_ID,
            seed: { seed: 42 },
        });
    });

    it('throws 403 AppError when the user does not own the plant', async () => {
        (mockedPrisma.userPlant.findUnique as jest.Mock).mockResolvedValue({
            owned: false,
        });

        await expect(getPlantSeed(PLANT_ID, USER_ID)).rejects.toThrow(
            new AppError('Plant not owned. Purchase required to access seed.', 403)
        );
    });

    it('throws 403 AppError when userPlant record does not exist', async () => {
        (mockedPrisma.userPlant.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(getPlantSeed(PLANT_ID, USER_ID)).rejects.toThrow(
            new AppError('Plant not owned. Purchase required to access seed.', 403)
        );
    });

    it('throws 404 AppError when the plant record is missing after ownership check', async () => {
        (mockedPrisma.userPlant.findUnique as jest.Mock).mockResolvedValue({
            owned: true,
        });
        (mockedPrisma.plant.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(getPlantSeed(PLANT_ID, USER_ID)).rejects.toThrow(
            new AppError('Plant not found', 404)
        );
    });

    it('looks up userPlant with the correct composite key', async () => {
        (mockedPrisma.userPlant.findUnique as jest.Mock).mockResolvedValue({
            owned: true,
        });
        (mockedPrisma.plant.findUnique as jest.Mock).mockResolvedValue(basePlant);

        await getPlantSeed(PLANT_ID, USER_ID);

        expect(mockedPrisma.userPlant.findUnique).toHaveBeenCalledWith({
            where: { userId_plantId: { userId: USER_ID, plantId: PLANT_ID } },
        });
    });
});

// ── getRecommendations ─────────────────────────────────────────────────────

describe('getRecommendations', () => {
    const LAT = 48.8566;
    const LON = 2.3522;
    const CURRENT_TEMP = 18;

    beforeEach(() => {
        mockedAxios.get.mockResolvedValue({
            data: { main: { temp: CURRENT_TEMP } },
        });
        (mockedPrisma.plant.findMany as jest.Mock).mockResolvedValue([basePlant]);
    });

    it('returns currentTemp, coordinates, and matched plants', async () => {
        const result = await getRecommendations(USER_ID, LAT, LON);

        expect(result.currentTemp).toBe(CURRENT_TEMP);
        expect(result.lat).toBe(LAT);
        expect(result.lon).toBe(LON);
        expect(result.recommendations).toHaveLength(1);
        expect(result.recommendations[0]).toMatchObject({
            id: PLANT_ID,
            name: 'Rosa',
            stock: 10,
            owned: true,
        });
    });

    it('calls OpenWeather with correct lat, lon, and API key', async () => {
        await getRecommendations(USER_ID, LAT, LON);

        expect(mockedAxios.get).toHaveBeenCalledWith(
            expect.stringContaining(`lat=${LAT}&lon=${LON}`)
        );
        expect(mockedAxios.get).toHaveBeenCalledWith(
            expect.stringContaining(`appid=test-api-key`)
        );
        expect(mockedAxios.get).toHaveBeenCalledWith(
            expect.stringContaining('units=metric')
        );
    });

    it('queries plants filtered by the current temperature range', async () => {
        await getRecommendations(USER_ID, LAT, LON);

        expect(mockedPrisma.plant.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    tempMin: { lte: CURRENT_TEMP },
                    tempMax: { gte: CURRENT_TEMP },
                },
            })
        );
    });

    it('throws 503 AppError when OPENWEATHER_API_KEY is not configured', async () => {
        const originalKey = env.OPENWEATHER_API_KEY;
        (env as Record<string, unknown>).OPENWEATHER_API_KEY = undefined;

        await expect(getRecommendations(USER_ID, LAT, LON)).rejects.toThrow(
            new AppError('Climate recommendations not configured', 503)
        );

        (env as Record<string, unknown>).OPENWEATHER_API_KEY = originalKey;
    });

    it('throws 502 AppError when the OpenWeather request fails', async () => {
        mockedAxios.get.mockRejectedValue(new Error('Network error'));

        await expect(getRecommendations(USER_ID, LAT, LON)).rejects.toThrow(
            new AppError('Could not fetch weather data', 502)
        );
    });

    it('returns an empty recommendations array when no plants match the temperature', async () => {
        (mockedPrisma.plant.findMany as jest.Mock).mockResolvedValue([]);

        const result = await getRecommendations(USER_ID, LAT, LON);

        expect(result.recommendations).toEqual([]);
    });

    it('defaults stock to 0 and owned to false for plants with no inventory/userPlants', async () => {
        (mockedPrisma.plant.findMany as jest.Mock).mockResolvedValue([
            { ...basePlant, inventory: null, userPlants: [] },
        ]);

        const result = await getRecommendations(USER_ID, LAT, LON);

        expect(result.recommendations[0].stock).toBe(0);
        expect(result.recommendations[0].owned).toBe(false);
    });
});