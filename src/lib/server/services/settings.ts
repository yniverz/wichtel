import { eq } from 'drizzle-orm';
import type { DB, Tx } from '../db/client.ts';
import { instanceSettings, type InstanceSettings } from '../db/schema.ts';
import { audit, diff, type Actor } from '../audit.ts';

export type SettingsUpdate = Partial<Omit<InstanceSettings, 'id' | 'updatedAt' | 'setupTokenHash'>>;

let cache: InstanceSettings | null = null;

/** Loads the singleton settings row, creating it with defaults on first access. */
export async function getSettings(db: Tx): Promise<InstanceSettings> {
	if (cache) return cache;
	const [row] = await db.select().from(instanceSettings).where(eq(instanceSettings.id, 1));
	if (row) return (cache = row);
	const [created] = await db
		.insert(instanceSettings)
		.values({ id: 1 })
		.onConflictDoNothing()
		.returning();
	return (cache = created ?? (await getSettings(db)));
}

export function invalidateSettingsCache(): void {
	cache = null;
}

export async function updateSettings(
	db: DB,
	actor: Actor,
	update: SettingsUpdate
): Promise<InstanceSettings> {
	return db.transaction(async (tx) => {
		const before = await getSettingsUncached(tx);
		const [after] = await tx
			.update(instanceSettings)
			.set(update)
			.where(eq(instanceSettings.id, 1))
			.returning();
		const changes = diff(before, update);
		if (changes)
			await audit(tx, actor, { action: 'settings.update', entityType: 'settings', data: changes });
		invalidateSettingsCache();
		return after;
	});
}

async function getSettingsUncached(tx: Tx): Promise<InstanceSettings> {
	invalidateSettingsCache();
	return getSettings(tx);
}

/** Settings without secrets, safe to send to the browser. */
export type PublicSettings = Omit<InstanceSettings, 'setupTokenHash'>;

export function publicSettings(settings: InstanceSettings): PublicSettings {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { setupTokenHash, ...rest } = settings;
	return rest;
}
