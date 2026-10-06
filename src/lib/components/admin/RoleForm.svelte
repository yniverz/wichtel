<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import { PERMISSION_GROUPS } from '#lib/domain/permissions.ts';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { MessageKey } from '#lib/i18n/index.ts';

	let {
		action,
		values,
		permissions,
		result,
		submitLabel
	}: {
		action: string;
		values: { nameDe: string; nameEn: string; descriptionDe: string; descriptionEn: string };
		permissions: readonly string[];
		result?: { error?: string; success?: string; errors?: Record<string, string> } | null;
		submitLabel: string;
	} = $props();

	const i18n = getI18n();
	const submitter = pendingForm({ reset: false });
</script>

<form method="POST" {action} class="space-y-6" use:enhance={submitter.submit}>
	<FormMessage error={result?.error} success={result?.success} />
	<div class="grid gap-4 sm:grid-cols-2">
		<Field
			label={i18n.t('admin.roles.nameDe')}
			name="nameDe"
			value={values.nameDe}
			error={result?.errors?.nameDe}
		/>
		<Field
			label={i18n.t('admin.roles.nameEn')}
			name="nameEn"
			optional
			value={values.nameEn}
			error={result?.errors?.nameEn}
		/>
		<Field
			label={i18n.t('admin.roles.descriptionDe')}
			name="descriptionDe"
			optional
			value={values.descriptionDe}
		/>
		<Field
			label={i18n.t('admin.roles.descriptionEn')}
			name="descriptionEn"
			optional
			value={values.descriptionEn}
		/>
	</div>

	<fieldset>
		<legend class="mb-3 font-semibold">{i18n.t('admin.roles.permissions')}</legend>
		<div class="grid gap-4 md:grid-cols-2">
			{#each PERMISSION_GROUPS as group (group.key)}
				<div class="rounded-lg border border-line p-4">
					<p class="mb-2 text-sm font-semibold text-ink-muted">
						{i18n.t(`permGroup.${group.key}` as MessageKey)}
					</p>
					<ul class="space-y-2">
						{#each group.permissions as perm (perm)}
							<li>
								<label class="flex items-start gap-3 text-sm">
									<input
										type="checkbox"
										name="permissions[]"
										value={perm}
										checked={permissions.includes(perm)}
										class="mt-0.5 size-4"
									/>
									<span>{i18n.t(`perm.${perm}` as MessageKey)}</span>
								</label>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</fieldset>

	<Button type="submit" loading={submitter.pending}>{submitLabel}</Button>
</form>
