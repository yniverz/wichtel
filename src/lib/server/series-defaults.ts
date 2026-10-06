/** Empty form values for a new shift, optionally pre-selecting an area (?area=…). */
export function seriesValuesFromRequest(url: URL, areas: { id: string }[], defaultDate: string) {
	const requested = url.searchParams.get('area');
	const areaId = areas.some((a) => a.id === requested) ? requested! : areas[0].id;
	return {
		values: {
			areaId,
			titleDe: '',
			titleEn: '',
			descriptionDe: '',
			descriptionEn: '',
			location: '',
			meetingPoint: '',
			contact: '',
			visibility: 'public',
			cancelDeadlineHours: null as number | null,
			date: defaultDate,
			start: '',
			end: ''
		},
		positions: []
	};
}
