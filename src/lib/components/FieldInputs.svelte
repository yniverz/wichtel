<script lang="ts" module>
	export interface FieldView {
		id: string;
		labelDe: string;
		labelEn: string;
		helpDe: string;
		helpEn: string;
		type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox';
		options: string[];
		required: boolean;
	}
</script>

<script lang="ts">
	import { getI18n } from '#lib/i18n/context.ts';
	import { isMessageKey, localized } from '#lib/i18n/index.ts';

	/** Renders configurable profile fields as `field_<id>` inputs. */
	let {
		fields,
		values = {},
		errors = {}
	}: {
		fields: FieldView[];
		values?: Record<string, unknown>;
		errors?: Record<string, string>;
	} = $props();
	const i18n = getI18n();
	const str = (v: unknown) =>
		v === null || v === undefined ? '' : Array.isArray(v) ? '' : String(v);
	const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
</script>

{#each fields as f (f.id)}
	{@const name = `field_${f.id}`}
	{@const error = errors[name]}
	{@const help = localized(f, 'help', i18n.locale)}
	<div class="space-y-1.5">
		{#if f.type === 'checkbox'}
			<label class="flex items-start gap-3 text-sm font-medium">
				<input
					type="checkbox"
					{name}
					checked={values[f.id] === true}
					required={f.required}
					class="mt-0.5 size-4"
				/>
				<span>{localized(f, 'label', i18n.locale)}</span>
			</label>
		{:else if f.type === 'multiselect'}
			<fieldset>
				<legend class="flex w-full justify-between text-sm font-medium">
					{localized(f, 'label', i18n.locale)}
					{#if !f.required}<span class="text-xs font-normal text-ink-muted"
							>{i18n.t('common.optional')}</span
						>{/if}
				</legend>
				<div class="mt-1.5 flex flex-wrap gap-x-5 gap-y-1.5">
					{#each f.options as o (o)}
						<label class="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								{name}
								value={o}
								checked={list(values[f.id]).includes(o)}
								class="size-4"
							/>{o}
						</label>
					{/each}
				</div>
			</fieldset>
		{:else}
			<label for={name} class="flex justify-between text-sm font-medium">
				{localized(f, 'label', i18n.locale)}
				{#if !f.required}<span class="text-xs font-normal text-ink-muted"
						>{i18n.t('common.optional')}</span
					>{/if}
			</label>
			{#if f.type === 'textarea'}
				<textarea
					id={name}
					{name}
					rows="3"
					required={f.required}
					maxlength="2000"
					class="block w-full">{str(values[f.id])}</textarea
				>
			{:else if f.type === 'select'}
				<select
					id={name}
					{name}
					required={f.required}
					class="block h-11 w-full"
					value={str(values[f.id])}
				>
					<option value="">—</option>
					{#each f.options as o (o)}<option value={o}>{o}</option>{/each}
				</select>
			{:else}
				<input
					id={name}
					{name}
					type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
					step={f.type === 'number' ? 'any' : undefined}
					maxlength={f.type === 'text' ? 200 : undefined}
					required={f.required}
					value={str(values[f.id])}
					class="block h-11 w-full"
				/>
			{/if}
		{/if}
		{#if error}
			<p class="text-sm text-red-600 dark:text-red-400">
				{isMessageKey(error) ? i18n.t(error) : error}
			</p>
		{:else if help}
			<p class="text-sm text-ink-muted">{help}</p>
		{/if}
	</div>
{/each}
