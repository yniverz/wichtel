import { connect, type Database } from '../db/client.ts';
import { invalidateSettingsCache } from '../services/settings.ts';

/** Fresh in-memory PostgreSQL (PGlite) with all migrations applied. */
export async function createTestDatabase(): Promise<Database> {
	invalidateSettingsCache();
	const database = await connect('pglite://memory');
	await database.migrate();
	return database;
}
