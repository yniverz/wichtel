import type { Locale } from '#lib/i18n/index.ts';
import type { InstanceSettings } from './db/schema.ts';

/**
 * Legal notice and privacy policy. The texts live in the database (admin → "Datenschutz &
 * Impressum"); this module only builds the legal notice from the operator's details and offers a
 * starting template for the privacy policy that reflects how this instance is configured.
 *
 * The template is a careful starting point, not legal advice. Parts in [square brackets] have to
 * be completed by the operator.
 */

type Legal = Pick<
	InstanceSettings,
	| 'festivalName'
	| 'legalName'
	| 'legalAddress'
	| 'legalRepresentative'
	| 'legalEmail'
	| 'legalPhone'
	| 'legalRegister'
	| 'legalVatId'
	| 'imprintExtraDe'
	| 'imprintExtraEn'
	| 'privacyOfficer'
	| 'retentionMonths'
	| 'auditIpDays'
	| 'mapTileUrl'
	| 'mcpPersonalData'
	| 'contactEmail'
>;

export function hasImprint(s: Pick<InstanceSettings, 'legalName' | 'legalAddress'>) {
	return s.legalName.trim() !== '' && s.legalAddress.trim() !== '';
}

export function privacyText(s: Pick<InstanceSettings, 'privacyDe' | 'privacyEn'>, locale: Locale) {
	const text = locale === 'en' ? s.privacyEn || s.privacyDe : s.privacyDe || s.privacyEn;
	return text.trim();
}

/** Keeps line breaks of multi-line fields (address) as Markdown line breaks. */
const lines = (text: string) =>
	text
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean)
		.join('\n');

/** The legal notice (Impressum) as Markdown, built from the operator's details. */
export function imprintMarkdown(s: Legal, locale: Locale): string {
	const de = locale === 'de';
	const out: string[] = [];
	out.push(
		de
			? '## Angaben gemäß § 5 DDG'
			: '## Information pursuant to § 5 DDG (German Digital Services Act)'
	);
	out.push(lines(`${s.legalName}\n${s.legalAddress}`));
	if (s.legalRepresentative.trim())
		out.push(`**${de ? 'Vertreten durch' : 'Represented by'}**\n${lines(s.legalRepresentative)}`);
	const contact = [
		s.legalPhone.trim() && `${de ? 'Telefon' : 'Phone'}: ${s.legalPhone.trim()}`,
		s.legalEmail.trim() &&
			`${de ? 'E-Mail' : 'E-mail'}: [${s.legalEmail.trim()}](mailto:${s.legalEmail.trim()})`
	].filter(Boolean);
	if (contact.length) out.push(`**${de ? 'Kontakt' : 'Contact'}**\n${contact.join('\n')}`);
	if (s.legalRegister.trim())
		out.push(`**${de ? 'Registereintrag' : 'Register entry'}**\n${lines(s.legalRegister)}`);
	if (s.legalVatId.trim())
		out.push(
			`**${de ? 'Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG' : 'VAT ID pursuant to § 27a UStG'}**\n${s.legalVatId.trim()}`
		);
	const extra = (
		de ? s.imprintExtraDe || s.imprintExtraEn : s.imprintExtraEn || s.imprintExtraDe
	).trim();
	if (extra) out.push(extra);
	return out.join('\n\n');
}

export interface PrivacyFacts {
	/** Labels of the active profile fields (in the template's language). */
	profileFields: string[];
	/** Whether any role may connect AI assistants. */
	aiAssistants: boolean;
	/** Whether qualifications are defined. */
	qualifications: boolean;
	/** Whether e-mails are actually sent (SMTP configured). */
	mailServer: boolean;
	today: string;
}

const tileHost = (url: string) => {
	try {
		return new URL(url.replace(/\{[a-z]\}/g, 'x')).hostname.replace(/^x\./, '');
	} catch {
		return url;
	}
};

