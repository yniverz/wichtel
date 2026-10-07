import QRCode from 'qrcode';
import { config } from './app.ts';

/** Link behind a person's QR code. Opening it with any phone camera leads the desk to the person. */
export function personalQrUrl(qrToken: string): string {
	return `${config.publicUrl}/q/${qrToken}`;
}

/** QR code as standalone SVG markup (no external requests). */
export function qrSvg(text: string): Promise<string> {
	return QRCode.toString(text, {
		type: 'svg',
		margin: 1,
		errorCorrectionLevel: 'M',
		color: { dark: '#000000', light: '#ffffff' }
	});
}
