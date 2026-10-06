<script lang="ts">
	/** Places as small blocks (like ticket stubs); falls back to a bar for large capacities. */
	let { capacity, taken }: { capacity: number; taken: number } = $props();
	const filled = $derived(Math.min(taken, capacity));
</script>

{#if capacity <= 12}
	<span class="inline-flex gap-0.5" aria-hidden="true">
		{#each Array.from({ length: capacity }, (_, i) => i) as i (i)}
			<span class="h-3 w-2 rounded-[1px] {i < filled ? 'bg-ink' : 'border border-ink/35'}"></span>
		{/each}
	</span>
{:else}
	<span
		class="inline-block h-2 w-20 overflow-hidden rounded-[1px] border border-ink/35"
		aria-hidden="true"
	>
		<span class="block h-full bg-ink" style="width: {(filled / capacity) * 100}%"></span>
	</span>
{/if}
