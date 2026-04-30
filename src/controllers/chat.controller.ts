import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/response.utils';
import * as chatService from '../services/chat.service';

/**
 * POST /api/v1/chat
 * Sends a message to SolBot and returns the assistant reply.
 * Manages multi-turn conversation history server-side.
 */
export async function chat(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { message, conversationId } = req.body as {
      message: string;
      conversationId?: string;
    };

    const result = await chatService.processMessage(userId, message, conversationId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
