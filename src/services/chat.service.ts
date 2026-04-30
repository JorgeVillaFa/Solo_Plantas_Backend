import OpenAI from 'openai';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middlewares/error.middleware';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// Max turns kept in context to avoid runaway token costs (20 messages = 10 turns)
const MAX_HISTORY_MESSAGES = 20;

async function buildSystemPrompt(): Promise<string> {
  const [plants, nurseries] = await Promise.all([
    prisma.plant.findMany({
      include: { inventory: true },
      orderBy: { name: 'asc' },
    }),
    prisma.nursery.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const plantList = plants
    .map((p) => {
      const stock = p.inventory?.stock ?? 0;
      const priceMXN = (p.price / 100).toFixed(2);
      const available = stock > 0 ? `${stock} units available` : 'OUT OF STOCK';
      return [
        `• ${p.name} (${p.scientificName}) — $${priceMXN} MXN — ${available}`,
        `  Description: ${p.description ?? 'N/A'}`,
        `  Ecological role: ${p.ecologicalRole ?? 'N/A'}`,
        `  Blooming season: ${p.season ?? 'N/A'}`,
        `  Ideal temperature: ${p.tempMin}°C – ${p.tempMax}°C`,
        `  Growth type: ${p.growthType ?? 'N/A'} | Dominant color: ${p.dominantColor ?? 'N/A'}`,
        `  Care instructions: ${Array.isArray(p.careInstructions) ? (p.careInstructions as string[]).join(' / ') : 'N/A'}`,
      ].join('\n');
    })
    .join('\n\n');

  const nurseryList = nurseries
    .map((n) =>
      [
        `• ${n.name}`,
        `  Address: ${n.address}`,
        `  Description: ${n.description}`,
        `  Schedule: ${n.schedule ?? 'N/A'}`,
        `  Phone: ${n.phone ?? 'N/A'}`,
      ].join('\n')
    )
    .join('\n\n');

  return `You are SolBot, the friendly in-app assistant for Solo Plantas — a native iOS app where users in Guadalajara, Mexico can discover, purchase, and track the growth of beautiful Mexican native plants.

## Your role
Help users with questions about:
- The plant catalog: descriptions, care instructions, ecological roles, current prices, and stock availability
- How the app works: adding plants to cart, placing orders, payment via Stripe, shipping vs. pickup, QR code activation
- Pickup nurseries: locations, schedules, and contact information
- Plant care tips after purchase, based only on the care instructions listed in the catalog

## Strict topic rules
- ONLY answer questions that are directly related to Solo Plantas, its plant catalog, its nurseries, its orders/payments, or how the app works
- If the user asks ANYTHING outside of those topics (general plant science, unrelated recommendations, news, cooking, coding, etc.), politely explain that you can only help with Solo Plantas topics and suggest a relevant question they could ask
- Never fabricate or estimate data not present in the catalog below — always refer users to the app for up-to-date information

## Tone and format
- Be warm, concise, and helpful — like a knowledgeable plant guide at a nursery
- Always respond in the SAME LANGUAGE the user wrote in (Spanish if they write in Spanish, English if English, etc.)
- Keep responses short and scannable; use bullet points when listing multiple items
- Prices are in Mexican Pesos (MXN). All catalog values are already formatted below

## Live Plant Catalog (current as of this request)
${plantList}

## Pickup Nurseries
${nurseryList}

## App features summary
- Cart: users can reserve plants for up to 10 minutes while they complete checkout
- Payment: processed securely via Stripe (credit/debit card). Prices shown in MXN
- Shipping: home delivery for $99 MXN, or free pickup at any listed nursery
- Orders: users can view their order history and current status (pending → confirmed → shipped → delivered → activated)
- Plant activation: each purchased plant comes with a QR code. Scanning it unlocks a live 3D L-System growth animation inside the app
- Recommendations: the app can suggest climate-appropriate plants based on the user's current GPS location`;
}

export async function processMessage(
  userId: string,
  message: string,
  conversationId?: string
): Promise<{ reply: string; conversationId: string }> {
  // Resolve or create conversation, verifying ownership
  let conversation: { id: string; messages: { role: string; content: string }[] };

  if (conversationId) {
    const found = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: MAX_HISTORY_MESSAGES,
        },
      },
    });
    if (!found) throw new AppError('Conversation not found', 404);
    // Reverse to chronological order for the prompt
    found.messages.reverse();
    conversation = found;
  } else {
    const created = await prisma.conversation.create({
      data: { userId },
      include: { messages: true },
    });
    conversation = created;
  }

  const [systemPrompt] = await Promise.all([buildSystemPrompt()]);

  const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversation.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: openAiMessages,
    temperature: 0.5,
    max_tokens: 600,
  });

  const reply = completion.choices[0]?.message?.content?.trim() ?? '';

  // Persist both turns atomically
  await prisma.chatMessage.createMany({
    data: [
      { conversationId: conversation.id, role: 'user', content: message },
      { conversationId: conversation.id, role: 'assistant', content: reply },
    ],
  });

  return { reply, conversationId: conversation.id };
}
