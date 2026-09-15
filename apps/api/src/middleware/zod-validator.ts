import { type Context, type Next } from 'hono';
import { type ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    let rawBody: any;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON payload' }, 400);
    }

    const parseResult = schema.safeParse(rawBody);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));

      return c.json(
        {
          error: 'Validation Error',
          message: issues.length > 0 ? issues[0].message : 'Invalid request payload',
          issues,
        },
        400
      );
    }

    c.set('validatedBody', parseResult.data);
    return next();
  };
}

export function getValidatedBody<T>(c: Context | any): T {
  return (c as any).get('validatedBody') as T;
}
