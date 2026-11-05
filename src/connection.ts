import { EventEmitter } from 'node:events'
import { InstanceStatus, TCPHelper, type LogLevel } from '@companion-module/base'
import PQueue from 'p-queue'
import { END_SESSION, EOM, LoginPrompt, SOM } from './consts.js'
import { errorMessage } from './utils.js'

export interface ConnectionTiming {
	/** Least time from sending one command to sending the next. The unit asks for at least 20 ms */
	messageInterval: number
	/** How often the unit is polled once logged in. The polls keep the session open as well */
	pollInterval: number
	reconnectInterval: number
}

export const DEFAULT_TIMING: ConnectionTiming = {
	messageInterval: 20,
	pollInterval: 1000,
	reconnectInterval: 2000,
}

/**
 * A unit that has replied since logging in and then sends nothing for this many poll intervals is taken to have gone,
 * and the connection is reopened. A pulled cable or a power cut leaves the socket open: TCPHelper enables TCP keepalive
 * at the OS default, which on most systems takes two hours to notice.
 */
export const WATCHDOG_INTERVALS = 5

export interface ConnectionOptions {
	host: string
	port: number
	/** Empty if the unit has none */
	password: string
	log: (level: LogLevel, message: string) => void
	/** The commands sent every poll interval, without {@link SOM} */
	pollCommands: () => readonly string[]
	/** Defaults to {@link DEFAULT_TIMING}. Tests shorten it */
	timing?: Partial<ConnectionTiming>
}

export interface ConnectionEvents {
	/** Logged in, and commands can be sent. Fires again on every reconnection */
	ready: []
	/** A session has ended, so what the unit last reported may no longer hold */
	closed: []
	/** A line from the unit, without its line ending. Login prompts are handled here and not passed on */
	reply: [line: string]
	status: [status: InstanceStatus, message: string | null]
}

/**
 * The telnet control connection to an SS-CDR250N or SS-R250N: framing, login, pacing, polling and reconnection. Knows
 * nothing of Companion beyond reporting a status for it.
 */
export class RecorderConnection extends EventEmitter<ConnectionEvents> {
	readonly #options: ConnectionOptions
	readonly #timing: ConnectionTiming
	readonly #queue: PQueue
	#socket: TCPHelper | undefined
	#buffer = ''
	/** Exists while logged in, and is aborted as the session ends, which drops everything queued for it */
	#session: AbortController | undefined
	#pollTimer: NodeJS.Timeout | undefined
	/** The password is sent once per connection, so a wrong one is not sent again each time the unit asks */
	#passwordSent = false
	/** Poll commands queued and not yet sent. A poll is skipped while any are, so polls can't pile up in the queue */
	#pollsQueued = 0
	#lastReceived = 0
	#replied = false
	/** Set by the first failure of an outage, so retries against a unit that is off don't flood the log */
	#outageLogged = false
	#lastStatus: { status: InstanceStatus; message: string | null } | undefined
	#destroyed = false

	constructor(options: ConnectionOptions) {
		super()
		this.#options = options
		this.#timing = { ...DEFAULT_TIMING, ...options.timing }
		this.#queue = new PQueue({ concurrency: 1, interval: this.#timing.messageInterval, intervalCap: 1 })
	}

	/** Logged in, so commands can be sent */
	get isReady(): boolean {
		return this.#session !== undefined
	}

