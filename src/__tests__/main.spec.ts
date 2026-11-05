import { setTimeout as sleep } from 'node:timers/promises'
import { InstanceStatus, type CompanionFeedbackDefinitions } from '@companion-module/base'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TascamCdInstance from '../main.js'
import type { ModuleConfig, ModuleSecrets } from '../config.js'
import type { ConnectionTiming } from '../connection.js'
import { FeedbackId, type FeedbackSchema } from '../feedbacks.js'
import { closedPort, FakeRecorder } from './fakeRecorder.js'
import { checkFeedback } from './fixtures.js'
import { createContext, type HostContext } from './hostContext.js'

const TIMING: ConnectionTiming = { messageInterval: 2, pollInterval: 40, reconnectInterval: 40 }

/**
 * Commands queue up behind each other. The poll interval is longer to match: the fake does not answer every query sent
 * on logging in, and the watchdog would take the silence while the rest go out for a unit that has gone
 */
const SLOW_QUEUE: ConnectionTiming = { ...TIMING, messageInterval: 50, pollInterval: 300 }

/** The fake's password */
const SECRETS: ModuleSecrets = { password: 'SS-CDR250N' }

let fake: FakeRecorder
const instances: TascamCdInstance[] = []

beforeEach(async () => {
	fake = new FakeRecorder()
	await fake.listen()
})

afterEach(async () => {
	for (const instance of instances.splice(0)) await instance.destroy()
	await fake.close()
})

function createInstance(timing: Partial<ConnectionTiming> = TIMING) {
	const context = createContext()
	const instance = new TascamCdInstance(context)
	instance.timing = timing
	const log = vi.spyOn(instance, 'log').mockImplementation(() => {})
	instances.push(instance)
	return { instance, context, log }
}

function config(overrides: Partial<ModuleConfig> = {}): ModuleConfig {
	return { host: '127.0.0.1', port: fake.port, currentTrackTimeMode: '00', ...overrides }
}

/** The feedback definitions given to Companion, for their callbacks to be run against the real instance */
const definedFeedbacks = (context: HostContext) =>
	context.setFeedbackDefinitions.mock.calls.at(-1)?.[0] as CompanionFeedbackDefinitions<FeedbackSchema>

/** The variable values last set, merged */
const variables = (context: HostContext): Record<string, unknown> =>
	Object.assign({}, ...context.setVariableValues.mock.calls.map(([values]) => values as object))

/** Waits for the login, and for the unit to have answered the queries sent on logging in */
async function started(
	overrides: Partial<ModuleConfig> = {},
	timing?: Partial<ConnectionTiming>,
	secrets: ModuleSecrets | undefined = SECRETS,
) {
	const created = createInstance(timing)
	await created.instance.init(config(overrides), false, secrets)
	await vi.waitFor(() => expect(created.context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.Ok, null))
	// The queries go out one message interval apart, which some tests lengthen
	await vi.waitFor(() => expect(created.instance.recorder.get('playArea')).toBeDefined(), { timeout: 3000 })
	return created
}

describe('logging in', () => {
	it('sends the password when asked, then queries the unit', async () => {
		const { context } = await started()
		expect(fake.lines(1).slice(0, 2)).toEqual(['  ', 'SS-CDR250N'])
		expect(fake.commands(1)).toEqual(
			expect.arrayContaining(['78', '79', '50', '55', '7F01FF', '37FF', '38FF', '3AFF', '4CFF', '4E', '7F074FFF']),
		)
		expect(variables(context)).toMatchObject({
			playState: 'Stop',
			deviceStatus: 'CD',
			trackNo: 1,
			errorStatus: 'No Error',
			cautionStatus: 'No Caution',
		})
	})

	it('logs straight in to a unit with no password, sending none', async () => {
		fake.password = ''
		await started({}, undefined, { password: '' })
		expect(fake.lines(1)[0]).toBe('  ')
		expect(fake.lines(1)).not.toContain('SS-CDR250N')
	})

	it('takes no password from secrets saved before the password was one', async () => {
		fake.password = ''
		const { instance, context } = createInstance()
		await instance.init(config(), false, undefined)
		await vi.waitFor(() => expect(context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.Ok, null))
		await vi.waitFor(() => expect(instance.recorder.get('playArea')).toBeDefined())
		expect(fake.lines(1).filter((line) => !line.startsWith('0'))).toEqual(['  '])
	})

	it('logs in with the password from the secrets, not one left in the config', async () => {
		fake.password = 'secret'
		await started({ password: 'SS-CDR250N' } as Partial<ModuleConfig>, undefined, { password: 'secret' })
		expect(fake.lines(1).slice(0, 2)).toEqual(['  ', 'secret'])
	})

	it('reports a wrong password, and sends it only once however often the unit asks', async () => {
		const { instance, context, log } = createInstance()
		await instance.init(config(), false, { password: 'wrong' })
		await vi.waitFor(() =>
			expect(context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.AuthenticationFailure, 'Incorrect Password'),
		)
		await sleep(100)
		expect(fake.lines(1).filter((line) => line === 'wrong')).toHaveLength(1)
		expect(fake.commands(1)).toEqual([])
		expect(log).toHaveBeenCalledWith('error', 'Incorrect Password')
	})

	it('reports a missing host or an unusable port as bad config, without connecting', async () => {
		const { instance, context } = createInstance()
		await instance.init(config({ host: '  ' }), false, SECRETS)
		expect(context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.BadConfig, 'No host')
		await instance.configUpdated(config({ port: '23' as unknown as number }), SECRETS)
		expect(context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.BadConfig, 'Invalid port 23')
		await sleep(50)
		expect(fake.connections).toBe(0)
		await expect(instance.sendCommand('10')).rejects.toThrow('Not connected')
	})

	it('reports a unit that cannot be reached', async () => {
		const { instance, context } = createInstance()
		await instance.init(config({ port: await closedPort() }), false, SECRETS)
		await vi.waitFor(() =>
			expect(context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.ConnectionFailure, expect.any(String)),
		)
		await expect(instance.sendCommand('10')).rejects.toThrow('Not connected')
	})
})

