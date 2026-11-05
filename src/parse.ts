import { resp, SOM, vendorResp } from './consts.js'

/** A reply from the unit, as far as the module uses it */
export type ParsedReply =
	| { type: 'keepAlive' }
	| { type: 'repeat'; value: string }
	| { type: 'incrPlay'; value: string }
	| { type: 'remoteLocal'; value: string }
	| { type: 'playMode'; value: string }
	| { type: 'mechaStatus'; value: string }
	/** Track number status. track is undefined if it could not be read */
	| { type: 'trackNo'; eom: boolean; track: number | undefined }
	/** Current track information. Either is undefined if it could not be read */
	| { type: 'trackInfo'; track: number | undefined; time: string | undefined }
	/** Current track time, in the mode given. time is undefined if it could not be read */
	| { type: 'trackTime'; mode: string; time: string | undefined }
	| { type: 'errorSenseRequest' }
	| { type: 'cautionSenseRequest' }
	| { type: 'illegal'; detail: string }
	| { type: 'powerOn' }
	/** Something changed on the unit. what is the change status code: 00 mecha status, 03 take number */
	| { type: 'change'; what: string }
	/** code is as the ids of ERRORS */
	| { type: 'error'; code: string }
	/** code is as the ids of CAUTIONS */
	| { type: 'caution'; code: string }
	| { type: 'device'; value: string }
	| { type: 'playArea'; value: string }
	/** A reply the module recognises but has no use for */
	| { type: 'ignored'; code: string }
	/** A reply the module does not recognise */
	| { type: 'unknown'; text: string }

const pad2 = (n: number): string => String(n).padStart(2, '0')

/** Decimal digits only, so `parseInt` can't read a number from the front of something else */
function digits(text: string): number | undefined {
	return /^\d+$/.test(text) ? parseInt(text, 10) : undefined
}

/**
 * A time as h:mm:ss. The unit gives the minutes as four digits, the low pair first, and the seconds as two.
 * @param minutes the four minute digits as they arrive
 */
function formatTime(minutes: string, seconds: string): string | undefined {
	const totalMinutes = digits(minutes.slice(2, 4) + minutes.slice(0, 2))
	const secs = digits(seconds)
	if (totalMinutes === undefined || secs === undefined) return undefined
	return `${Math.floor(totalMinutes / 60)}:${pad2(totalMinutes % 60)}:${pad2(secs)}`
}

/** A track number: four digits, the low pair first */
function trackNumber(field: string): number | undefined {
	return digits(field.slice(2, 4) + field.slice(0, 2))
}

/** The reply codes the module recognises but has no use for */
const IGNORED: ReadonlySet<string> = new Set<string>([
	resp.infoReturn,
	resp.flashLoadAck,
	resp.autoCueLevelReturn,
	resp.autoTrackLevelReturn,
	resp.pitchControlDataReturn,
	resp.autoTrackTimeReturn,
	resp.clockDateReturn,
	resp.syncRecLevelReturn,
	resp.keyControlDataReturn,
	resp.autoCueSelectReturn,
	resp.autoTrackSelectReturn,
	resp.eomTrackTimeReturn,
	resp.eomMediaTimeReturn,
	resp.pitchControlSelectReturn,
	resp.autoReadySelectReturn,
	resp.syncRecSelectReturn,
	resp.specifiedDeviceStatusReturn,
	resp.mediaStatusReturn,
	resp.nameReturn,
	resp.totalTrackNoTotalTimeReturn,
	resp.pgmTotalTrackNoTotalTimeReturn,
	resp.keyboardTypeReturn,
	resp.powerControlReturn,
])

const IGNORED_VENDOR: ReadonlySet<string> = new Set<string>(
	Object.values(vendorResp).filter(
		(code) => code !== vendorResp.deviceSelectReturn && code !== vendorResp.playAreaSelectReturn,
	),
)

/**
 * Parses a line from the unit, without its line ending. Anything before the first {@link SOM} is dropped, as the unit
 * can echo or prefix lines.
 */
export function parseReply(line: string): ParsedReply {
	const start = line.indexOf(SOM)
	if (start === -1) return { type: 'unknown', text: line }
	const reply = line.slice(start)
	const code = reply.slice(1, 3)
	const param = reply.slice(3, 5)
	switch (code) {
		case resp.keepAlive:
			return { type: 'keepAlive' }
		case resp.repeatSelectReturn:
			return { type: 'repeat', value: param }
		case resp.incrPlaySelectReturn:
			return { type: 'incrPlay', value: param }
		case resp.remoteLocalModeReturn:
			return { type: 'remoteLocal', value: param }
		case resp.playModeReturn:
			return { type: 'playMode', value: param }
		case resp.mechaStatusReturn:
			return { type: 'mechaStatus', value: param }
		case resp.trackNoStatusReturn:
			return { type: 'trackNo', eom: param === '01', track: trackNumber(reply.slice(5, 9)) }
		case resp.trackCurrentInfoReturn:
			return {
				type: 'trackInfo',
				track: trackNumber(reply.slice(3, 7)),
				time: formatTime(reply.slice(7, 11), reply.slice(11, 13)),
			}
		case resp.trackCurrentTimeReturn:
			// Frames follow the seconds, in 11-12, and are not used
			return { type: 'trackTime', mode: param, time: formatTime(reply.slice(5, 9), reply.slice(9, 11)) }
		case resp.errorSenseRequest:
			return { type: 'errorSenseRequest' }
		case resp.cautionSenseRequest:
			return { type: 'cautionSenseRequest' }
		case resp.illegalStatus:
			return { type: 'illegal', detail: reply.slice(3) }
		case resp.powerOnStatus:
			return { type: 'powerOn' }
		case resp.changeStatus:
			return { type: 'change', what: param }
		case resp.errorSenseReturn:
			return { type: 'error', code: `${reply.charAt(6)}-${param}` }
		case resp.cautionSenseReturn:
			return { type: 'caution', code: `${reply.charAt(6)}-${param}` }
		case resp.vendorCommandReturn:
			return parseVendorReply(reply)
		default:
			return IGNORED.has(code) ? { type: 'ignored', code } : { type: 'unknown', text: reply }
	}
}

function parseVendorReply(reply: string): ParsedReply {
	const command = reply.slice(1, 7)
	if (command.startsWith(vendorResp.deviceSelectReturn)) {
		return { type: 'device', value: reply.slice(5, 7) }
	}
	if (command === vendorResp.playAreaSelectReturn) return { type: 'playArea', value: reply.slice(7, 9) }
	if (IGNORED_VENDOR.has(command)) return { type: 'ignored', code: command }
	return { type: 'unknown', text: reply }
}
