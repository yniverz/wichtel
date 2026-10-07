/** Tool groups an admin can switch on or off for AI assistants. Reading is always available. */
export const MCP_TOOL_GROUPS = ['shifts', 'staffing', 'structure', 'mail', 'points'] as const;
export type McpToolGroup = (typeof MCP_TOOL_GROUPS)[number];

/** How people appear to AI assistants. */
export const PERSONAL_DATA_MODES = ['full', 'names', 'pseudonymous'] as const;
