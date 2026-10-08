import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown.ts';

describe('renderMarkdown', () => {
	it('renders headings, paragraphs and line breaks', () => {
		expect(renderMarkdown('# Title\n\nFirst line\nsecond line')).toBe(
			'<h2>Title</h2>\n<p>First line<br>second line</p>'
		);
	});

	it('renders bullet and numbered lists', () => {
		expect(renderMarkdown('- a\n- b\n\n1. one\n2. two')).toBe(
			'<ul><li>a</li><li>b</li></ul>\n<ol><li>one</li><li>two</li></ol>'
		);
	});

	it('continues list items on indented lines', () => {
		expect(renderMarkdown('- a\n  more')).toBe('<ul><li>a<br>more</li></ul>');
	});

	it('renders emphasis and links', () => {
		expect(renderMarkdown('**bold** and *it* [site](https://example.org)')).toBe(
			'<p><strong>bold</strong> and <em>it</em> <a href="https://example.org" rel="noopener noreferrer">site</a></p>'
		);
		expect(renderMarkdown('Mail: [us](mailto:a@b.de), see https://x.de/a.')).toBe(
			'<p>Mail: <a href="mailto:a@b.de">us</a>, see <a href="https://x.de/a" rel="noopener noreferrer">https://x.de/a</a>.</p>'
		);
	});

	it('escapes HTML and refuses unsafe links', () => {
		expect(renderMarkdown('<script>alert(1)</script>')).toBe(
			'<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'
		);
		expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('href');
		expect(renderMarkdown('[x](/\\evil.example)')).not.toContain('href');
		expect(renderMarkdown('[x](//evil.example)')).not.toContain('href');
		expect(renderMarkdown('[x](https://a.de/"onmouseover=")')).not.toContain('" onmouseover');
	});

	it('leaves multiplication stars alone', () => {
		expect(renderMarkdown('2 * 3 * 4')).toBe('<p>2 * 3 * 4</p>');
	});
});
