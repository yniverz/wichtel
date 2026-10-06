import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import type { DB } from '../db/client.ts';
import { assets } from '../db/schema.ts';
import { DomainError } from '../errors.ts';

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const IMAGE_TYPES: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
	'image/svg+xml': 'svg',
	'image/x-icon': 'ico',
	'image/vnd.microsoft.icon': 'ico'
};

/** Checks the first bytes so a renamed file cannot pretend to be an image. */
function sniffImage(bytes: Uint8Array, declared: string): string | null {
	const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
	if (starts(0x89, 0x50, 0x4e, 0x47)) return 'image/png';
	if (starts(0xff, 0xd8, 0xff)) return 'image/jpeg';
	if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45) return 'image/webp';
	if (starts(0x00, 0x00, 0x01, 0x00)) return 'image/x-icon';
	if (declared === 'image/svg+xml') {
		const head = new TextDecoder().decode(bytes.slice(0, 1024)).toLowerCase();
		if (head.includes('<svg')) return 'image/svg+xml';
	}
	return null;
}

export async function storeImage(
	db: DB,
	uploadDir: string,
	file: File,
	userId: string | null
): Promise<string> {
	if (file.size > MAX_IMAGE_SIZE) throw new DomainError('fileTooLarge');
	const bytes = new Uint8Array(await file.arrayBuffer());
	const mimeType = sniffImage(bytes, file.type);
	if (!mimeType || !IMAGE_TYPES[mimeType]) throw new DomainError('fileType');

	const [asset] = await db
		.insert(assets)
		.values({ filename: file.name.slice(0, 200), mimeType, size: bytes.length, createdBy: userId })
		.returning();
	await mkdir(uploadDir, { recursive: true });
	await writeFile(path.join(uploadDir, asset.id), bytes);
	return asset.id;
}

export async function readAsset(
	db: DB,
	uploadDir: string,
	id: string
): Promise<{ mimeType: string; body: Buffer } | null> {
	const [asset] = await db.select().from(assets).where(eq(assets.id, id));
	if (!asset) return null;
	try {
		return { mimeType: asset.mimeType, body: await readFile(path.join(uploadDir, asset.id)) };
	} catch {
		return null;
	}
}

export async function deleteAsset(db: DB, uploadDir: string, id: string): Promise<void> {
	await db.delete(assets).where(eq(assets.id, id));
	await unlink(path.join(uploadDir, id)).catch(() => {});
}
