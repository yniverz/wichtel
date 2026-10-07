<script lang="ts">
	import { page } from '$app/state';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatPoints, localized, type MessageKey } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
	const statuses = ['selected', 'issued', 'refund_pending', 'refunded'] as const;
	const handedOut = (s: Partial<Record<string, number>>) => (s.issued ?? 0) + (s.refunded ?? 0);
</script>

<svelte:head
	><title>{i18n.t('admin.goodies.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.goodies.title')} lead={i18n.t('admin.goodies.lead')}>
	{#snippet actions()}<Button href="/admin/goodies/new">{i18n.t('admin.goodies.new')}</Button
		>{/snippet}
</PageHeader>

{#if data.goodies.length === 0}
	<p class="text-ink-muted">{i18n.t('admin.goodies.empty')}</p>
{:else}
	<ul class="divide-y divide-line border-y border-line">
		{#each data.goodies as g (g.id)}
			<li>
				<a
					href="/admin/goodies/{g.id}"
					class="grid gap-2 py-4 hover:bg-ink/3 sm:grid-cols-[1fr_auto]"
				>
					<div>
						<p class="flex flex-wrap items-center gap-2 font-bold">
							{localized(g, 'name', i18n.locale)}
							{#if g.mandatory}<Badge tone="brand">{i18n.t('admin.goodies.mandatoryBadge')}</Badge
								>{/if}
							{#if !g.active}<Badge>{i18n.t('admin.goodies.inactive')}</Badge>{/if}
						</p>
						<p class="mt-1 flex flex-wrap gap-x-4 text-sm text-ink-muted tabular-nums">
							<span>{formatPoints(g.price, i18n.t)}</span>
							{#if g.selfServiceLimit !== null}
								<span
									>{i18n.t('admin.goodies.contingent', {
										used:
											(g.stats.selected ?? 0) + handedOut(g.stats) + (g.stats.refund_pending ?? 0),
										limit: g.selfServiceLimit
									})}</span
								>
							{/if}
							{#if g.stock !== null}<span
									>{i18n.t('admin.goodies.stockLeft', {
										count: g.stock - handedOut(g.stats)
									})}</span
								>{/if}
						</p>
					</div>
					<dl class="flex gap-5 text-sm">
						{#each statuses as s (s)}
							<div class="text-right">
								<dt class="text-xs text-ink-muted">
									{i18n.t(`admin.goodies.status.${s}` as MessageKey)}
								</dt>
								<dd class="font-display text-2xl tabular-nums">{g.stats[s] ?? 0}</dd>
							</div>
						{/each}
					</dl>
				</a>
			</li>
		{/each}
	</ul>
{/if}
