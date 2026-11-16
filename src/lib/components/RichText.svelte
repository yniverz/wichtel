<script lang="ts">
	/** Admin-written Markdown, already converted to safe HTML on the server (`renderMarkdown`). */
	let { html, class: className = '' }: { html: string; class?: string } = $props();
</script>

<div class="rich {className}">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html html}
</div>

<style>
	.rich :global(h2) {
		margin-top: 2.25rem;
		font-size: 1.25rem;
		font-weight: 700;
	}
	.rich :global(h3) {
		margin-top: 1.5rem;
		font-weight: 700;
	}
	.rich :global(p),
	.rich :global(ul),
	.rich :global(ol) {
		margin-top: 0.75rem;
		line-height: 1.6;
	}
	.rich :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
	}
	.rich :global(ol) {
		list-style: decimal;
		padding-left: 1.25rem;
	}
	.rich :global(li + li) {
		margin-top: 0.35rem;
	}
	.rich :global(a) {
		color: var(--color-brand-text, inherit);
		text-decoration: underline;
		overflow-wrap: anywhere;
	}
	.rich :global(code) {
		font-family: ui-monospace, monospace;
		font-size: 0.9em;
	}
	.rich > :global(:first-child) {
		margin-top: 0;
	}
</style>
