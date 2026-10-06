import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

/** URL-safe random token with 256 bits of entropy. */
export function randomToken(): string {
	return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

// OWASP recommended argon2id parameters
const ARGON_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
	return hash(password, ARGON_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
	try {
		return await verify(passwordHash, password);
	} catch {
		return false;
	}
}

/** A valid hash to verify against when the user does not exist, to keep timing uniform. */
let dummyHash: Promise<string> | undefined;
export function getDummyHash(): Promise<string> {
	dummyHash ??= hashPassword('dummy-password-for-timing');
	return dummyHash;
}