describe('polling', () => {
	it('asks for the mecha status, track number and the configured track time', async () => {
		await started({ currentTrackTimeMode: '02' })
		const before = fake.commands(1).length
		await sleep(TIMING.pollInterval * 3)
		const polled = fake.commands(1).slice(before)
		expect(new Set(polled)).toEqual(new Set(['50', '55', '5802']))
	})

	it('updates feedbacks and variables only when what the unit reports changes', async () => {
		const { instance, context } = await started()
		const defs = definedFeedbacks(context)
		expect(checkFeedback(defs, FeedbackId.MechaStatus, { status: '11' })).toBe(false)
		context.checkFeedbacks.mockClear()
		context.setVariableValues.mockClear()
		await sleep(TIMING.pollInterval * 3)
		expect(context.checkFeedbacks).not.toHaveBeenCalled()
		expect(context.setVariableValues).not.toHaveBeenCalled()

		fake.mechaStatus = '11'
		fake.minutes = 61
		fake.seconds = 5
		await vi.waitFor(() => expect(instance.recorder.get('mechaStatus')).toBe('11'))
		await vi.waitFor(() => expect(variables(context)).toMatchObject({ trackTime: '1:01:05' }))
		expect(context.checkFeedbacks).toHaveBeenCalledExactlyOnceWith([FeedbackId.MechaStatus])
		expect(variables(context)).toMatchObject({ playState: 'Play' })
		expect(checkFeedback(defs, FeedbackId.MechaStatus, { status: '11' })).toBe(true)
	})

	it('spaces commands by the message interval', async () => {
		await started({}, { ...TIMING, messageInterval: 20 })
		const arrivals = fake.received.filter((r) => r.text.startsWith('0')).map((r) => r.at)
		expect(arrivals.length).toBeGreaterThan(5)
		for (let i = 1; i < arrivals.length; i++) expect(arrivals[i] - arrivals[i - 1]).toBeGreaterThanOrEqual(15)
	})
})

describe('messages from the unit', () => {
	it('show errors and cautions, and answer its requests to ask for them', async () => {
		const { instance, context, log } = await started()
		const defs = definedFeedbacks(context)
		const errorSenses = () => fake.commands(1).filter((c) => c === '78').length
		const before = errorSenses()
		fake.broadcast('0F0')
		await vi.waitFor(() => expect(errorSenses()).toBe(before + 1))

		fake.broadcast('0F80201')
		fake.broadcast('0F90601')
		fake.broadcast('0F8EE01')
		await vi.waitFor(() => expect(instance.recorder.get('error')).toBe('1-EE'))
		expect(instance.recorder.get('caution')).toBe('1-06')
		expect(variables(context)).toMatchObject({ errorStatus: 'Unknown (1-EE)', cautionStatus: 'Media Full' })
		expect(log).toHaveBeenCalledWith('warn', 'Error status: Device Error')
		expect(checkFeedback(defs, FeedbackId.Caution, { caution: '1-06' })).toBe(true)
		expect(checkFeedback(defs, FeedbackId.Error, { error: '1-02' })).toBe(false)
	})

	it('ask for what changed when the unit says something has', async () => {
		const { context } = await started({}, SLOW_QUEUE)
		const count = (command: string) => fake.commands(1).filter((c) => c === command).length
		const caution = count('79')
		const mecha = count('50')
		const track = count('55')
		fake.broadcast('0F1')
		fake.broadcast('0F600')
		fake.broadcast('0F603')
		await vi.waitFor(() => {
			expect(count('79')).toBe(caution + 1)
			expect(count('50')).toBeGreaterThan(mecha)
			expect(count('55')).toBeGreaterThan(track)
		})
		fake.eom = true
		fake.broadcast('0D5010200')
		await vi.waitFor(() => expect(variables(context)).toMatchObject({ trackNo: 2 }))
		expect(checkFeedback(definedFeedbacks(context), FeedbackId.Eom)).toBe(true)
	})

	it('log what the unit rejects or the module does not know', async () => {
		const { log } = await started()
		fake.broadcast('0F21A')
		fake.broadcast('0C1')
		fake.broadcast('0F4')
		await vi.waitFor(() => expect(log).toHaveBeenCalledWith('info', 'Power on'))
		expect(log).toHaveBeenCalledWith('warn', 'Illegal Status, Invalid Command: 1A')
		expect(log).toHaveBeenCalledWith('warn', 'Unexpected response from unit: 0C1')
	})
})

