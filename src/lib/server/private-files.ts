import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DomainError } from './errors.ts';

/**
 * Private uploads (e.g. qualification proofs). Stored outside the public asset store and only
 * served through routes that check permissions.
 */

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

const dir = (uploadDir: string) => path.join(uploadDir, 'private');

function sniffDocument(bytes: Uint8Array): string | null {
	const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
	if (starts(0x25, 0x50, 0x44, 0x46)) return 'application/pdf';
	if (starts(0x89, 0x50, 0x4e, 0x47)) return 'image/png';
	if (starts(0xff, 0xd8, 0xff)) return 'image/jpeg';
	if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45) return 'image/webp';
	return null;
}

export async function savePrivateDocument(uploadDir: string, file: File) {
	if (file.size > MAX_DOCUMENT_SIZE) throw new DomainError('documentTooLarge', 'document');
	const bytes = new Uint8Array(await file.arrayBuffer());
	const type = sniffDocument(bytes);
	if (!type) throw new DomainError('documentType', 'document');
	const id = crypto.randomUUID();
	await mkdir(dir(uploadDir), { recursive: true, mode: 0o700 });
	await writeFile(path.join(dir(uploadDir), id), bytes, { mode: 0o600 });
	return { id, name: file.name.slice(0, 200) || 'document', type };
}

export async function readPrivateDocument(uploadDir: string, id: string): Promise<Buffer | null> {
	if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
	try {
		return await readFile(path.join(dir(uploadDir), id));
	} catch {
		return null;
	}
}

export async function deletePrivateDocument(uploadDir: string, id: string): Promise<void> {
	if (!/^[0-9a-f-]{36}$/i.test(id)) return;
	await unlink(path.join(dir(uploadDir), id)).catch(() => {});
}
