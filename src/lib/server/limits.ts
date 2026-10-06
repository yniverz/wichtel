import { RateLimiter } from './rate-limit.ts';

const MINUTE = 60 * 1000;

/** Login attempts per IP + e-mail. */
export const loginLimiter = new RateLimiter(10, 15 * MINUTE);
/** Registrations per IP. */
export const registerLimiter = new RateLimiter(10, 60 * MINUTE);
/** E-mails triggered by a user (reset, resend verification) per IP + address. */
export const mailLimiter = new RateLimiter(5, 60 * MINUTE);