const todo = (text: string) => `[${text}]`;

/** A starting template for the privacy policy, in German or English. */
export function privacyTemplate(s: Legal, facts: PrivacyFacts, locale: Locale): string {
	return locale === 'en' ? privacyEn(s, facts) : privacyDe(s, facts);
}

function controller(s: Legal, de: boolean) {
	const parts = [
		s.legalName.trim() ||
			todo(de ? 'Name des Vereins / der Veranstalterin' : 'Name of the organisation'),
		lines(s.legalAddress) || todo(de ? 'Anschrift' : 'Postal address')
	];
	if (s.legalRepresentative.trim())
		parts.push(
			`${de ? 'Vertreten durch' : 'Represented by'}: ${lines(s.legalRepresentative).replace(/\n/g, ', ')}`
		);
	const mail = s.legalEmail.trim() || s.contactEmail.trim();
	parts.push(
		`${de ? 'E-Mail' : 'E-mail'}: ${mail || todo(de ? 'E-Mail-Adresse' : 'e-mail address')}`
	);
	if (s.legalPhone.trim()) parts.push(`${de ? 'Telefon' : 'Phone'}: ${s.legalPhone.trim()}`);
	return parts.join('\n');
}

/** Numbers the sections, so optional ones can be left out. */
function sections(list: (readonly [string, string] | false)[]) {
	return list
		.filter((s): s is readonly [string, string] => s !== false)
		.map(([title, body], i) => `## ${i + 1}. ${title}\n\n${body.trim()}`)
		.join('\n\n');
}

