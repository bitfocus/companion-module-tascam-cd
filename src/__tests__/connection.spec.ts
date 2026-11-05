import { setTimeout as sleep } from 'node:timers/promises'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { RecorderConnection } from '../connection.js'
import { FakeRecorder } from './fakeRecorder.js'

let fake: FakeRecorder
let connection: RecorderConnection | undefined

beforeEach(async () => {
	fake = new FakeRecorder()
	fake.password = ''
	await fake.listen()
})

afterEach(async () => {
	connection?.destroy()
	await fake.close()
})

it('skips a poll while the last one is still queued, so polls cannot pile up', async () => {
	// Three commands a poll take 90 ms to send, and polls come every 20 ms
	const pollCommands = vi.fn(() => ['50', '55', '5800'])
	connection = new RecorderConnection({
		host: '127.0.0.1',
		port: fake.port,
		password: '',
		log: () => {},
		pollCommands,
		timing: { messageInterval: 30, pollInterval: 20, reconnectInterval: 1000 },
	})
	connection.connect()
	await vi.waitFor(() => expect(connection?.isReady).toBe(true))
	await sleep(600)
	const sent = fake.commands().length
	expect(sent).toBeGreaterThan(6)
	// Each poll taken is sent in full before the next is taken. Had every one been queued, about 30 would have been
	expect(pollCommands.mock.calls.length).toBeLessThanOrEqual(Math.ceil(sent / 3) + 1)
})
