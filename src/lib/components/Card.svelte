<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		actions,
		children,
		class: className = ''
	}: {
		title?: string;
		description?: string;
		actions?: Snippet;
		children: Snippet;
		class?: string;
	} = $props();
</script>

<section class="rounded-lg border border-line bg-surface-raised {className}">
	{#if title || actions}
		<header class="flex flex-wrap items-baseline justify-between gap-3 px-5 pt-4">
			<div>
				{#if title}<h2 class="text-lg font-bold">{title}</h2>{/if}
				{#if description}<p class="mt-0.5 text-sm text-ink-muted">{description}</p>{/if}
			</div>
			{#if actions}<div class="flex gap-2">{@render actions()}</div>{/if}
		</header>
	{/if}
	<div class="p-5">{@render children()}</div>
</section>
