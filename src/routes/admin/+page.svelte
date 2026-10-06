<script lang="ts">
	import { page } from '$app/state';
	import Card from '#lib/components/Card.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { MessageKey } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();

	const stats = $derived([
		{ label: 'admin.overview.users', value: data.stats.users },
		{ label: 'admin.overview.areas', value: data.stats.areas },
		{ label: 'admin.overview.assignments', value: data.stats.assignments }
	] satisfies { label: MessageKey; value: number }[]);

	const steps = $derived([
		{
			done: data.steps.branding,
			label: 'admin.overview.step.branding',
			href: '/admin/settings',
			show: page.data.access.isAdmin
		},
		{
			done: data.steps.areas,
			label: 'admin.overview.step.areas',
			href: '/admin/areas',
			show: page.data.access.areas
		},
		{
			done: data.steps.roles,
			label: 'admin.overview.step.roles',
			href: '/admin/people',
			show: page.data.access.people
		}
	] satisfies { done: boolean; label: MessageKey; href: string; show: boolean }[]);
</script>

<svelte:head><title>{i18n.t('admin.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader
	title={i18n.t('admin.title')}
	lead={i18n.t('admin.overview.lead', { festival: page.data.settings.festivalName })}
/>

<dl class="flex flex-wrap gap-x-12 gap-y-4">
	{#each stats as stat (stat.label)}
		<div>
			<dt class="text-sm text-ink-muted">{i18n.t(stat.label)}</dt>
			<dd class="font-display text-6xl tabular-nums">{stat.value}</dd>
		</div>
	{/each}
</dl>

<Card title={i18n.t('admin.overview.nextSteps')} class="mt-6">
	<ul class="divide-y divide-line">
		{#each steps.filter((s) => s.show) as step (step.href)}
			<li>
				<a href={step.href} class="flex items-center gap-3 py-3 hover:underline">
					<span
						class="grid size-5 shrink-0 place-items-center rounded-sm text-xs font-bold {step.done
							? 'bg-ink text-surface'
							: 'border-2 border-ink/30'}"
						aria-hidden="true">{step.done ? '✓' : ''}</span
					>
					<span class={step.done ? 'text-ink-muted line-through' : ''}>{i18n.t(step.label)}</span>
					<span class="ml-auto text-ink-muted" aria-hidden="true">→</span>
				</a>
			</li>
		{/each}
	</ul>
</Card>
