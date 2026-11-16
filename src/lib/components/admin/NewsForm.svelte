<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { localized, type MessageKey } from '#lib/i18n/index.ts';
	import type { NewsAudience } from '#lib/domain/news.ts';

	type Named = { id: string; nameDe: string; nameEn: string };
	let {
		action,
		values,
		options,
		errors = {},
		error,
		success,
		withMail = false,
		submitLabel,
		onedit
	}: {
		action: string;
		values: Record<string, string>;
		options: {
			audiences: NewsAudience[];
			areas: (Named & { depth: number })[];
			roles: Named[];
			shift: { id: string; titleDe: string; titleEn: string } | null;
		};
		errors?: Record<string, string>;
		error?: string;
		success?: string;
		/** New posts: offer to e-mail them (on by default). */
		withMail?: boolean;
		submitLabel: string;
		/** Called when the text changes (a counted preview no longer matches). */
		onedit?: () => void;
	} = $props();

	const i18n = getI18n();
	const form = pendingForm({ reset: false });
	// svelte-ignore state_referenced_locally
	let audience = $state(values.audience || options.audiences[0]);
	// svelte-ignore state_referenced_locally
	let pinned = $state(values.pinned === 'on');
	const fieldError = (key: string) => errors[key];
</script>

<form
	method="POST"
	{action}
	class="max-w-2xl space-y-6"
	oninput={() => onedit?.()}
	use:enhance={form.submit}
>
	<FormMessage {error} {success} />

	<fieldset class="space-y-2">
		<legend class="text-sm font-medium">{i18n.t('admin.news.audience')}</legend>
		{#each options.audiences as a (a)}
			<label class="flex items-center gap-3 text-sm">
				<input
					type="radio"
					name="audience"
					value={a}
					bind:group={audience}
					class="size-4 border-ink/40 text-brand focus:ring-brand"
				/>
				{i18n.t(`news.audience.${a}` as MessageKey)}{#if a === 'shift' && options.shift}:
					<strong>{localized(options.shift, 'title', i18n.locale)}</strong>{/if}
			</label>
		{/each}
		{#if options.shift}<input type="hidden" name="shiftId" value={options.shift.id} />{/if}
		{#if audience === 'area'}
			<div class="ml-7 max-w-sm">
				<label class="sr-only" for="areaId">{i18n.t('news.audience.area')}</label>
				<select
					id="areaId"
					name="areaId"
					class="block h-10 w-full text-sm"
					value={values.areaId || options.areas[0]?.id}
				>
					{#each options.areas as a (a.id)}
						<option value={a.id}
							>{'  '.repeat(a.depth)}{a.depth ? '└ ' : ''}{localized(
								a,
								'name',
								i18n.locale
							)}</option
						>
					{/each}
				</select>
			</div>
		{:else if audience === 'role'}
			<div class="ml-7 max-w-sm">
				<label class="sr-only" for="roleId">{i18n.t('news.audience.role')}</label>
				<select
					id="roleId"
					name="roleId"
					class="block h-10 w-full text-sm"
					value={values.roleId || options.roles[0]?.id}
				>
					{#each options.roles as r (r.id)}
						<option value={r.id}>{localized(r, 'name', i18n.locale)}</option>
					{/each}
				</select>
			</div>
		{/if}
		{#if audience === 'public'}<p class="ml-7 text-sm text-ink-muted">
				{i18n.t('admin.news.publicHint')}
			</p>{/if}
	</fieldset>

	<Field
		label={i18n.t('admin.news.titleDe')}
		name="titleDe"
		value={values.titleDe ?? ''}
		error={fieldError('titleDe')}
	/>
	<div class="space-y-1.5">
		<label for="bodyDe" class="text-sm font-medium">{i18n.t('admin.news.bodyDe')}</label>
		<textarea id="bodyDe" name="bodyDe" rows="10" required class="block w-full"
			>{values.bodyDe ?? ''}</textarea
		>
		<p class="text-sm text-ink-muted">{i18n.t('admin.news.markdownHint')}</p>
	</div>
	<details class="space-y-3" open={Boolean(values.titleEn || values.bodyEn)}>
		<summary class="cursor-pointer text-sm font-semibold">{i18n.t('admin.news.english')}</summary>
		<p class="text-sm text-ink-muted">{i18n.t('admin.news.englishHint')}</p>
		<Field
			label={i18n.t('admin.news.titleEn')}
			name="titleEn"
			optional
			value={values.titleEn ?? ''}
		/>
		<div class="space-y-1.5">
			<label for="bodyEn" class="text-sm font-medium">{i18n.t('admin.news.bodyEn')}</label>
			<textarea id="bodyEn" name="bodyEn" rows="10" class="block w-full"
				>{values.bodyEn ?? ''}</textarea
			>
		</div>
	</details>

	<fieldset class="space-y-3">
		<label class="flex items-start gap-3 text-sm"
			><input type="checkbox" name="pinned" bind:checked={pinned} class="mt-0.5 size-4" />
			<span
				>{i18n.t('admin.news.pinned')}
				<span class="block text-ink-muted">{i18n.t('admin.news.pinnedHint')}</span></span
			></label
		>
		{#if pinned}
			<div class="ml-7 max-w-56">
				<Field
					label={i18n.t('admin.news.pinnedUntil')}
					name="pinnedUntil"
					type="date"
					optional
					value={values.pinnedUntil ?? ''}
					error={fieldError('pinnedUntil')}
				/>
			</div>
		{/if}
		{#if withMail}
			<label class="flex items-start gap-3 text-sm"
				><input
					type="checkbox"
					name="sendMail"
					checked={values.sendMail !== ''}
					class="mt-0.5 size-4"
				/>
				<span
					>{i18n.t('admin.news.sendMail')}
					<span class="block text-ink-muted">{i18n.t('admin.news.sendMailHint')}</span></span
				></label
			>
		{/if}
	</fieldset>

	<Button type="submit" loading={form.pending}>{submitLabel}</Button>
</form>
