import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '#lib/domain/markdown.ts';
import { hasImprint, imprintMarkdown, privacyTemplate, type PrivacyFacts } from './legal.ts';

const settings = {
	festivalName: 'Testfest',
	legalName: 'Kulturverein Test e. V.',
	legalAddress: 'Hauptstraße 1\n12345 Musterstadt',
	legalRepresentative: 'Erika Muster (1. Vorsitzende)',
	legalEmail: 'info@example.org',
	legalPhone: '+49 30 123456',
	legalRegister: 'Amtsgericht Musterstadt, VR 1234',
	legalVatId: '',
	imprintExtraDe: '',
	imprintExtraEn: '',
	privacyOfficer: '',
	retentionMonths: 24,
	auditIpDays: 90,
	mapTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
	mcpPersonalData: 'pseudonymous',
	contactEmail: ''
};
const facts: PrivacyFacts = {
	profileFields: ['T-Shirt-Größe'],
	aiAssistants: false,
	qualifications: true,
	mailServer: true,
	today: '1. Juni 2027'
};

describe('legal notice', () => {
	it('needs name and address', () => {
		expect(hasImprint(settings)).toBe(true);
		expect(hasImprint({ ...settings, legalAddress: ' ' })).toBe(false);
	});

	it('lists the operator details', () => {
		const html = renderMarkdown(imprintMarkdown(settings, 'de'));
		expect(html).toContain('§ 5 DDG');
		expect(html).toContain('Hauptstraße 1<br>12345 Musterstadt');
		expect(html).toContain('<a href="mailto:info@example.org">');
		expect(html).not.toContain('Umsatzsteuer');
	});
});

describe('privacy template', () => {
	it('reflects the configuration', () => {
		const de = privacyTemplate(settings, facts, 'de');
		expect(de).toContain('Kulturverein Test e. V.');
		expect(de).toContain('T-Shirt-Größe');
		expect(de).toContain('**24 Monate**');
		expect(de).toContain('tile.openstreetmap.org');
		expect(de).toContain('Widerspruchsrecht');
		expect(de).not.toContain('KI-Assistenten');
		expect(privacyTemplate(settings, { ...facts, aiAssistants: true }, 'de')).toContain(
			'nur gleichbleibende Kürzel'
		);
	});

	it('numbers sections and marks open points', () => {
		const en = privacyTemplate(settings, { ...facts, qualifications: false }, 'en');
		expect(en).toMatch(/^## 1\. Controller/);
		expect(en).not.toContain('Qualifications and proofs');
		expect(en).toContain('[Please complete');
	});
});
