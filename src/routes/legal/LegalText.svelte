<script lang="ts">
	import RichText from '#lib/components/RichText.svelte';

	/** Renders admin-written Markdown (already converted to safe HTML on the server). */
	let { title, html }: { title: string; html: string } = $props();
</script>

<article>
	<h1 class="font-display border-b-2 border-ink pb-3 text-5xl uppercase">{title}</h1>
	<RichText {html} class="mt-6 max-w-prose" />
</article>
