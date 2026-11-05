import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import {
	GetConfigFields,
	loginPassword,
	trackTimeMode,
	validPort,
	type ModuleConfig,
	type ModuleSecrets,
} from './config.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionSchema } from './actions.js'
import { FeedbackId, UpdateFeedbacks, type FeedbackSchema } from './feedbacks.js'
import { unknownVariables, UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpdatePresets } from './presets.js'
import { CAUTIONS, DEVICES, ERRORS, MECHA_STATUSES, type TrackTimeMode } from './choices.js'
import { cmd, cmdOnKeepAlive, cmdOnLogin } from './consts.js'
import { RecorderConnection, type ConnectionTiming } from './connection.js'
import { parseReply, type ParsedReply } from './parse.js'
import { RecorderState, type RecorderFields } from './recorder.js'
import { choiceLabel, errorMessage, unhandledOption } from './utils.js'

export type ModuleTypes = {
	config: ModuleConfig
	secrets: ModuleSecrets
	actions: ActionSchema
	feedbacks: FeedbackSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

/** The error and caution codes meaning there is none */
const NONE = '0-00'

export default class TascamCdInstance extends InstanceBase<ModuleTypes> {
	config!: ModuleConfig // Setup in init()
	readonly recorder = new RecorderState()
	/** Overrides the connection's timing. Tests shorten it */
	timing: Partial<ConnectionTiming> | undefined
	#connection: RecorderConnection | undefined

	async init(config: ModuleConfig, _isFirstInit: boolean, secrets: ModuleSecrets | undefined): Promise<void> {
		UpdateActions(this)
		UpdateFeedbacks(this)
		UpdateVariableDefinitions(this)
		UpdatePresets(this)
		await this.configUpdated(config, secrets)
	}

	async configUpdated(config: ModuleConfig, secrets: ModuleSecrets | undefined): Promise<void> {
		this.config = config
		this.#close()
		this.#resetState()
		this.#open(loginPassword(secrets))
	}

	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', `destroy. ID: ${this.id}`)
		this.#close()
		this.updateStatus(InstanceStatus.Disconnected)
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	/**
	 * Queues a command for the unit
	 * @param command the command code and its parameters
	 * @param signal an action's context.signal, so a command the user no longer wants is dropped before it is sent
	 * @throws if not logged in, or the command is not sent
	 */
	async sendCommand(command: string, signal?: AbortSignal): Promise<void> {
		if (this.#connection === undefined) throw new Error('Not connected to unit')
		await this.#connection.send(command, signal)
	}

	/** Changes which time the unit is polled for, and saves it to the config */
	setTrackTimeMode(mode: TrackTimeMode): void {
		if (this.config.currentTrackTimeMode === mode) return
		this.config.currentTrackTimeMode = mode
		// undefined leaves the secrets as they are
		this.saveConfig(this.config, undefined)
	}

	#open(password: string): void {
		const host = this.config.host?.trim()
		const port = validPort(this.config.port)
		if (!host) {
			this.updateStatus(InstanceStatus.BadConfig, 'No host')
			return
		}
		if (port === undefined) {
			this.updateStatus(InstanceStatus.BadConfig, `Invalid port ${String(this.config.port)}`)
			return
		}
		const connection = new RecorderConnection({
			host,
			port,
			password,
			log: (level, message) => this.log(level, message),
			pollCommands: () => [...cmdOnKeepAlive, cmd.currentTrackTimeSense + trackTimeMode(this.config)],
			timing: this.timing,
		})
		connection.on('status', (status, message) => this.updateStatus(status, message))
		connection.on('ready', () => this.#queryOnLogin())
		connection.on('closed', () => this.#resetState())
		connection.on('reply', (line) => this.#onReply(parseReply(line)))
		this.#connection = connection
		connection.connect()
	}

	#close(): void {
		this.#connection?.destroy()
		this.#connection = undefined
	}

	/** Forgets everything known about the unit */
	#resetState(): void {
		this.recorder.reset()
		this.setVariableValues(unknownVariables())
		this.checkAllFeedbacks()
	}

	#queryOnLogin(): void {
		this.#send(...cmdOnLogin)
	}

	/** Queues commands the module sends of its own accord, logging rather than throwing if they can't be */
	#send(...commands: string[]): void {
		for (const command of commands) {
			this.sendCommand(command).catch((err) => this.log('debug', `${command} not sent: ${errorMessage(err)}`))
		}
	}

	/** Stores a value the unit reported. @returns whether it changed */
	#set<K extends keyof RecorderFields>(key: K, value: RecorderFields[K], feedback?: FeedbackId): boolean {
		if (!this.recorder.set(key, value)) return false
		if (feedback !== undefined) this.checkFeedbacks(feedback)
		return true
	}

	#onReply(reply: ParsedReply): void {
		switch (reply.type) {
			case 'repeat':
				this.#set('repeat', reply.value, FeedbackId.Repeat)
				break
			case 'incrPlay':
				this.#set('incrPlay', reply.value, FeedbackId.IncrPlay)
				break
			case 'remoteLocal':
				this.#set('remoteLocal', reply.value, FeedbackId.RemoteLocal)
				break
			case 'playMode':
				this.#set('playMode', reply.value, FeedbackId.PlayMode)
				break
			case 'playArea':
				this.#set('playArea', reply.value, FeedbackId.PlayArea)
				break
			case 'mechaStatus':
				if (this.#set('mechaStatus', reply.value, FeedbackId.MechaStatus)) {
					this.setVariableValues({ playState: choiceLabel(MECHA_STATUSES, reply.value) ?? 'Other' })
				}
				break
			case 'device':
				if (this.#set('device', reply.value, FeedbackId.DeviceSelect)) {
					this.setVariableValues({ deviceStatus: choiceLabel(DEVICES, reply.value) ?? `Unknown (${reply.value})` })
				}
				break
			case 'trackNo':
				this.#set('eom', reply.eom, FeedbackId.Eom)
				this.#setTrackNumber(reply.track)
				break
			case 'trackInfo':
				this.#setTrackNumber(reply.track)
				this.#setTrackTime(reply.time)
				break
			case 'trackTime':
				if (reply.mode !== trackTimeMode(this.config)) {
					this.log('debug', `Configured time mode ${trackTimeMode(this.config)}, returned time mode ${reply.mode}`)
				}
				this.#setTrackTime(reply.time)
				break
			case 'error': {
				const label = choiceLabel(ERRORS, reply.code) ?? `Unknown (${reply.code})`
				this.log(reply.code === NONE ? 'info' : 'warn', `Error status: ${label}`)
				if (this.#set('error', reply.code, FeedbackId.Error)) this.setVariableValues({ errorStatus: label })
				break
			}
			case 'caution': {
				const label = choiceLabel(CAUTIONS, reply.code) ?? `Unknown (${reply.code})`
				this.log(reply.code === NONE ? 'info' : 'warn', `Caution status: ${label}`)
				if (this.#set('caution', reply.code, FeedbackId.Caution)) this.setVariableValues({ cautionStatus: label })
				break
			}
			case 'errorSenseRequest':
				this.#send(cmd.errorSense)
				break
			case 'cautionSenseRequest':
				this.#send(cmd.cautionSense)
				break
			case 'change':
				// 00: mecha status changed, 03: take number changed
				if (reply.what === '00') this.#send(cmd.mechaStatusSense)
				else if (reply.what === '03')
					this.#send(cmd.trackNumSense, cmd.currentTrackTimeSense + trackTimeMode(this.config))
				break
			case 'illegal':
				this.log('warn', `Illegal Status, Invalid Command: ${reply.detail}`)
				break
			case 'powerOn':
				this.log('info', 'Power on')
				break
			case 'keepAlive':
			case 'ignored':
				break
			case 'unknown':
				this.log('warn', `Unexpected response from unit: ${reply.text}`)
				break
			default:
				unhandledOption(reply, undefined)
		}
	}

	#setTrackNumber(track: number | undefined): void {
		if (track !== undefined && this.#set('trackNumber', track)) this.setVariableValues({ trackNo: track })
	}

	#setTrackTime(time: string | undefined): void {
		if (time !== undefined && this.#set('trackTime', time)) this.setVariableValues({ trackTime: time })
	}
}
