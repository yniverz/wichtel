<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { MessageKey } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	type Result = { at?: string; error?: string; success?: string; errors?: Record<string, string> };
	const result = $derived(form as Result | null);
	/** Placeholders some templates offer in addition to the common ones. */
	const extra: Record<string, string> = {
		group_hold: '{person}, {until}',
		swap_offered: '{person}',
		swap_proposed: '{person}, {given}',
		swap_pending: '{person}',
		swap_completed: '{person}',
		swap_declined: '{person}',
		urgent_call: '{position}, {free}, {bonus}, {note}'
	};
</script>

<svelte:head
	><title>{i18n.t('admin.templates.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.templates.title')} lead={i18n.t('admin.templates.lead')} />
<p class="-mt-4 mb-6 text-sm text-ink-muted">{i18n.t('admin.templates.placeholders')}</p>

<div class="max-w-3xl space-y-3">
	{#each data.templates as t (t.key)}
		<details
			class="rounded-md border border-line bg-surface-raised"
			open={result?.at?.startsWith(`${t.key}:`)}
		>
			<summary class="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3">
				<span class="font-semibold">{i18n.t(`admin.templates.key.${t.key}` as MessageKey)}</span>
				{#if t.versions.some((v) => v.customised)}<Badge tone="warning"
						>{i18n.t('admin.templates.customised')}</Badge
					>{/if}
			</summary>
			{#if extra[t.key]}
				<p class="border-t border-line px-4 pt-3 text-sm text-ink-muted">
					{i18n.t('admin.templates.extra', { list: extra[t.key] })}
				</p>
			{/if}
			<div class="grid gap-6 border-t border-line p-4 lg:grid-cols-2">
				{#each t.versions as v (v.locale)}
					{@const at = `${t.key}:${v.locale}`}
					<div class="space-y-3">
						<p class="text-sm font-bold">
							{i18n.t(`locale.${v.locale}`)}{#if v.customised}
								· <span class="font-normal text-ink-muted"
									>{i18n.t('admin.templates.customised')}</span
								>{/if}
						</p>
						{#if result?.at === at}<FormMessage
								error={result.error}
								success={result.success}
							/>{/if}
						<form
							method="POST"
							action="?/save"
							use:enhance={() =>
								async ({ update }) =>
									update({ reset: false })}
							class="space-y-3"
						>
							<input type="hidden" name="key" value={t.key} />
							<input type="hidden" name="locale" value={v.locale} />
							<label class="block space-y-1.5 text-sm font-medium">
								<span>{i18n.t('admin.templates.subject')}</span>
								<input
									type="text"
									name="subject"
									value={v.subject}
									required
									class="block h-10 w-full font-normal"
								/>
							</label>
							<label class="block space-y-1.5 text-sm font-medium">
								<span>{i18n.t('admin.templates.body')}</span>
								<textarea
									name="body"
									rows="10"
									required
									class="block w-full font-mono text-xs font-normal">{v.body}</textarea
								>
							</label>
							<Button type="submit" size="sm">{i18n.t('common.save')}</Button>
						</form>
						{#if v.customised}
							<ConfirmForm
								action="?/reset"
								hidden={{ key: t.key, locale: v.locale }}
								variant="ghost"
								message={i18n.t('admin.templates.resetConfirm')}
								confirmLabel={i18n.t('admin.templates.reset')}
							>
								{i18n.t('admin.templates.reset')}
							</ConfirmForm>
						{/if}
					</div>
				{/each}
			</div>
		</details>
	{/each}
</div>
