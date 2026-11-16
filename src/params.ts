import { defineParams } from '@sveltejs/kit/params';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const params = defineParams({
	/** Ids in URLs are UUIDs; anything else is a 404 before it reaches the database. */
	uuid: (param) => (UUID.test(param) ? param : undefined)
});
