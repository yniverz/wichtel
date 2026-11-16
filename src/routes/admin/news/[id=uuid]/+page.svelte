<script lang="ts">
	import { page } from '$app/state';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import NewsForm from '#lib/components/admin/NewsForm.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDateTime } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	type Result = {
		success?: string;
		error?: string;
		errors?: Record<string, string>;
		values?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const values = $derived({ ...data.values, ...(result?.values ?? {}) });
</script>

<svelte:head
	><title>{i18n.t('admin.news.edit')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader
	title={i18n.t('admin.news.edit')}
	back={{ href: '/admin/news', label: i18n.t('admin.news.title') }}
/>

<p class="-mt-4 mb-6 text-sm text-ink-muted">
	{i18n.t('admin.news.publishedAt', {
		date: formatDateTime(new Date(data.post.publishedAt), i18n.locale, page.data.settings.timezone)
	})}
	{#if data.post.mailed !== null}· {i18n.t('admin.news.mailedTo', { count: data.post.mailed })}{/if}
	· {i18n.t('admin.news.noResend')}
</p>

{#key result}
	<NewsForm
		action="?/update"
		{values}
		options={data.options}
		errors={result?.errors}
		error={result?.error}
		success={result?.success}
		submitLabel={i18n.t('common.save')}
	/>
{/key}

<div class="mt-10 max-w-2xl border-t border-line pt-6">
	<ConfirmForm
		action="?/delete"
		message={i18n.t('admin.news.deleteConfirm')}
		confirmLabel={i18n.t('common.delete')}
	>
		{i18n.t('common.delete')}
	</ConfirmForm>
</div>
