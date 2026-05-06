/**
 * src/services/chatbot.service.test.ts
 * =====================================
 * Unit tests for chatbot.service.ts
 *
 * Mocks:
 *   - prisma
 *   - openai
 *   - env
 *
 * NOTE: buildSystemPrompt is private and is exercised indirectly through
 * processMessage. Its correctness is asserted by inspecting the messages
 * array passed to openai.chat.completions.create.
 */

import { processMessage } from '../services/chat.service';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error.middleware';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../config/database', () => ({
    prisma: {
        plant: { findMany: jest.fn() },
        nursery: { findMany: jest.fn() },
        conversation: { findFirst: jest.fn(), create: jest.fn() },
        chatMessage: { createMany: jest.fn() },
    },
}));

jest.mock('../config/env', () => ({
    env: { OPENAI_API_KEY: 'sk-test-fake' },
}));

jest.mock('openai', () => {
    const mockCreate = jest.fn();
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: mockCreate,
            },
        },
    }));
});

// Retrieve the mock after hoisting — instantiating the mocked class
// returns the same mock object the factory registered above
import OpenAI from 'openai';

const mockChatCompletionsCreate = (
    new (OpenAI as jest.MockedClass<typeof OpenAI>)()
).chat.completions.create as jest.Mock;

// ── Typed helpers ──────────────────────────────────────────────────────────

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

// ── Shared fixtures ────────────────────────────────────────────────────────

const USER_ID = '00000000-0000-0000-0000-000000000000';
const CONVERSATION_ID = '00000000-0000-0000-0000-000000000001';
const USER_MESSAGE = 'Which plants do you have?';
const BOT_REPLY = 'We have the following plants:';

const basePlant = {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Agave',
    scientificName: 'Agave tequilana',
    price: 35000,
    priceActive: true,
    description: 'A classic Mexican succulent.',
    ecologicalRole: 'Provides nectar for bats',
    season: 'Blooms Spring-Summer',
    tempMin: 10,
    tempMax: 40,
    growthType: 'wide',
    dominantColor: 'green',
    careInstructions: ['Water monthly', 'Full sun'],
    inventory: { stock: 5 },
};

const baseNursery = {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Vivero Central',
    address: 'Av. Vivero',
    description: 'Our main nursery in Guadalajara.',
    schedule: 'Lun-Vie 9am-6pm',
    phone: '+52 33 1234 5678',
};

const baseConversation = {
    id: CONVERSATION_ID,
    userId: USER_ID,
    messages: [
        { role: 'user', content: 'Hello', createdAt: new Date('2024-01-01T10:00:00Z') },
        { role: 'assistant', content: 'Hi!', createdAt: new Date('2024-01-01T10:00:01Z') },
    ],
};

function mockOpenAiReply(reply: string) {
    mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: reply } }],
    });
}

function setupCatalogMocks() {
    (mockedPrisma.plant.findMany as jest.Mock).mockResolvedValue([basePlant]);
    (mockedPrisma.nursery.findMany as jest.Mock).mockResolvedValue([baseNursery]);
}

// ── processMessage ─────────────────────────────────────────────────────────

