/** A shift with its crew, as shown on print views. */
export interface PrintShift {
	id: string;
	titleDe: string;
	titleEn: string;
	day: string;
	startsAt: string;
	endsAt: string;
	areaPath: string;
	where: string;
	contact: string;
	positions: {
		id: string;
		nameDe: string;
		nameEn: string;
		capacity: number;
		people: { name: string; phone: string | null; held: boolean }[];
	}[];
}
