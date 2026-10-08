/**
 * Structured logging. In production every entry is one JSON line (easy to filter with `jq` or to
 * ship to a log system); in development a readable line with `key=value` pairs.
 *
 * Never log personal data or secrets: no e-mail addresses, names, tokens or query strings.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFields = Record<string, unknown>;

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

interface LogConfig {
	level: LogLevel;
	format: 'json' | 'text';
	write: (line: string, level: LogLevel) => void;
}

const config: LogConfig = {
	level: 'info',
	format: process.env.NODE_ENV === 'production' ? 'json' : 'text',
	write: (line, level) =>
		(level === 'error' || level === 'warn' ? console.error : console.log)(line)
};

export function configureLog(update: Partial<LogConfig>) {
	Object.assign(config, update);
}

export function isLogLevel(value: unknown): value is LogLevel {
	return typeof value === 'string' && value in ORDER;
}

/** Errors become plain objects with name, message and stack. */
function serialise(value: unknown): unknown {
	if (value instanceof Error) {
		return { name: value.name, message: value.message, stack: value.stack };
	}
	return value;
}

function textValue(value: unknown): string {
	if (typeof value === 'string') return /[\s"=]/.test(value) ? JSON.stringify(value) : value;
	return JSON.stringify(value);
}

export function formatEntry(
	format: 'json' | 'text',
	time: Date,
	level: LogLevel,
	msg: string,
	fields: LogFields
): string {
	const clean = Object.fromEntries(
		Object.entries(fields)
			.filter(([, v]) => v !== undefined)
			.map(([k, v]) => [k, serialise(v)])
	);
	if (format === 'json') {
		return JSON.stringify({ time: time.toISOString(), level, msg, ...clean });
	}
	// Stack traces and multi-line texts (e.g. a mail in development) follow as indented blocks.
	const blocks: string[] = [];
	const pairs = Object.entries(clean)
		.filter(([k, v]) => {
			if (k === 'err' && fields.err instanceof Error && fields.err.stack) {
				blocks.push(fields.err.stack);
				return false;
			}
			if (typeof v === 'string' && v.includes('\n')) {
				blocks.push(`${k}:\n${v.replace(/^/gm, '  ')}`);
				return false;
			}
			return true;
		})
		.map(([k, v]) => `${k}=${textValue(v)}`)
		.join(' ');
	const clock = time.toISOString().slice(11, 19);
	return [
		`${clock} ${level.toUpperCase().padEnd(5)} ${msg}${pairs ? ` ${pairs}` : ''}`,
		...blocks
	].join('\n');
}

function emit(level: LogLevel, msg: string, fields: LogFields = {}) {
	if (ORDER[level] < ORDER[config.level]) return;
	config.write(formatEntry(config.format, new Date(), level, msg, fields), level);
}

export const log = {
	debug: (msg: string, fields?: LogFields) => emit('debug', msg, fields),
	info: (msg: string, fields?: LogFields) => emit('info', msg, fields),
	warn: (msg: string, fields?: LogFields) => emit('warn', msg, fields),
	error: (msg: string, fields?: LogFields) => emit('error', msg, fields)
};