describe('processMessage', () => {
    beforeEach(() => {
        setupCatalogMocks();
        mockOpenAiReply(BOT_REPLY);
        (mockedPrisma.chatMessage.createMany as jest.Mock).mockResolvedValue({ count: 2 });
    });

    // ── Conversation resolution ──────────────────────────────────────────────

    describe('conversation resolution', () => {
        it('creates a new conversation when no conversationId is provided', async () => {
            (mockedPrisma.conversation.create as jest.Mock).mockResolvedValue({
                id: CONVERSATION_ID,
                messages: [],
            });

            await processMessage(USER_ID, USER_MESSAGE);

            expect(mockedPrisma.conversation.create).toHaveBeenCalledWith({
                data: { userId: USER_ID },
                include: { messages: true },
            });
        });

        it('returns the new conversationId when creating a conversation', async () => {
            (mockedPrisma.conversation.create as jest.Mock).mockResolvedValue({
                id: CONVERSATION_ID,
                messages: [],
            });

            const result = await processMessage(USER_ID, USER_MESSAGE);

            expect(result.conversationId).toBe(CONVERSATION_ID);
        });

        it('looks up an existing conversation by id and userId', async () => {
            (mockedPrisma.conversation.findFirst as jest.Mock).mockResolvedValue(baseConversation);

            await processMessage(USER_ID, USER_MESSAGE, CONVERSATION_ID);

            expect(mockedPrisma.conversation.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: CONVERSATION_ID, userId: USER_ID },
                })
            );
        });

        it('fetches at most 20 messages from history, ordered newest first', async () => {
            (mockedPrisma.conversation.findFirst as jest.Mock).mockResolvedValue(baseConversation);

            await processMessage(USER_ID, USER_MESSAGE, CONVERSATION_ID);

            expect(mockedPrisma.conversation.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    include: {
                        messages: {
                            orderBy: { createdAt: 'desc' },
                            take: 20,
                        },
                    },
                })
            );
        });

        it('throws 404 AppError when the conversation does not exist or belongs to another user', async () => {
            (mockedPrisma.conversation.findFirst as jest.Mock).mockResolvedValue(null);

            await expect(
                processMessage(USER_ID, USER_MESSAGE, CONVERSATION_ID)
            ).rejects.toThrow(new AppError('Conversation not found', 404));
        });

        it('does not call conversation.create when conversationId is provided', async () => {
            (mockedPrisma.conversation.findFirst as jest.Mock).mockResolvedValue(baseConversation);

            await processMessage(USER_ID, USER_MESSAGE, CONVERSATION_ID);

            expect(mockedPrisma.conversation.create).not.toHaveBeenCalled();
        });
    });

    // ── OpenAI message assembly ──────────────────────────────────────────────

    describe('OpenAI message assembly', () => {
        beforeEach(() => {
            (mockedPrisma.conversation.create as jest.Mock).mockResolvedValue({
                id: CONVERSATION_ID,
                messages: [],
            });
        });

        it('sends a system message as the first entry', async () => {
            await processMessage(USER_ID, USER_MESSAGE);

            const { messages } = mockChatCompletionsCreate.mock.calls[0][0];
            expect(messages[0].role).toBe('system');
            expect(typeof messages[0].content).toBe('string');
            expect(messages[0].content.length).toBeGreaterThan(0);
        });

        it('appends the current user message as the last entry', async () => {
            await processMessage(USER_ID, USER_MESSAGE);

            const { messages } = mockChatCompletionsCreate.mock.calls[0][0];
            const last = messages[messages.length - 1];
            expect(last).toEqual({ role: 'user', content: USER_MESSAGE });
        });

        it('includes conversation history between the system prompt and user message', async () => {
            (mockedPrisma.conversation.findFirst as jest.Mock).mockResolvedValue(baseConversation);

            await processMessage(USER_ID, USER_MESSAGE, CONVERSATION_ID);

            const { messages } = mockChatCompletionsCreate.mock.calls[0][0];
            // [system, ...history, current user message]
            expect(messages).toHaveLength(1 + baseConversation.messages.length + 1);
            expect(messages[1]).toEqual({ role: 'user', content: 'Hello' });
            expect(messages[2]).toEqual({ role: 'assistant', content: 'Hi!' });
        });

        it('sends no history messages when starting a new conversation', async () => {
            await processMessage(USER_ID, USER_MESSAGE);

            const { messages } = mockChatCompletionsCreate.mock.calls[0][0];
            // Only system + current user message
            expect(messages).toHaveLength(2);
        });

        it('calls the OpenAI API with the correct model and parameters', async () => {
            await processMessage(USER_ID, USER_MESSAGE);

            expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'gpt-4o-mini',
                    temperature: 0.5,
                    max_tokens: 600,
                })
            );
        });
    });

    // ── System prompt content ────────────────────────────────────────────────

    describe('system prompt content (via buildSystemPrompt)', () => {
        beforeEach(() => {
            (mockedPrisma.conversation.create as jest.Mock).mockResolvedValue({
                id: CONVERSATION_ID,
                messages: [],
            });
        });

        it('includes the plant name and scientific name in the system prompt', async () => {
            await processMessage(USER_ID, USER_MESSAGE);

            const systemContent = mockChatCompletionsCreate.mock.calls[0][0].messages[0].content;
            expect(systemContent).toContain('Agave');
            expect(systemContent).toContain('Agave tequilana');
        });

        it('converts plant price from cents to pesos in the system prompt', async () => {
            await processMessage(USER_ID, USER_MESSAGE);

            const systemContent = mockChatCompletionsCreate.mock.calls[0][0].messages[0].content;
            expect(systemContent).toContain('350.00');
        });

        it('includes stock availability in the system prompt', async () => {
            await processMessage(USER_ID, USER_MESSAGE);

            const systemContent = mockChatCompletionsCreate.mock.calls[0][0].messages[0].content;
            expect(systemContent).toContain('5 units available');
        });

        it('shows OUT OF STOCK when inventory stock is 0', async () => {
            (mockedPrisma.plant.findMany as jest.Mock).mockResolvedValue([
                { ...basePlant, inventory: { stock: 0 } },
            ]);

            await processMessage(USER_ID, USER_MESSAGE);

            const systemContent = mockChatCompletionsCreate.mock.calls[0][0].messages[0].content;
            expect(systemContent).toContain('OUT OF STOCK');
        });

        it('shows OUT OF STOCK when inventory is null', async () => {
            (mockedPrisma.plant.findMany as jest.Mock).mockResolvedValue([
                { ...basePlant, inventory: null },
            ]);

            await processMessage(USER_ID, USER_MESSAGE);

            const systemContent = mockChatCompletionsCreate.mock.calls[0][0].messages[0].content;
            expect(systemContent).toContain('OUT OF STOCK');
        });

        it('includes nursery name and address in the system prompt', async () => {
            await processMessage(USER_ID, USER_MESSAGE);

            const systemContent = mockChatCompletionsCreate.mock.calls[0][0].messages[0].content;
            expect(systemContent).toContain('Vivero Central');
            expect(systemContent).toContain('Av. Vivero');
        });

        it('fetches plants and nurseries in parallel to build the system prompt', async () => {
            await processMessage(USER_ID, USER_MESSAGE);

            expect(mockedPrisma.plant.findMany).toHaveBeenCalledTimes(1);
            expect(mockedPrisma.nursery.findMany).toHaveBeenCalledTimes(1);
        });

        it('includes care instructions joined by " / " in the system prompt', async () => {
            await processMessage(USER_ID, USER_MESSAGE);

            const systemContent = mockChatCompletionsCreate.mock.calls[0][0].messages[0].content;
            expect(systemContent).toContain('Water monthly / Full sun');
        });

        it('shows N/A for optional plant fields that are null', async () => {
            (mockedPrisma.plant.findMany as jest.Mock).mockResolvedValue([
                { ...basePlant, description: null, ecologicalRole: null, season: null },
            ]);

            await processMessage(USER_ID, USER_MESSAGE);

            const systemContent = mockChatCompletionsCreate.mock.calls[0][0].messages[0].content;
            // Three separate N/A entries for description, ecological role, and season
            const naCount = (systemContent.match(/N\/A/g) ?? []).length;
            expect(naCount).toBeGreaterThanOrEqual(3);
        });
    });

    // ── Reply handling and persistence ──────────────────────────────────────

    describe('reply handling and persistence', () => {
        beforeEach(() => {
            (mockedPrisma.conversation.create as jest.Mock).mockResolvedValue({
                id: CONVERSATION_ID,
                messages: [],
            });
        });

        it('returns the reply from the OpenAI completion', async () => {
            const result = await processMessage(USER_ID, USER_MESSAGE);

            expect(result.reply).toBe(BOT_REPLY);
        });

        it('trims whitespace from the OpenAI reply', async () => {
            mockOpenAiReply('  Hello there!  ');

            const result = await processMessage(USER_ID, USER_MESSAGE);

            expect(result.reply).toBe('Hello there!');
        });

        it('returns an empty string when the OpenAI response has no content', async () => {
            mockChatCompletionsCreate.mockResolvedValue({
                choices: [{ message: { content: null } }],
            });

            const result = await processMessage(USER_ID, USER_MESSAGE);

            expect(result.reply).toBe('');
        });

        it('returns an empty string when choices array is empty', async () => {
            mockChatCompletionsCreate.mockResolvedValue({ choices: [] });

            const result = await processMessage(USER_ID, USER_MESSAGE);

            expect(result.reply).toBe('');
        });

        it('persists both the user message and assistant reply in a single createMany call', async () => {
            await processMessage(USER_ID, USER_MESSAGE);

            expect(mockedPrisma.chatMessage.createMany).toHaveBeenCalledWith({
                data: [
                    { conversationId: CONVERSATION_ID, role: 'user', content: USER_MESSAGE },
                    { conversationId: CONVERSATION_ID, role: 'assistant', content: BOT_REPLY },
                ],
            });
        });

        it('persists the trimmed reply, not raw OpenAI output', async () => {
            mockOpenAiReply('  Trimmed reply  ');

            await processMessage(USER_ID, USER_MESSAGE);

            const persistedData = (mockedPrisma.chatMessage.createMany as jest.Mock).mock.calls[0][0].data;
            const assistantMessage = persistedData.find((d: { role: string }) => d.role === 'assistant');
            expect(assistantMessage.content).toBe('Trimmed reply');
        });

        it('persists messages under the correct conversationId', async () => {
            (mockedPrisma.conversation.findFirst as jest.Mock).mockResolvedValue(baseConversation);

            await processMessage(USER_ID, USER_MESSAGE, CONVERSATION_ID);

            const persistedData = (mockedPrisma.chatMessage.createMany as jest.Mock).mock.calls[0][0].data;
            expect(persistedData.every((d: { conversationId: string }) => d.conversationId === CONVERSATION_ID)).toBe(true);
        });
    });
});