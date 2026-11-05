import { Regex, type SomeCompanionConfigField } from '@companion-module/base'
import { TRACK_TIME_MODES, type TrackTimeMode } from './choices.js'

export const DEFAULT_PORT = 23
export const DEFAULT_PASSWORD = 'SS-CDR250N'

/** The longest password the unit takes */
export const PASSWORD_MAX_LENGTH = 10

export type ModuleConfig = {
	host: string
	port: number
	/**
	 * Which time the unit is polled for, and so what the Track Time variable shows. The Current Track Time Sense action
	 * changes it, and saves the config. Configs saved before it was a field may not have it.
	 */
	currentTrackTimeMode?: TrackTimeMode
}

/**
 * Kept out of the config, which Companion reports in full to the web UI. The password was in the config until
 * UpgradeScripts[2] moved it here.
 */
export type ModuleSecrets = {
	/** Empty if the unit has none */
	password: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Device IP',
			width: 12,
			regex: Regex.HOSTNAME,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Port',
			width: 6,
			min: 1,
			max: 65535,
			default: DEFAULT_PORT,
			tooltip: 'Port is not configurable on unit, only change in advanced configurations',
		},
		{
			type: 'secret-text',
			id: 'password',
			label: 'Password',
			width: 6,
			default: DEFAULT_PASSWORD,
			regex: `/^.{0,${PASSWORD_MAX_LENGTH}}$/`,
			tooltip: 'Defaults to model name: SS-CDR250N / SS-R250N. Leave empty if the unit has no password',
		},
		{
			type: 'dropdown',
			id: 'currentTrackTimeMode',
			label: 'Track Time',
			width: 6,
			choices: [...TRACK_TIME_MODES],
			default: TRACK_TIME_MODES[0].id,
			tooltip: 'The time the Track Time variable shows. The Current Track Time Sense action changes this too',
		},
	]
}

/** The port, or undefined if it is not one TCP can use. A saved config isn't checked against its field's min and max */
export function validPort(port: unknown): number | undefined {
	return typeof port === 'number' && Number.isInteger(port) && port >= 1 && port <= 65535 ? port : undefined
}

/** The configured track time mode, or Elapsed Time for a config saved before it was a field, or holding a bad value */
export function trackTimeMode(config: ModuleConfig): TrackTimeMode {
	return TRACK_TIME_MODES.find((c) => c.id === config.currentTrackTimeMode)?.id ?? TRACK_TIME_MODES[0].id
}

/**
 * The password to log in with. Secrets saved before the password was one may not have it, and a saved secret isn't
 * checked against its field, so anything but a string is taken as no password.
 */
export function loginPassword(secrets: ModuleSecrets | undefined): string {
	const password: unknown = secrets?.password
	return typeof password === 'string' ? password : ''
}
