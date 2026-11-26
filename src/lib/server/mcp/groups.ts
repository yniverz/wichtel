/**
 * Tool groups an admin can switch on or off for AI assistants. Reading is always available.
 *
 * Never available to assistants, whatever is switched on: making someone an administrator,
 * deleting accounts, password reset links, changing e-mail addresses or passwords, and the
 * assistant settings themselves (these groups, personal data mode, allowed redirect hosts).
 */
export const MCP_TOOL_GROUPS = [
	'shifts',
	'staffing',
	'structure',
	'mail',
	'points',
	'people',
	'roles',
	'goodies',
	'editions',
	'settings',
	'self'
] as const;
export type McpToolGroup = (typeof MCP_TOOL_GROUPS)[number];

/** How people appear to AI assistants. */
export const PERSONAL_DATA_MODES = ['full', 'names', 'pseudonymous'] as const;