	/** Opens the connection, replacing any already open. After that, TCPHelper reconnects by itself */
	connect(): void {
		if (this.#destroyed) throw new Error('Connection has been destroyed')
		this.#closeSocket()
		const { host, port } = this.#options
		this.#status(InstanceStatus.Connecting, `Connecting to ${host}:${port}`)
		const socket = new TCPHelper(host, port, { reconnect: true, reconnect_interval: this.#timing.reconnectInterval })
		this.#socket = socket
		socket.on('connect', () => this.#onConnect())
		socket.on('data', (chunk) => this.#receive(chunk))
		socket.on('end', () => {
			this.#endSession()
			this.#status(InstanceStatus.Disconnected, 'Connection closed by device')
			this.#logOutage('warn', `Connection closed by ${host}:${port}`)
		})
		socket.on('error', (err) => {
			this.#endSession()
			this.#status(InstanceStatus.ConnectionFailure, err.message)
			this.#logOutage('error', `Network error: ${err.message}`)
		})
	}

	/** Ends the session and closes the connection for good. Anything still queued is rejected */
	destroy(): void {
		this.#destroyed = true
		this.removeAllListeners()
		if (this.#socket?.isConnected) this.#write(END_SESSION)
		this.#closeSocket()
	}

	/**
	 * Queues a command for the unit
	 * @param command the command code and its parameters, without {@link SOM}
	 * @param signal an action's context.signal. A command whose signal aborts before its turn is never sent
	 * @returns once the command is written to the socket
	 * @throws if not logged in, or the session ends or the signal aborts before the command is sent
	 */
	async send(command: string, signal?: AbortSignal): Promise<void> {
		const session = this.#session
		if (session === undefined) throw new Error('Not connected to unit')
		const message = SOM + command + EOM
		// p-queue listens on the combined signal from the moment the job is queued, which makes it pass an abort on
		// eagerly. Only reading .aborted could miss one: AbortSignal.any holds its sources weakly
		const combined = signal ? AbortSignal.any([session.signal, signal]) : session.signal
		await this.#queue.add(
			async ({ signal: jobSignal }) => {
				jobSignal?.throwIfAborted()
				const socket = this.#socket
				if (!socket?.isConnected || !(await socket.sendAsync(message))) throw new Error('Not connected to unit')
				this.#options.log('debug', `Sending command: ${SOM + command}`)
			},
			{ signal: combined },
		)
	}

	#onConnect(): void {
		this.#endSession()
		const { host, port, password } = this.#options
		this.#buffer = ''
		this.#passwordSent = false
		this.#options.log('info', `Connected to ${host}:${port}`)
		this.#status(InstanceStatus.Connecting, 'Logging in')
		// Prompts the unit for the password, if it has one
		this.#write('  ')
		if (password === '') this.#startSession()
	}

	/** Writes a line straight to the socket, outside the queue. For logging in and out */
	#write(text: string): void {
		this.#socket?.send(text + EOM)
	}

	#receive(chunk: Buffer): void {
		this.#lastReceived = Date.now()
		if (this.#session !== undefined) this.#replied = true
		this.#buffer += chunk.toString('latin1')
		const lines = this.#buffer.split(EOM)
		this.#buffer = lines.pop() ?? ''
		for (const line of lines) {
			try {
				this.#onLine(line)
			} catch (err) {
				// This runs in the socket's data listener, where a throw would end the module's process
				this.#options.log('error', `Could not handle reply ${line}: ${errorMessage(err)}`)
			}
		}
	}

	#onLine(line: string): void {
		this.#options.log('debug', `Response received: ${line}`)
		switch (line) {
			case LoginPrompt.Password:
				if (this.#passwordSent) {
					this.#options.log('debug', 'Password asked for again, not resending it')
				} else {
					this.#passwordSent = true
					this.#write(this.#options.password)
				}
				return
			case LoginPrompt.Success:
				this.#options.log('info', 'Logged in')
				if (this.#session === undefined) this.#startSession()
				return
			case LoginPrompt.Failure:
				this.#endSession()
				this.#status(InstanceStatus.AuthenticationFailure, 'Incorrect Password')
				this.#options.log('error', 'Incorrect Password')
				return
			default:
				this.emit('reply', line)
		}
	}

	#startSession(): void {
		this.#session = new AbortController()
		this.#replied = false
		this.#lastReceived = Date.now()
		this.#outageLogged = false
		this.#status(InstanceStatus.Ok, null)
		this.#pollTimer = setInterval(() => this.#poll(), this.#timing.pollInterval)
		this.emit('ready')
	}

	/** Ends the session, if one is open: everything queued for it is rejected, and polling stopped */
	#endSession(): void {
		const session = this.#session
		if (session === undefined) return
		this.#session = undefined
		clearInterval(this.#pollTimer)
		this.#pollTimer = undefined
		session.abort(new Error('Session with unit ended'))
		this.emit('closed')
	}

	#closeSocket(): void {
		this.#endSession()
		// TCPHelper's destroy removes its listeners first, so the old socket can't report anything once replaced
		this.#socket?.destroy()
		this.#socket = undefined
		this.#buffer = ''
	}

	#poll(): void {
		const silence = Date.now() - this.#lastReceived
		if (this.#replied && silence > this.#timing.pollInterval * WATCHDOG_INTERVALS) {
			this.#options.log('warn', `Nothing received from unit for ${silence} ms, reconnecting`)
			this.connect()
			return
		}
		if (this.#pollsQueued > 0) return
		for (const command of this.#options.pollCommands()) {
			this.#pollsQueued++
			this.send(command)
				// Its only failure is the session ending, which is reported already
				.catch((err) => this.#options.log('debug', `Poll not sent: ${errorMessage(err)}`))
				.finally(() => this.#pollsQueued--)
		}
	}

	#status(status: InstanceStatus, message: string | null): void {
		if (this.#lastStatus?.status === status && this.#lastStatus.message === message) return
		this.#lastStatus = { status, message }
		this.emit('status', status, message)
	}

	#logOutage(level: LogLevel, message: string): void {
		this.#options.log(this.#outageLogged ? 'debug' : level, message)
		this.#outageLogged = true
	}
}
