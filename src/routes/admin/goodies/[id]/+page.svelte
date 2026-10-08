<script lang="ts">
	import { page } from '$app/state';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import GoodieForm from '#lib/components/admin/GoodieForm.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDate, localized, type MessageKey } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const title = $derived(localized(data.goodie, 'name', i18n.locale));
	type Result = { error?: string; success?: string; errors?: Record<string, string> };
	const result = $derived(form as Result | null);
</script>

<svelte:head><title>{title} · {page.data.settings.festivalName}</title></svelte:head>

<PageHeader {title} back={{ href: '/admin/goodies', label: i18n.t('admin.goodies.title') }} />

<div class="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
	<section aria-labelledby="edit">
		<h2 id="edit" class="sr-only">{i18n.t('admin.goodies.edit')}</h2>
		<GoodieForm
			action="?/update"
			values={data.goodie}
			areas={data.areas}
			places={data.places}
			result={result?.errors || result?.success ? result : null}
			submitLabel={i18n.t('common.save')}
		/>
		<div class="mt-10 space-y-3 border-t border-line pt-6">
			{#if result?.error && Object.keys(result.errors ?? {}).length === 0}<FormMessage
					error={result.error}
				/>{/if}
			<ConfirmForm
				action="?/delete"
				message={i18n.t('admin.goodies.deleteConfirm', { name: title })}
				confirmLabel={i18n.t('common.delete')}
			>
				{i18n.t('common.delete')}
			</ConfirmForm>
		</div>
	</section>

	<section aria-labelledby="claims">
		<h2 id="claims" class="border-b-2 border-ink pb-1 text-sm font-bold">
			{i18n.t('admin.goodies.claims')}
		</h2>
		{#if data.claims.length === 0}
			<p class="py-3 text-sm text-ink-muted">{i18n.t('admin.goodies.claimsEmpty')}</p>
		{:else}
			<ul class="divide-y divide-line">
				{#each data.claims as c (c.id)}
					<li class="flex items-baseline justify-between gap-3 py-2 text-sm">
						<a href="/admin/desk/{c.userId}" class="font-semibold hover:underline">
							{c.lastName}, {c.firstName}{#if c.variant}<span class="font-normal text-ink-muted">
									· {c.variant}</span
								>{/if}
						</a>
						<span class="text-right text-ink-muted">
							{i18n.t(`admin.goodies.status.${c.status}` as MessageKey)}
							{#if c.issuedAt}<span class="block text-xs"
									>{formatDate(new Date(c.issuedAt), i18n.locale)}</span
								>{/if}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
