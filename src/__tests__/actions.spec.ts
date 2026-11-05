import { describe, expect, it } from 'vitest'
import { ActionId, encodeTrackNumber } from '../actions.js'
import { actionDefinitions, fakeInstance, runAction } from './fixtures.js'

describe('encodeTrackNumber', () => {
	it('sends four digits, the low pair first', () => {
		expect(encodeTrackNumber(1)).toBe('0100')
		expect(encodeTrackNumber(123)).toBe('2301')
		expect(encodeTrackNumber(9999)).toBe('9999')
	})

	it('rejects a track that is not a whole number from 1 to 9999', () => {
		for (const track of [0, 10000, 1.5, -1, '12', Number.NaN, undefined]) {
			expect(() => encodeTrackNumber(track)).toThrow('not valid')
		}
	})
})

describe('actions', () => {
	it('defines every action id', () => {
		const defs = actionDefinitions(fakeInstance())
		expect(Object.keys(defs).sort()).toEqual(Object.values(ActionId).sort())
	})

	it('send their command, with the action signal', async () => {
		const fake = fakeInstance()
		const defs = actionDefinitions(fake)
		const { signal } = new AbortController()
		await runAction(defs, ActionId.Play, {}, signal)
		await runAction(defs, ActionId.Pause)
		await runAction(defs, ActionId.Record, { mode: '01' })
		await runAction(defs, ActionId.DirectTrackSearchPreset, { track: 42 })
		expect(fake.sendCommand.mock.calls).toEqual([
			['12', signal],
			['1401', expect.any(AbortSignal)],
			['1301', expect.any(AbortSignal)],
			['234200', expect.any(AbortSignal)],
		])
	})

	it('follow a setting with a sense, so the unit reports it', async () => {
		const fake = fakeInstance()
		const defs = actionDefinitions(fake)
		await runAction(defs, ActionId.RepeatMode, { mode: '01' })
		await runAction(defs, ActionId.DeviceSelect, { mode: '10' })
		await runAction(defs, ActionId.PlayMode, { mode: '06' })
		expect(fake.sendCommand.mock.calls.map(([command]) => command)).toEqual([
			'3701',
			'37FF',
			'7F0110',
			'7F01FF',
			'4D06',
			'4E',
		])
	})

	it('send nothing for a mode that is not one of the choices, as an expression can give', async () => {
		const fake = fakeInstance()
		const defs = actionDefinitions(fake)
		await expect(runAction(defs, ActionId.Record, { mode: '99' })).rejects.toThrow('Mode 99 is not valid')
		await expect(runAction(defs, ActionId.DeviceSelect, { mode: 0 })).rejects.toThrow('Device 0 is not valid')
		await expect(runAction(defs, ActionId.DirectTrackSearchPreset, { track: 0 })).rejects.toThrow('not valid')
		expect(fake.sendCommand).not.toHaveBeenCalled()
	})

	it('Current Track Time Sense saves the mode chosen, then asks for that time', async () => {
		const fake = fakeInstance()
		await runAction(actionDefinitions(fake), ActionId.CurrentTrackTime, { mode: '02' })
		expect(fake.setTrackTimeMode).toHaveBeenCalledExactlyOnceWith('02')
		expect(fake.sendCommand).toHaveBeenCalledExactlyOnceWith('5802', expect.any(AbortSignal))
	})
})
