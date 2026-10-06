import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema.ts';

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;
/** A database handle or an open transaction – both expose the same query API. */
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0] | DB;

export interface Database {
	db: DB;
	migrate(): Promise<void>;
	close(): Promise<void>;
}

const MIGRATIONS_FOLDER = path.resolve(process.cwd(), 'drizzle');

/**
 * Connects to PostgreSQL, or to an embedded PGlite database when the URL starts with `pglite://`
 * (`pglite://memory` for an in-memory database, otherwise a directory path).
 */
export async function connect(url: string): Promise<Database> {
	if (url.startsWith('pglite://')) {
		const target = url.slice('pglite://'.length);
		const { PGlite } = await import('@electric-sql/pglite');
		const { drizzle } = await import('drizzle-orm/pglite');
		const { migrate } = await import('drizzle-orm/pglite/migrator');
		if (target !== 'memory') mkdirSync(target, { recursive: true });
		const client = new PGlite(target === 'memory' ? undefined : target);
		const db = drizzle(client, { schema });
		return {
			db: db as unknown as DB,
			migrate: () => migrate(db, { migrationsFolder: MIGRATIONS_FOLDER }),
			close: () => client.close()
		};
	}

	const { default: postgres } = await import('postgres');
	const { drizzle } = await import('drizzle-orm/postgres-js');
	const { migrate } = await import('drizzle-orm/postgres-js/migrator');
	const client = postgres(url, { max: 10, onnotice: () => {} });
	const db = drizzle(client, { schema });
	return {
		db: db as unknown as DB,
		migrate: () => migrate(db, { migrationsFolder: MIGRATIONS_FOLDER }),
		close: () => client.end()
	};
}
