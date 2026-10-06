<script lang="ts">
	import { getI18n } from '#lib/i18n/context.ts';

	/** Search-as-you-type person selection; submits the chosen id as `name`. */
	let { name = 'userId', label }: { name?: string; label: string } = $props();
	const i18n = getI18n();

	type Person = { id: string; name: string; email: string | null };
	let query = $state('');
	let results = $state<Person[]>([]);
	let selected = $state<Person | null>(null);
	let active = $state(0);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let controller: AbortController | undefined;
	const listId = `picker-${Math.random().toString(36).slice(2)}`;

	function search() {
		clearTimeout(timer);
		selected = null;
		timer = setTimeout(async () => {
			controller?.abort();
			controller = new AbortController();
			if (query.trim().length < 2) return (results = []);
			try {
				const res = await fetch(`/admin/people/search?q=${encodeURIComponent(query)}`, {
					signal: controller.signal
				});
				results = res.ok ? await res.json() : [];
				active = 0;
			} catch {
				// aborted by a newer search
			}
		}, 200);
	}

	function choose(p: Person) {
		selected = p;
		query = p.name;
		results = [];
	}

	function onkeydown(e: KeyboardEvent) {
		if (!results.length) return;
		if (e.key === 'ArrowDown') {
			active = (active + 1) % results.length;
		} else if (e.key === 'ArrowUp') {
			active = (active - 1 + results.length) % results.length;
		} else if (e.key === 'Enter') {
			choose(results[active]);
		} else if (e.key === 'Escape') {
			results = [];
			return;
		} else {
			return;
		}
		e.preventDefault();
	}
</script>

<div class="relative space-y-1">
	<label for="{listId}-input" class="text-xs font-medium">{label}</label>
	<input
		id="{listId}-input"
		type="search"
		autocomplete="off"
		role="combobox"
		aria-expanded={results.length > 0}
		aria-controls={listId}
		aria-autocomplete="list"
		placeholder={i18n.t('admin.shifts.searchPerson')}
		bind:value={query}
		oninput={search}
		{onkeydown}
		class="block h-10 w-full"
	/>
	<input type="hidden" {name} value={selected?.id ?? ''} />
	{#if results.length}
		<ul
			id={listId}
			role="listbox"
			class="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-md border border-ink/20 bg-surface-raised py-1 shadow-[0_12px_30px_-12px_rgb(0_0_0/0.4)]"
		>
			{#each results as p, i (p.id)}
				<li role="option" aria-selected={i === active}>
					<button
						type="button"
						class="block w-full px-3 py-2 text-left text-sm {i === active ? 'bg-ink/8' : ''}"
						onmouseenter={() => (active = i)}
						onclick={() => choose(p)}
					>
						<span class="font-semibold">{p.name}</span>
						{#if p.email}<span class="block text-xs text-ink-muted">{p.email}</span>{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