describe('the connection', () => {
	it('forgets what the unit reported when the connection drops, and logs in again', async () => {
		// Slow enough to reconnect that the state can be seen forgotten before the new session reports it again
		const { instance, context } = await started({}, { ...TIMING, reconnectInterval: 300 })
		const defs = definedFeedbacks(context)
		expect(checkFeedback(defs, FeedbackId.DeviceSelect, { device: '11' })).toBe(true)
		context.checkAllFeedbacks.mockClear()
		fake.dropConnections()
		await vi.waitFor(() => expect(instance.recorder.get('device')).toBeUndefined())
		expect(context.checkAllFeedbacks).toHaveBeenCalled()
		expect(checkFeedback(defs, FeedbackId.DeviceSelect, { device: '11' })).toBe(false)
		expect(variables(context)).toMatchObject({ deviceStatus: 'unknown', playState: 'unknown' })
		await vi.waitFor(() => expect(fake.connections).toBe(2), { timeout: 2000 })
		await vi.waitFor(() => expect(instance.recorder.get('device')).toBe('11'))
		expect(fake.lines(2).slice(0, 2)).toEqual(['  ', 'SS-CDR250N'])
	})

	it('reconnects to a unit that stops answering with the socket still open', async () => {
		const { log } = await started()
		fake.answering = false
		await vi.waitFor(() => expect(fake.connections).toBe(2), { timeout: TIMING.pollInterval * 20 })
		expect(log).toHaveBeenCalledWith('warn', expect.stringMatching(/^Nothing received from unit/))
	})

	it('ends the session on a config change, and connects with the new config', async () => {
		const { instance, context } = await started()
		const second = new FakeRecorder()
		await second.listen()
		try {
			await instance.configUpdated(config({ port: second.port }), SECRETS)
			await vi.waitFor(() => expect(fake.lines(1)).toContain('exit'))
			await vi.waitFor(() => expect(second.connections).toBe(1))
			await vi.waitFor(() => expect(context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.Ok, null))
		} finally {
			await instance.destroy()
			await second.close()
		}
	})

	it('drops commands still queued when the session ends', async () => {
		const { instance } = await started({}, SLOW_QUEUE)
		const sends = Array.from({ length: 5 }, async () => instance.sendCommand('10'))
		fake.dropConnections()
		const results = await Promise.allSettled(sends)
		expect(results.some((r) => r.status === 'rejected')).toBe(true)
	})

	it('drops a command whose action signal aborts before its turn', async () => {
		const { instance } = await started({}, SLOW_QUEUE)
		const before = fake.commands(1).filter((c) => c === '1D').length
		const controller = new AbortController()
		const filler = Array.from({ length: 3 }, async () => instance.sendCommand('10'))
		const call = instance.sendCommand('1D', controller.signal)
		controller.abort()
		await expect(call).rejects.toThrow()
		await Promise.all(filler)
		await sleep(100)
		expect(fake.commands(1).filter((c) => c === '1D')).toHaveLength(before)
	})
})

describe('track time mode', () => {
	it('is saved to the config when changed, and polled from then on', async () => {
		const { instance, context } = await started()
		instance.setTrackTimeMode('03')
		expect(context.saveConfig).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ currentTrackTimeMode: '03' }),
			undefined,
		)
		instance.setTrackTimeMode('03')
		expect(context.saveConfig).toHaveBeenCalledOnce()
		await vi.waitFor(() => expect(fake.commands(1)).toContain('5803'))
	})

	it('is Elapsed Time for a config saved before it was a field', async () => {
		await started({ currentTrackTimeMode: undefined })
		await vi.waitFor(() => expect(fake.commands(1)).toContain('5800'))
	})
})
