<script lang="ts">
	import { page } from '$app/state';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import RichText from '#lib/components/RichText.svelte';
	import NewsForm from '#lib/components/admin/NewsForm.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	type Result = {
		preview?: { reach: number; html: string; title: string };
		error?: string;
		errors?: Record<string, string>;
		values?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const values = $derived({ ...data.values, ...(result?.values ?? {}) });
	let edited = $state(false);
	// A new preview matches the text again.
	$effect(() => {
		void result;
		edited = false;
	});
</script>

<svelte:head
	><title>{i18n.t('admin.news.new')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader
	title={i18n.t('admin.news.new')}
	back={{ href: '/admin/news', label: i18n.t('admin.news.title') }}
/>

{#key result}
	<NewsForm
		action="?/preview"
		{values}
		options={data.options}
		errors={result?.errors}
		error={result?.error}
		withMail
		submitLabel={i18n.t('admin.news.preview')}
		onedit={() => (edited = true)}
	/>
{/key}

<!-- Publishing appears only for exactly the text that was previewed. -->
{#if result?.preview && result.values && !edited}
	<section class="mt-8 max-w-2xl border-t-2 border-ink pt-6" aria-labelledby="preview">
		<h2 id="preview" class="text-sm font-bold text-ink-muted">
			{i18n.t('admin.news.previewTitle')}
		</h2>
		<article class="mt-3 rounded-lg border border-line bg-surface-raised p-5">
			<h3 class="text-xl font-bold">{result.preview.title}</h3>
			<RichText html={result.preview.html} class="mt-2" />
		</article>
		<div class="mt-6 flex flex-wrap items-center gap-4">
			<p class="font-display text-3xl tabular-nums">
				{i18n.t('admin.news.reach', { count: result.preview.reach })}
			</p>
			<ConfirmForm
				action="?/publish"
				hidden={result.values}
				variant="primary"
				size="md"
				message={result.values.sendMail
					? i18n.t('admin.news.publishMailConfirm', { count: result.preview.reach })
					: i18n.t('admin.news.publishConfirm')}
				confirmLabel={i18n.t('admin.news.publish')}
			>
				{i18n.t('admin.news.publish')}
			</ConfirmForm>
		</div>
	</section>
{/if}
