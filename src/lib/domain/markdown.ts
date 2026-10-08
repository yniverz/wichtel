/**
 * A deliberately small Markdown subset for admin-written texts (legal notice, privacy policy):
 * headings (#, ##, ###), paragraphs, line breaks, bullet and numbered lists, **bold**, *italic*,
 * links [text](https://…) and bare https/mailto links. Everything else is escaped, so the output
 * is safe to insert as HTML.
 */

const escapeHtml = (s: string) =>
	s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i;
/** Browsers read `\` as `/` and drop control characters, which could turn `/\x` into `//x`. */
// eslint-disable-next-line no-control-regex
const isSafeUrl = (url: string) => SAFE_URL.test(url) && !/[\\\u0000-\u001f\u007f]/.test(url);

function inline(text: string): string {
	// Links first, on the raw text, so that their URLs are escaped exactly once.
	const parts: string[] = [];
	const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?])/g;
	let last = 0;
	for (const m of text.matchAll(pattern)) {
		parts.push(emphasis(escapeHtml(text.slice(last, m.index))));
		const [whole, label, href, bare] = m;
		const url = href ?? bare;
		if (isSafeUrl(url)) {
			const external = /^https?:/i.test(url) ? ' rel="noopener noreferrer"' : '';
			parts.push(
				`<a href="${escapeHtml(url)}"${external}>${label ? emphasis(escapeHtml(label)) : escapeHtml(url)}</a>`
			);
		} else {
			parts.push(escapeHtml(whole));
		}
		last = m.index + whole.length;
	}
	parts.push(emphasis(escapeHtml(text.slice(last))));
	return parts.join('');
}

function emphasis(html: string): string {
	return html
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/(^|[^*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, '$1<em>$2</em>');
}

export function renderMarkdown(source: string): string {
	const lines = source.replace(/\r\n?/g, '\n').split('\n');
	const out: string[] = [];
	let paragraph: string[] = [];
	let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;

	const flushParagraph = () => {
		if (paragraph.length) out.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);
		paragraph = [];
	};
	const flushList = () => {
		if (list)
			out.push(`<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join('')}</${list.tag}>`);
		list = null;
	};

	for (const raw of lines) {
		const line = raw.trimEnd();
		const heading = /^(#{1,3})\s+(.*)$/.exec(line);
		const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
		const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
		if (line.trim() === '') {
			flushParagraph();
			flushList();
		} else if (heading) {
			flushParagraph();
			flushList();
			// Page title is h1, so texts start at h2.
			const level = heading[1].length + 1;
			out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
		} else if (bullet || numbered) {
			flushParagraph();
			const tag = bullet ? 'ul' : 'ol';
			if (list && list.tag !== tag) flushList();
			list ??= { tag, items: [] };
			list.items.push(inline((bullet ?? numbered)![1]));
		} else if (list && /^\s{2,}\S/.test(raw)) {
			// Indented continuation of a list item.
			list.items[list.items.length - 1] += `<br>${inline(line.trim())}`;
		} else {
			flushList();
			paragraph.push(line.trim());
		}
	}
	flushParagraph();
	flushList();
	return out.join('\n');
}
