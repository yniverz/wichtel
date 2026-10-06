/**
 * An expected, user-facing failure of a service operation. `code` maps to the message key
 * `error.<code>` so the UI can show a translated explanation.
 */
export class DomainError extends Error {
	constructor(
		readonly code: string,
		readonly field?: string
	) {
		super(code);
		this.name = 'DomainError';
	}
}

export function isDomainError(e: unknown): e is DomainError {
	return e instanceof DomainError;
}
