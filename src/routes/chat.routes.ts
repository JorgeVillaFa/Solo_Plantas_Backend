import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { chat } from '../controllers/chat.controller';

const router = Router();

router.post(
  '/',
  authenticate,
  body('message')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('message is required')
    .isLength({ max: 2000 })
    .withMessage('message must be at most 2000 characters'),
  body('conversationId')
    .optional()
    .isUUID()
    .withMessage('conversationId must be a valid UUID'),
  validate,
  chat
);

export default router;
