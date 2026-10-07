import type { DB } from '../db/client.ts';
import type { User } from '../db/schema.ts';
import { getCurrentEdition } from '../services/editions.ts';
import { loadAuthz } from '../services/roles.ts';

/** Whether the person may connect and use an AI assistant (checked on every request). */
export async function canUseMcp(db: DB, user: Pick<User, 'id' | 'isAdmin'>): Promise<boolean> {
	if (user.isAdmin) return true;
	const edition = await getCurrentEdition(db);
	if (!edition) return false;
	return (await loadAuthz(db, user, edition.id)).canSomewhere('mcp.use');
}
