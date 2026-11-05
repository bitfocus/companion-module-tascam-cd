import { describe, expect, it } from 'vitest'
import { parseReply } from '../parse.js'

// Synthetic replies, built from the reply forms in Tascam's SS-CDR250N / SS-R250N protocol as the module reads them.
// No captures from a unit were available.
describe('parseReply', () => {
	it('reads the settings the feedbacks show', () => {
		expect(parseReply('0B701')).toEqual({ type: 'repeat', value: '01' })
		expect(parseReply('0BA00')).toEqual({ type: 'incrPlay', value: '00' })
		expect(parseReply('0CC01')).toEqual({ type: 'remoteLocal', value: '01' })
		expect(parseReply('0CE05')).toEqual({ type: 'playMode', value: '05' })
		expect(parseReply('0D011')).toEqual({ type: 'mechaStatus', value: '11' })
		expect(parseReply('0FF0110')).toEqual({ type: 'device', value: '10' })
		expect(parseReply('0FF07CF02')).toEqual({ type: 'playArea', value: '02' })
	})

	it('reads a track number with its pairs of digits swapped, and end of media', () => {
		// Track 1234 arrives as 3412
		expect(parseReply('0D5003412')).toEqual({ type: 'trackNo', eom: false, track: 1234 })
		expect(parseReply('0D5010100')).toEqual({ type: 'trackNo', eom: true, track: 1 })
	})

	it('reads the current track time as h:mm:ss from minutes with their pairs swapped', () => {
		// 125 minutes (0125, sent 2501), 7 seconds, 12 frames
		expect(parseReply('0D80025010712')).toEqual({ type: 'trackTime', mode: '00', time: '2:05:07' })
		expect(parseReply('0D80300000000')).toEqual({ type: 'trackTime', mode: '03', time: '0:00:00' })
	})

	it('reads the current track information', () => {
		// track 0012 (sent 1200), 61 minutes (sent 6100), 59 seconds
		expect(parseReply('0D71200610059')).toEqual({ type: 'trackInfo', track: 12, time: '1:01:59' })
	})

	it('gives no track or time it cannot read, rather than NaN', () => {
		expect(parseReply('0D500')).toEqual({ type: 'trackNo', eom: false, track: undefined })
		expect(parseReply('0D800--')).toEqual({ type: 'trackTime', mode: '00', time: undefined })
		expect(parseReply('0D80012AB0700')).toEqual({ type: 'trackTime', mode: '00', time: undefined })
	})

	it('reads error and caution codes as <category>-<code>', () => {
		expect(parseReply('0F80000')).toEqual({ type: 'error', code: '0-00' })
		expect(parseReply('0F80201')).toEqual({ type: 'error', code: '1-02' })
		expect(parseReply('0F90A01')).toEqual({ type: 'caution', code: '1-0A' })
	})

	it('reads requests and notifications', () => {
		expect(parseReply('0F0')).toEqual({ type: 'errorSenseRequest' })
		expect(parseReply('0F1')).toEqual({ type: 'cautionSenseRequest' })
		expect(parseReply('0F600')).toEqual({ type: 'change', what: '00' })
		expect(parseReply('0F21A')).toEqual({ type: 'illegal', detail: '1A' })
		expect(parseReply('0F4')).toEqual({ type: 'powerOn' })
		expect(parseReply('0FA')).toEqual({ type: 'keepAlive' })
	})

	it('drops anything before the first 0', () => {
		expect(parseReply('xx0D010')).toEqual({ type: 'mechaStatus', value: '10' })
	})

	it('tells replies it has no use for from ones it does not know', () => {
		expect(parseReply('0A003')).toEqual({ type: 'ignored', code: 'A0' })
		expect(parseReply('0F5')).toEqual({ type: 'ignored', code: 'F5' })
		expect(parseReply('0FF1290000100')).toEqual({ type: 'ignored', code: 'FF1290' })
		expect(parseReply('0C1')).toEqual({ type: 'unknown', text: '0C1' })
		expect(parseReply('0FF9999')).toEqual({ type: 'unknown', text: '0FF9999' })
		expect(parseReply('hello')).toEqual({ type: 'unknown', text: 'hello' })
	})
})
