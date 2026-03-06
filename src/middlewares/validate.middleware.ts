/**
 * src/middlewares/validate.middleware.ts
 * ===========================
 * express-validator helper middleware.
 *
 * Usage:
 *   import { validate } from '../middlewares/validate.middleware';
 *   import { body } from 'express-validator';
 *
 *   router.post('/register',
 *     body('email').isEmail(),
 *     body('password').isLength({ min: 8 }),
 *     validate,
 *     authController.register
 *   );
 *
 * Automatically returns 422 with a list of field errors
 * if any validation rule fails.
 * ===========================
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Collects express-validator errors and responds with 422 if any exist.
 * Must be placed after all validation chain middlewares in the route.
 */
export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map((e) => ({
        field: e.type === 'field' ? e.path : 'unknown',
        message: e.msg,
      })),
    });
    return;
  }

  next();
}
