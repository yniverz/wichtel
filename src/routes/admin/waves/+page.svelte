<script lang="ts">
	import { page } from '$app/state';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import WaveForm from '#lib/components/admin/WaveForm.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDateTime, type MessageKey } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	type Result = {
		action?: string;
		error?: string;
		success?: string;
		errors?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const empty = {
		name: '',
		opensDate: '',
		opensTime: '10:00',
		closesDate: '',
		closesTime: '',
		areaIds: [],
		audience: 'everyone'
	};
	let copied = $state<string | null>(null);
	const tones = { open: 'brand', upcoming: 'warning', closed: 'neutral' } as const;
</script>

<svelte:head
	><title>{i18n.t('admin.waves.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.waves.title')} lead={i18n.t('admin.waves.lead')} />

<div class="max-w-3xl space-y-3">
	{#if data.waves.length === 0}<p class="text-ink-muted">{i18n.t('admin.waves.empty')}</p>{/if}
	{#each data.waves as w (w.id)}
		<details
			class="rounded-md border border-line bg-surface-raised"
			open={result?.action === w.id && !!result.errors}
		>
			<summary class="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
				<span class="font-semibold">{w.name}</span>
				<Badge tone={tones[w.status as keyof typeof tones]}
					>{i18n.t(`admin.waves.status.${w.status}` as MessageKey)}</Badge
				>
				<span class="text-sm text-ink-muted tabular-nums"
					>{formatDateTime(new Date(w.opensAt), i18n.locale, data.timezone)} · {i18n.t(
						`admin.waves.audience.${w.audience}` as MessageKey
					)}</span
				>
			</summary>
			<div class="space-y-5 border-t border-line p-4">
				{#if w.audience === 'invite'}
					<div class="space-y-1.5">
						<p class="text-sm font-medium">{i18n.t('admin.waves.inviteLink')}</p>
						<div class="flex gap-2">
							<input
								readonly
								value={w.inviteUrl}
								class="h-10 min-w-0 flex-1 font-mono text-xs"
								aria-label={i18n.t('admin.waves.inviteLink')}
							/>
							<Button
								size="sm"
								variant="secondary"
								onclick={async () => {
									await navigator.clipboard.writeText(w.inviteUrl);
									copied = w.id;
								}}
							>
								{copied === w.id ? i18n.t('admin.waves.copied') : i18n.t('admin.waves.copy')}
							</Button>
						</div>
					</div>
				{/if}
				<WaveForm
					values={w}
					areas={data.areas}
					result={result?.action === w.id ? result : null}
					submitLabel={i18n.t('common.save')}
				/>
				<ConfirmForm
					action="?/delete"
					hidden={{ id: w.id }}
					message={i18n.t('admin.waves.deleteConfirm', { name: w.name })}
					confirmLabel={i18n.t('common.delete')}
				>
					{i18n.t('common.delete')}
				</ConfirmForm>
			</div>
		</details>
	{/each}
	<details
		class="rounded-md border border-dashed border-line"
		open={data.waves.length === 0 || result?.action === 'new'}
	>
		<summary class="cursor-pointer px-4 py-3 font-semibold text-brand-text"
			>+ {i18n.t('admin.waves.new')}</summary
		>
		<div class="border-t border-line p-4">
			<WaveForm
				values={empty}
				areas={data.areas}
				result={result?.action === 'new' ? result : null}
				submitLabel={i18n.t('common.create')}
			/>
		</div>
	</details>
</div>