function privacyDe(s: Legal, f: PrivacyFacts): string {
	const personal = {
		full: 'Namen und Kontaktdaten (E-Mail, Telefon)',
		names: 'Namen, aber keine Kontaktdaten',
		pseudonymous: 'keine Namen, sondern nur gleichbleibende Kürzel (Pseudonyme)'
	}[s.mcpPersonalData as 'full' | 'names' | 'pseudonymous'];
	const retention =
		s.retentionMonths > 0
			? `Hast du **${s.retentionMonths} Monate** lang weder Wichtel genutzt noch eine Schicht gehabt, anonymisieren wir dein Konto automatisch. Zwei Wochen vorher schreiben wir dir eine E-Mail; meldest du dich an, bleibt dein Konto bestehen.`
			: 'Inaktive Konten löschen wir regelmäßig, spätestens wenn der Zweck entfallen ist.';
	const body = sections([
		[
			'Verantwortliche Stelle',
			`Verantwortlich für die Verarbeitung deiner Daten in diesem Helfendenportal ist:\n\n${controller(s, true)}`
		],
		[
			'Datenschutzbeauftragte Person',
			s.privacyOfficer.trim()
				? lines(s.privacyOfficer)
				: 'Wir sind nicht verpflichtet, eine datenschutzbeauftragte Person zu benennen. Bei Fragen zum Datenschutz schreib uns an die oben genannte Adresse.'
		],
		[
			'Worum es geht',
			`Über dieses Portal organisieren wir die ehrenamtliche Mitarbeit bei ${s.festivalName}: Registrierung, Schichtplanung, Absprachen mit den Leitungen, Anwesenheit sowie Punkte und Dankeschöns („Goodies“). Wir verarbeiten deine Daten nur dafür. Wir verkaufen keine Daten, zeigen keine Werbung und setzen keine Analyse- oder Tracking-Dienste ein.`
		],
		[
			'Aufruf der Website und Server-Protokolle',
			`Beim Aufruf jeder Seite verarbeitet der Server technisch notwendige Daten: IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, Statuscode, übertragene Datenmenge und Browser-Kennung. Die Anwendung selbst protokolliert Anfragen ohne IP-Adresse und ohne Suchparameter (Methode, Pfad, Statuscode, Dauer), um Fehler finden zu können.

Zweck ist die Auslieferung der Seiten sowie ein sicherer und stabiler Betrieb. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt in genau diesem Zweck.

${todo('Bitte ergänzen: Wie lange speichert euer Webserver bzw. Reverse Proxy Zugriffsprotokolle? Zum Beispiel: „Protokolle des Webservers werden nach 14 Tagen gelöscht.“')}`
		],
		[
			'Cookies',
			`Wir verwenden nur Cookies, die für den Betrieb nötig sind:

- \`wichtel_session\` hält dich angemeldet. Es wird bei der Abmeldung gelöscht und läuft spätestens nach 30 Tagen ohne Nutzung ab.
- \`wichtel_locale\` merkt sich die Sprache, die du gewählt hast.
- \`wichtel_admin_edition\` merkt sich bei Leitungen, welchen Jahrgang sie in der Verwaltung gerade bearbeiten.

Für diese Cookies ist nach § 25 Abs. 2 Nr. 2 TDDDG keine Einwilligung nötig. Die anschließende Verarbeitung stützen wir auf Art. 6 Abs. 1 lit. b DSGVO.`
		],
		[
			'Konto und Registrierung',
			`Für dein Konto speichern wir Vor- und Nachname, E-Mail-Adresse, Handynummer, dein Passwort (nur als sicheren Hash, niemals im Klartext) und deine Sprache${f.profileFields.length ? `, außerdem die Angaben aus diesen Feldern: ${f.profileFields.join(', ')}` : ''}.

Zweck ist deine Mitarbeit als Helfer:in und die Abstimmung rund um deine Schichten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Durchführung der vereinbarten ehrenamtlichen Mitarbeit bzw. Maßnahmen auf deine Anfrage). Name, E-Mail-Adresse und Handynummer brauchen wir, damit wir dich bei kurzfristigen Änderungen erreichen; ohne sie ist eine Mitarbeit nicht möglich. Freiwillige Angaben kannst du jederzeit im Profil ändern oder löschen.

Fragen wir Angaben ab, die Rückschlüsse auf deine Gesundheit zulassen (zum Beispiel Allergien für die Verpflegung), sind diese freiwillig. Wir verarbeiten sie nur mit deiner ausdrücklichen Einwilligung (Art. 9 Abs. 2 lit. a DSGVO), die du durch das Ausfüllen erteilst und jederzeit widerrufen kannst, indem du die Angabe löschst. Sichtbar sind sie nur für die Leitungen, die sie für ihre Aufgabe brauchen.`
		],
		[
			'Schichten, Anwesenheit, Punkte und Goodies',
			`Wir speichern, für welche Schichten du dich einträgst, anfragst oder auf der Warteliste stehst, ob du erschienen bist, deine Punkte und welche Goodies du auswählst oder erhältst. Dazu gehören auch Schichtübergaben, Tauschangebote und Gruppen, die du mit anderen bildest.

Die Leitungen eines Bereichs sehen Namen und Handynummern der Personen in ihren Schichten, damit sie sie erreichen können. Mitglieder deiner Gruppe sehen, für welche Schichten die Gruppe eingetragen ist. Am Helfendenstand wird dein persönlicher QR-Code gescannt, um dich einzuchecken oder Goodies auszugeben.

Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.`
		],
		f.qualifications && [
			'Qualifikationen und Nachweise',
			`Für manche Aufgaben brauchst du eine Qualifikation (zum Beispiel einen Führerschein oder einen Erste-Hilfe-Kurs). Du kannst dafür einen Nachweis hochladen. Nachweise liegen geschützt auf unserem Server und sind nur für die Personen sichtbar, die sie prüfen. Je nach Qualifikation löschen wir den Nachweis direkt nach der Prüfung; gespeichert bleibt dann nur, dass die Qualifikation bestätigt ist und bis wann sie gilt.

Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit ein Nachweis gesetzlich vorgeschrieben ist, zusätzlich Art. 6 Abs. 1 lit. c DSGVO.`
		],
		[
			'E-Mails',
			`Wir schicken dir E-Mails zu deinem Konto (Bestätigung der Adresse, Passwort zurücksetzen) und zu deinen Schichten (Bestätigungen, Änderungen, Erinnerungen). Leitungen können außerdem Rundmails an Helfende ihres Bereichs schicken, wenn es um die Mitarbeit beim Festival geht. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.

${f.mailServer ? todo('Bitte ergänzen: Über welchen Anbieter werden die E-Mails verschickt (Name, Sitz)? Dieser verarbeitet die Daten in unserem Auftrag (Art. 28 DSGVO).') : todo('Bitte ergänzen, sobald ein E-Mail-Server eingerichtet ist: Anbieter (Name, Sitz) als Auftragsverarbeiter nach Art. 28 DSGVO.')}

Kopien verschickter E-Mails löschen wir nach 30 Tagen, nicht zustellbare nach 90 Tagen.`
		],
		[
			'Kalender-Abo',
			'Du kannst deine Schichten über einen persönlichen Link in deinen Kalender übernehmen. Wer diesen Link kennt, sieht deine Schichten. Gib ihn daher nicht weiter; im Profil kannst du jederzeit einen neuen Link erzeugen, der alte funktioniert dann nicht mehr.'
		],
		[
			'Karten',
			`Orte können wir auf einer Karte zeigen. Die Kartenbilder kommen von einem externen Anbieter (${tileHost(s.mapTileUrl)}). Sie werden erst geladen, wenn du auf „Karte laden“ tippst. Dann übermittelt dein Browser deine IP-Adresse und die angefragten Kartenausschnitte an diesen Anbieter. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG), die du durch das Laden der Karte erteilst. Ohne Klick fließen keine Daten dorthin.`
		],
		f.aiAssistants && [
			'KI-Assistenten für die Planung',
			`Leitungen mit entsprechender Berechtigung können einen KI-Assistenten (zum Beispiel Claude von Anthropic) mit ihrem Konto verbinden, um Schichten schneller zu planen. Der Assistent sieht dann nur, was die jeweilige Leitung selbst sehen darf, also etwa Schichtpläne und Besetzungen. Über Helfende erhält er ${personal}. Jede Änderung, die über einen Assistenten erfolgt, wird protokolliert.

Der Anbieter des Assistenten verarbeitet diese Daten auf eigenen Servern, unter Umständen auch außerhalb der EU. ${todo('Bitte ergänzen: Welcher Anbieter, und auf welcher Grundlage werden Daten in ein Drittland übermittelt (z. B. Angemessenheitsbeschluss / EU-US Data Privacy Framework oder Standardvertragsklauseln)?')}

Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist eine effiziente Planung durch die ehrenamtlichen Leitungen.`
		],
		[
			'Änderungsprotokoll',
			`Wichtige Änderungen (zum Beispiel Buchungen durch Leitungen, Entscheidungen über Anfragen, Punkte, Einstellungen) protokollieren wir mit Zeitpunkt, handelnder Person und IP-Adresse. So bleibt nachvollziehbar, wer was geändert hat, und Missbrauch lässt sich erkennen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Die IP-Adressen löschen wir nach ${s.auditIpDays} Tagen.`
		],
		[
			'Wer deine Daten erhält',
			`- Leitungen und das Orga-Team, jeweils nur so weit, wie sie es für ihre Aufgabe brauchen.
- Unser Hosting-Anbieter: ${todo('Bitte ergänzen: Name und Sitz; Auftragsverarbeitung nach Art. 28 DSGVO')}.
- Der E-Mail-Anbieter (siehe oben).

Eine Weitergabe an andere Dritte findet nicht statt, es sei denn, wir sind gesetzlich dazu verpflichtet.`
		],
		[
			'Wie lange wir Daten speichern',
			`Dein Konto bleibt bestehen, bis du es löschst. ${retention}

Wenn du dein Konto löschst oder es anonymisiert wird, entfernen wir deinen Namen, deine Kontaktdaten, Profilangaben, Qualifikationen und Nachweise. Kommende Schichten werden dabei ausgetragen. Vergangene Schichten, Anwesenheit und Punkte bleiben ohne Bezug zu dir erhalten, damit Statistiken und die Punkteabrechnung stimmen. Gesetzliche Aufbewahrungspflichten bleiben unberührt.`
		],
		[
			'Deine Rechte',
			`Du hast das Recht auf:

- **Auskunft** über deine Daten (Art. 15 DSGVO). Im Profil kannst du unter „Meine Daten“ jederzeit alles herunterladen, was wir über dich gespeichert haben.
- **Berichtigung** (Art. 16 DSGVO). Die meisten Angaben änderst du direkt im Profil.
- **Löschung** (Art. 17 DSGVO). Im Profil kannst du dein Konto selbst löschen.
- **Einschränkung der Verarbeitung** (Art. 18 DSGVO).
- **Datenübertragbarkeit** (Art. 20 DSGVO). Der Download ist eine maschinenlesbare JSON-Datei.
- **Widerruf** einer Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO).
- **Beschwerde** bei einer Datenschutz-Aufsichtsbehörde (Art. 77 DSGVO). ${todo('Bitte ergänzen: die für euch zuständige Landesbehörde mit Anschrift')}. Eine Übersicht aller Behörden gibt es bei der [Bundesbeauftragten für den Datenschutz](https://www.bfdi.bund.de/DE/Infothek/Anschriften_Links/anschriften_links-node.html).

Schreib uns für alles andere einfach an die oben genannte Adresse.`
		],
		[
			'Widerspruchsrecht',
			`**Soweit wir Daten auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO verarbeiten (Server-Protokolle, Änderungsprotokoll${f.aiAssistants ? ', KI-Assistenten' : ''}), kannst du dieser Verarbeitung aus Gründen, die sich aus deiner besonderen Situation ergeben, jederzeit widersprechen (Art. 21 DSGVO).** Wir verarbeiten die Daten dann nicht mehr, es sei denn, wir können zwingende schutzwürdige Gründe nachweisen, die deine Interessen überwiegen, oder die Verarbeitung dient der Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen.`
		],
		[
			'Automatisierte Entscheidungen',
			'Wir treffen keine automatisierten Entscheidungen im Sinne von Art. 22 DSGVO. Punkte werden nach festen, für alle gleichen Regeln berechnet; Wartelisten rücken in der Reihenfolge der Anmeldung nach.'
		],
		[
			'Sicherheit',
			'Die Verbindung ist verschlüsselt (HTTPS). Passwörter speichern wir nur als Hash (Argon2), Anmelde- und Zugangsschlüssel ebenfalls nur gehasht. Zugriff auf Daten anderer haben nur Personen mit einer passenden Rolle, und auch dann nur für ihren Bereich.'
		]
	]);
	return `${body}\n\nStand: ${f.today}`;
}

