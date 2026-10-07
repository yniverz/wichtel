/** Booking waves: who may book which areas when. Pure logic. */

export type WaveAudience = 'everyone' | 'crew' | 'returning' | 'invite';

export interface WaveRule {
	id: string;
	opensAt: Date;
	closesAt: Date | null;
	areaIds: readonly string[];
	audience: WaveAudience;
}

export interface PersonFacts {
	/** Has a role in the edition. */
	crew: boolean;
	/** Attended a shift in an earlier edition. */
	returning: boolean;
	/** Waves the person joined via invitation link. */
	invitedWaveIds: ReadonlySet<string>;
}

function reaches(wave: WaveRule, person: PersonFacts): boolean {
	switch (wave.audience) {
		case 'everyone':
			return true;
		case 'crew':
			return person.crew;
		case 'returning':
			return person.returning || person.crew;
		case 'invite':
			return person.invitedWaveIds.has(wave.id);
	}
}

function covers(wave: WaveRule, lineage: readonly string[]): boolean {
	return wave.areaIds.length === 0 || lineage.some((id) => wave.areaIds.includes(id));
}

export interface BookingWindow {
	open: boolean;
	/** When booking opens next for this person and area (if it is closed now). */
	opensAt: Date | null;
}

/**
 * Whether the person may book a shift in the area (given by its lineage) right now. Without any
 * waves, booking is always open.
 */
export function bookingWindow(
	waves: readonly WaveRule[],
	lineage: readonly string[],
	person: PersonFacts,
	now: Date
): BookingWindow {
	if (waves.length === 0) return { open: true, opensAt: null };
	const relevant = waves.filter((w) => reaches(w, person) && covers(w, lineage));
	const t = now.getTime();
	const open = relevant.some(
		(w) => w.opensAt.getTime() <= t && (w.closesAt === null || t < w.closesAt.getTime())
	);
	if (open) return { open: true, opensAt: null };
	const upcoming = relevant
		.filter((w) => w.opensAt.getTime() > t)
		.sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime());
	return { open: false, opensAt: upcoming[0]?.opensAt ?? null };
}
