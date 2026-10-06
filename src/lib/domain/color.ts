const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
	return HEX.test(value);
}

export function normalizeHex(value: string): string {
	const v = value.trim().toLowerCase();
	if (!HEX.test(v)) throw new Error(`Invalid color: ${value}`);
	if (v.length === 4) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
	return v;
}

function channel(c: number): number {
	const s = c / 255;
	return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance (0–1). */
export function luminance(hex: string): number {
	const v = normalizeHex(hex);
	const r = parseInt(v.slice(1, 3), 16);
	const g = parseInt(v.slice(3, 5), 16);
	const b = parseInt(v.slice(5, 7), 16);
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two colors (1–21). */
export function contrastRatio(a: string, b: string): number {
	const la = luminance(a);
	const lb = luminance(b);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Text color (black or white) that reads best on the given background. */
export function readableTextColor(background: string): '#ffffff' | '#1d1b17' {
	return contrastRatio(background, '#ffffff') >= contrastRatio(background, '#1d1b17')
		? '#ffffff'
		: '#1d1b17';
}

/** WCAG AA for normal text. */
export const MIN_CONTRAST = 4.5;