function privacyEn(s: Legal, f: PrivacyFacts): string {
	const personal = {
		full: 'names and contact details (e-mail, phone)',
		names: 'names, but no contact details',
		pseudonymous: 'no names, only stable short codes (pseudonyms)'
	}[s.mcpPersonalData as 'full' | 'names' | 'pseudonymous'];
	const retention =
		s.retentionMonths > 0
			? `If you have neither used Wichtel nor had a shift for **${s.retentionMonths} months**, we anonymise your account automatically. We e-mail you two weeks before; if you sign in, your account stays.`
			: 'We delete inactive accounts regularly, at the latest once the purpose no longer applies.';
	const body = sections([
		[
			'Controller',
			`The controller for the processing of your data in this volunteer portal is:\n\n${controller(s, false)}`
		],
		[
			'Data protection officer',
			s.privacyOfficer.trim()
				? lines(s.privacyOfficer)
				: 'We are not required to appoint a data protection officer. For questions about data protection, write to the address above.'
		],
		[
			'What this is about',
			`We use this portal to organise volunteering at ${s.festivalName}: sign-up, shift planning, coordination with leads, attendance, and points and thank-you gifts ("goodies"). We process your data only for this. We do not sell data, show no advertising and use no analytics or tracking services.`
		],
		[
			'Visiting the website and server logs',
			`When you open a page, the server processes technically necessary data: IP address, date and time, requested address, status code, amount of data transferred and browser identification. The application itself logs requests without IP address and without query parameters (method, path, status code, duration) to be able to find errors.

The purpose is delivering the pages and secure, stable operation. The legal basis is Art. 6(1)(f) GDPR; our legitimate interest lies in exactly this purpose.

${todo('Please complete: how long does your web server or reverse proxy keep access logs? For example: "Web server logs are deleted after 14 days."')}`
		],
		[
			'Cookies',
			`We only use cookies needed for operation:

- \`wichtel_session\` keeps you signed in. It is deleted when you sign out and expires after 30 days without use at the latest.
- \`wichtel_locale\` remembers the language you chose.
- \`wichtel_admin_edition\` remembers, for leads, which edition they are working on in the admin area.

Under § 25(2) no. 2 TDDDG, these cookies need no consent. Further processing is based on Art. 6(1)(b) GDPR.`
		],
		[
			'Account and sign-up',
			`For your account we store first and last name, e-mail address, mobile number, your password (only as a secure hash, never in plain text) and your language${f.profileFields.length ? `, plus the answers to these fields: ${f.profileFields.join(', ')}` : ''}.

The purpose is your volunteering and coordination around your shifts. The legal basis is Art. 6(1)(b) GDPR (carrying out the agreed volunteering, or steps at your request). We need your name, e-mail address and mobile number to reach you about short-notice changes; without them, volunteering is not possible. You can change or delete voluntary answers in your profile at any time.

If we ask for details that allow conclusions about your health (for example allergies for catering), they are voluntary. We process them only with your explicit consent (Art. 9(2)(a) GDPR), which you give by filling them in and can withdraw at any time by deleting the answer. Only the leads who need them for their task can see them.`
		],
		[
			'Shifts, attendance, points and goodies',
			`We store which shifts you sign up for, request or wait for, whether you attended, your points and which goodies you choose or receive. This includes handovers, swap offers and groups you form with others.

The leads of an area see the names and mobile numbers of the people in their shifts so they can reach them. Members of your group see which shifts the group is signed up for. At the volunteer desk your personal QR code is scanned to check you in or hand out goodies.

The legal basis is Art. 6(1)(b) GDPR.`
		],
		f.qualifications && [
			'Qualifications and proofs',
			`Some tasks need a qualification (for example a driving licence or first-aid training). You can upload a proof for it. Proofs are stored protected on our server and only visible to the people who review them. Depending on the qualification, we delete the proof right after the review; we then only keep that the qualification is confirmed and until when it is valid.

The legal basis is Art. 6(1)(b) GDPR and, where a proof is required by law, also Art. 6(1)(c) GDPR.`
		],
		[
			'E-mails',
			`We send you e-mails about your account (confirming your address, resetting your password) and your shifts (confirmations, changes, reminders). Leads can also send messages to volunteers of their area about volunteering at the festival. The legal basis is Art. 6(1)(b) GDPR.

${f.mailServer ? todo('Please complete: which provider sends the e-mails (name, location)? It processes the data on our behalf (Art. 28 GDPR).') : todo('Please complete once a mail server is set up: provider (name, location) as processor under Art. 28 GDPR.')}

Copies of sent e-mails are deleted after 30 days, undeliverable ones after 90 days.`
		],
		[
			'Calendar subscription',
			'You can add your shifts to your calendar with a personal link. Anyone who knows this link sees your shifts, so do not share it; in your profile you can create a new link at any time, and the old one stops working.'
		],
		[
			'Maps',
			`We can show places on a map. The map images come from an external provider (${tileHost(s.mapTileUrl)}). They are only loaded when you tap "Load map". Your browser then sends your IP address and the requested map tiles to this provider. The legal basis is your consent (Art. 6(1)(a) GDPR, § 25(1) TDDDG), which you give by loading the map. Without that tap, no data goes there.`
		],
		f.aiAssistants && [
			'AI assistants for planning',
			`Leads with the corresponding permission can connect an AI assistant (for example Claude by Anthropic) to their account to plan shifts faster. The assistant only sees what the lead may see, such as shift plans and staffing. About volunteers it receives ${personal}. Every change made through an assistant is logged.

The assistant's provider processes this data on its own servers, possibly outside the EU. ${todo('Please complete: which provider, and on what basis data is transferred to a third country (e.g. adequacy decision / EU-US Data Privacy Framework or standard contractual clauses)?')}

The legal basis is Art. 6(1)(f) GDPR; our legitimate interest is efficient planning by the volunteer leads.`
		],
		[
			'Change log',
			`We log important changes (for example bookings by leads, decisions on requests, points, settings) with time, acting person and IP address, so that it stays traceable who changed what and misuse can be detected. The legal basis is Art. 6(1)(f) GDPR. IP addresses are deleted after ${s.auditIpDays} days.`
		],
		[
			'Who receives your data',
			`- Leads and the organising team, each only as far as they need it for their task.
- Our hosting provider: ${todo('Please complete: name and location; processing on our behalf under Art. 28 GDPR')}.
- The e-mail provider (see above).

We do not pass data to other third parties unless required by law.`
		],
		[
			'How long we keep data',
			`Your account exists until you delete it. ${retention}

When you delete your account or it is anonymised, we remove your name, contact details, profile answers, qualifications and proofs. Upcoming shifts are cancelled. Past shifts, attendance and points remain without any link to you, so that statistics and points stay correct. Statutory retention obligations remain unaffected.`
		],
		[
			'Your rights',
			`You have the right to:

- **Access** your data (Art. 15 GDPR). Under "My data" in your profile you can download everything we store about you at any time.
- **Rectification** (Art. 16 GDPR). You can change most details directly in your profile.
- **Erasure** (Art. 17 GDPR). You can delete your account yourself in your profile.
- **Restriction of processing** (Art. 18 GDPR).
- **Data portability** (Art. 20 GDPR). The download is a machine-readable JSON file.
- **Withdraw** consent with effect for the future (Art. 7(3) GDPR).
- **Lodge a complaint** with a data protection supervisory authority (Art. 77 GDPR). ${todo('Please complete: your competent state authority with address')}. An overview of all authorities is available from the [Federal Commissioner for Data Protection](https://www.bfdi.bund.de/DE/Infothek/Anschriften_Links/anschriften_links-node.html).

For anything else, just write to the address above.`
		],
		[
			'Right to object',
			`**Where we process data based on Art. 6(1)(f) GDPR (server logs, change log${f.aiAssistants ? ', AI assistants' : ''}), you may object to this processing at any time on grounds relating to your particular situation (Art. 21 GDPR).** We will then no longer process the data unless we can demonstrate compelling legitimate grounds that override your interests, or the processing serves the establishment, exercise or defence of legal claims.`
		],
		[
			'Automated decisions',
			'We make no automated decisions within the meaning of Art. 22 GDPR. Points are calculated by fixed rules that are the same for everyone; waiting lists move up in the order people joined.'
		],
		[
			'Security',
			'The connection is encrypted (HTTPS). We store passwords only as a hash (Argon2), and sign-in and access keys only hashed as well. Only people with a matching role can access other people’s data, and only for their area.'
		]
	]);
	return `${body}\n\nLast updated: ${f.today}`;
}
