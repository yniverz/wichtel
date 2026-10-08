<script lang="ts">
	/** Renders admin-written Markdown (already converted to safe HTML on the server). */
	let { title, html }: { title: string; html: string } = $props();
</script>

<article>
	<h1 class="font-display border-b-2 border-ink pb-3 text-5xl uppercase">{title}</h1>
	<div class="legal mt-6 max-w-prose">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html html}
	</div>
</article>

<style>
	.legal :global(h2) {
		margin-top: 2.25rem;
		font-size: 1.25rem;
		font-weight: 700;
	}
	.legal :global(h3) {
		margin-top: 1.5rem;
		font-weight: 700;
	}
	.legal :global(p),
	.legal :global(ul),
	.legal :global(ol) {
		margin-top: 0.75rem;
		line-height: 1.6;
	}
	.legal :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
	}
	.legal :global(ol) {
		list-style: decimal;
		padding-left: 1.25rem;
	}
	.legal :global(li + li) {
		margin-top: 0.35rem;
	}
	.legal :global(a) {
		color: var(--color-brand-text, inherit);
		text-decoration: underline;
		overflow-wrap: anywhere;
	}
	.legal :global(code) {
		font-family: ui-monospace, monospace;
		font-size: 0.9em;
	}
</style>
