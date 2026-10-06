<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		lead,
		back,
		actions
	}: { title: string; lead?: string; back?: { href: string; label: string }; actions?: Snippet } =
		$props();
</script>

<header class="mb-8 border-b border-ink pb-4">
	{#if back}
		<a
			href={back.href}
			class="mb-2 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
		>
			<span aria-hidden="true">←</span>
			{back.label}
		</a>
	{/if}
	<div class="flex flex-wrap items-end justify-between gap-3">
		<h1 class="font-display text-4xl uppercase sm:text-5xl">{title}</h1>
		{#if actions}<div class="flex gap-2">{@render actions()}</div>{/if}
	</div>
	{#if lead}<p class="mt-3 max-w-2xl text-ink-muted">{lead}</p>{/if}
</header>
