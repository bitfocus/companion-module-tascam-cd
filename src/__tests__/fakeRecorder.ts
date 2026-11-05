import { createServer, type Server, type Socket } from 'node:net'

// Written out here rather than taken from the module under test
const EOL = '\r\n'

/** Swaps the pairs of a four digit field, as the unit sends track numbers and minutes */
const swapPairs = (digits: string): string => digits.slice(2) + digits.slice(0, 2)

export interface ReceivedLine {
	/** performance.now() on arrival */
	at: number
	/** Which connection it came on, counting from 1 */
	connection: number
	text: string
}

/**
 * An SS-CDR250N on a loopback TCP port, for the module to connect to. It answers the senses the module polls and
 * queries on login from the state held here, and the select commands by changing it.
 *
 * These replies are synthetic, not captured from a unit: they follow the reply forms the module was written against.
 */
export class FakeRecorder {
	readonly received: ReceivedLine[] = []
	/** Empty for a unit with no password, which logs any connection straight in */
	password = 'SS-CDR250N'
	mechaStatus = '10'
	device = '11'
	repeat = '00'
	playArea = '00'
	track = 1
	eom = false
	/** Total minutes and seconds of the current track time */
	minutes = 0
	seconds = 0
	port = 0
	/** Connections accepted so far */
	connections = 0
	/** Off, the socket stays open but nothing is answered, as when the unit dies or a cable is pulled mid-path */
	answering = true
	readonly #server: Server
	readonly #sockets = new Set<Socket>()
	readonly #loggedIn = new Set<Socket>()

	constructor() {
		this.#server = createServer((socket) => {
			this.connections++
			const connection = this.connections
			this.#sockets.add(socket)
			let buffer = ''
			socket.on('data', (chunk: Buffer) => {
				buffer += chunk.toString('latin1')
				let end: number
				while ((end = buffer.indexOf(EOL)) !== -1) {
					const text = buffer.slice(0, end)
					buffer = buffer.slice(end + EOL.length)
					this.received.push({ at: performance.now(), connection, text })
					this.#answer(socket, text)
				}
			})
			socket.on('close', () => {
				this.#sockets.delete(socket)
				this.#loggedIn.delete(socket)
			})
			socket.on('error', () => {})
		})
	}

	async listen(): Promise<void> {
		await new Promise<void>((resolve) => this.#server.listen(0, '127.0.0.1', resolve))
		const address = this.#server.address()
		if (!address || typeof address === 'string') throw new Error('fake recorder did not get a port')
		this.port = address.port
	}

	async close(): Promise<void> {
		this.dropConnections()
		await new Promise<void>((resolve) => this.#server.close(() => resolve()))
	}

	get openConnections(): number {
		return this.#sockets.size
	}

	/** Closes every connection from the unit's end */
	dropConnections(): void {
		for (const socket of this.#sockets) socket.destroy()
	}

	/** Writes a line to every connection */
	broadcast(line: string): void {
		for (const socket of this.#sockets) socket.write(line + EOL, 'latin1')
	}

	/** The lines received, in order, optionally only those on one connection */
	lines(connection?: number): string[] {
		return this.received.filter((r) => connection === undefined || r.connection === connection).map((r) => r.text)
	}

	/** The commands received, without their leading 0 */
	commands(connection?: number): string[] {
		return this.lines(connection)
			.filter((line) => /^0[0-9A-F]{2}/.test(line))
			.map((line) => line.slice(1))
	}

	#write(socket: Socket, line: string): void {
		if (this.answering && !socket.destroyed) socket.write(line + EOL, 'latin1')
	}

	#answer(socket: Socket, text: string): void {
		if (!this.#loggedIn.has(socket)) {
			if (this.password === '') {
				this.#loggedIn.add(socket)
			} else if (text.trim() === '') {
				this.#write(socket, 'Enter Password')
				return
			} else if (text === this.password) {
				this.#loggedIn.add(socket)
				this.#write(socket, 'Login Successful')
				return
			} else {
				this.#write(socket, 'Password is different')
				this.#write(socket, 'Enter Password')
				return
			}
		}
		if (!text.startsWith('0')) return
		const command = text.slice(1)
		const reply = (line: string): void => this.#write(socket, '0' + line)
		if (command === '50') reply('D0' + this.mechaStatus)
		else if (command === '55') {
			reply(`D5${this.eom ? '01' : '00'}${swapPairs(String(this.track).padStart(4, '0'))}`)
		} else if (command.startsWith('58')) {
			const minutes = swapPairs(String(this.minutes).padStart(4, '0'))
			reply(`D8${command.slice(2, 4)}${minutes}${String(this.seconds).padStart(2, '0')}00`)
		} else if (command === '78') reply('F80000')
		else if (command === '79') reply('F90000')
		else if (command.startsWith('7F01')) {
			const device = command.slice(4)
			if (device !== 'FF') this.device = device
			reply('FF01' + this.device)
		} else if (command.startsWith('37')) {
			const repeat = command.slice(2)
			if (repeat !== 'FF') this.repeat = repeat
			reply('B7' + this.repeat)
		} else if (command.startsWith('7F074F')) {
			const area = command.slice(6)
			if (area !== 'FF') this.playArea = area
			reply('FF07CF' + this.playArea)
		}
	}
}

/** A port nothing is listening on */
export async function closedPort(): Promise<number> {
	const recorder = new FakeRecorder()
	await recorder.listen()
	const { port } = recorder
	await recorder.close()
	return port
}
