import type { CompanionActionDefinition, CompanionActionDefinitions, DropdownChoice } from '@companion-module/base'
import type TascamCdInstance from './main.js'
import {
	AUTO_CUE_MODES,
	AUTO_READY_MODES,
	AUTO_TRACK_MODES,
	DEVICE_MODES,
	DEVICES,
	FILE_NAME_MODES,
	INCR_PLAY_MODES,
	INPUT_MODES,
	JOG_MODES,
	KEY_CONTROL_MODES,
	LEVEL_MODES,
	MEDIA_FORMAT_MODES,
	PITCH_CONTROL_MODES,
	PLAY_AREA_MODES,
	PLAY_MODES,
	POWER_MODES,
	RECORD_MODES,
	REMOTE_LOCAL_MODES,
	REPEAT_MODES,
	SHUTTLE_MODES,
	SKIP_MODES,
	SYNC_REC_MODES,
	TRACK_TIME_MODES,
	type AutoCueMode,
	type AutoReadyMode,
	type AutoTrackMode,
	type Device,
	type DeviceMode,
	type FileNameMode,
	type IncrPlayMode,
	type InputMode,
	type JogMode,
	type KeyControlMode,
	type LevelMode,
	type MediaFormatMode,
	type PitchControlMode,
	type PlayAreaMode,
	type PlayMode,
	type PowerMode,
	type RecordMode,
	type RemoteLocalMode,
	type RepeatMode,
	type ShuttleMode,
	type SkipMode,
	type SyncRecMode,
	type TrackTimeMode,
} from './choices.js'
import { cmd, SENSE } from './consts.js'
import { choiceValue } from './utils.js'

/**
 * Action ids. The values are the ids saved against every button using the action, so they must never change. They
 * predate this enum, which is why they are camelCase.
 */
export enum ActionId {
	Stop = 'stop',
	Play = 'play',
	Record = 'record',
	Pause = 'pause',
	Jog = 'jog',
	Shuttle = 'shuttle',
	FlashLoad = 'flashLoad',
	Eject = 'eject',
	Skip = 'skip',
	Call = 'call',
	AutoCueLevelPreset = 'autoCueLevelPreset',
	AutoTrackLevelPreset = 'autoTrackLevelPreset',
	DirectTrackSearchPreset = 'directTrackSearchPreset',
	SyncRecLevelPreset = 'syncRecLevelPreset',
	AutoCueSelect = 'autoCueSelect',
	AutoTrackSelect = 'autoTrackSelect',
	PitchControlSelect = 'pitchControlSelect',
	AutoReadySelect = 'autoReadySelect',
	RepeatMode = 'repeatMode',
	SyncRecSelect = 'syncRecSelect',
	IncrPlaySelect = 'incrPlaySelect',
	KeyControlSelect = 'keyControlSelect',
	RemoteLocalMode = 'remoteLocalMode',
	PlayMode = 'playMode',
	SpecifiedDeviceStatusSense = 'specifiedDeviceStatusSense',
	CurrentTrackTime = 'currentTrackTime',
	PowerControl = 'powerControl',
	DeviceSelect = 'deviceSelect',
	Divide = 'divide',
	Delete = 'delete',
	PlayAreaSelect = 'playAreaSelect',
	FileNameSelect = 'fileNameSelect',
	MediaFormat = 'mediaFormat',
	InputSelect = 'inputSelect',
}

type NoOptions = { options: Record<string, never> }
/** Most actions take one dropdown, saved as `mode` */
type ModeOptions<TMode extends string> = { options: { mode: TMode } }

export type ActionSchema = {
	[ActionId.Stop]: NoOptions
	[ActionId.Play]: NoOptions
	[ActionId.Record]: ModeOptions<RecordMode>
	[ActionId.Pause]: NoOptions
	[ActionId.Jog]: ModeOptions<JogMode>
	[ActionId.Shuttle]: ModeOptions<ShuttleMode>
	[ActionId.FlashLoad]: NoOptions
	[ActionId.Eject]: NoOptions
	[ActionId.Skip]: ModeOptions<SkipMode>
	[ActionId.Call]: NoOptions
	[ActionId.AutoCueLevelPreset]: ModeOptions<LevelMode>
	[ActionId.AutoTrackLevelPreset]: ModeOptions<LevelMode>
	[ActionId.DirectTrackSearchPreset]: { options: { track: number } }
	[ActionId.SyncRecLevelPreset]: ModeOptions<LevelMode>
	[ActionId.AutoCueSelect]: ModeOptions<AutoCueMode>
	[ActionId.AutoTrackSelect]: ModeOptions<AutoTrackMode>
	[ActionId.PitchControlSelect]: ModeOptions<PitchControlMode>
	[ActionId.AutoReadySelect]: ModeOptions<AutoReadyMode>
	[ActionId.RepeatMode]: ModeOptions<RepeatMode>
	[ActionId.SyncRecSelect]: ModeOptions<SyncRecMode>
	[ActionId.IncrPlaySelect]: ModeOptions<IncrPlayMode>
	[ActionId.KeyControlSelect]: ModeOptions<KeyControlMode>
	[ActionId.RemoteLocalMode]: ModeOptions<RemoteLocalMode>
	[ActionId.PlayMode]: ModeOptions<PlayMode>
	[ActionId.SpecifiedDeviceStatusSense]: ModeOptions<Device>
	[ActionId.CurrentTrackTime]: ModeOptions<TrackTimeMode>
	[ActionId.PowerControl]: ModeOptions<PowerMode>
	[ActionId.DeviceSelect]: ModeOptions<DeviceMode>
	[ActionId.Divide]: NoOptions
	[ActionId.Delete]: NoOptions
	[ActionId.PlayAreaSelect]: ModeOptions<PlayAreaMode>
	[ActionId.FileNameSelect]: ModeOptions<FileNameMode>
	[ActionId.MediaFormat]: ModeOptions<MediaFormatMode>
	[ActionId.InputSelect]: ModeOptions<InputMode>
}

export const TRACK_MIN = 1
export const TRACK_MAX = 9999

/**
 * A track number as Direct Track Search takes it: four digits, the low pair first, so track 123 is '2301'
 * @throws if the track is not a whole number from {@link TRACK_MIN} to {@link TRACK_MAX}
 */
export function encodeTrackNumber(track: unknown): string {
	if (typeof track !== 'number' || !Number.isInteger(track) || track < TRACK_MIN || track > TRACK_MAX) {
		throw new Error(`Track number ${String(track)} is not valid`)
	}
	const digits = track.toString().padStart(4, '0')
	return digits.slice(2) + digits.slice(0, 2)
}

/** An action with no options, sending one command */
function commandAction(
	self: TascamCdInstance,
	name: string,
	description: string,
	command: string,
): CompanionActionDefinition<NoOptions> {
	return {
		name,
		description,
		options: [],
		callback: async (_action, { signal }) => self.sendCommand(command, signal),
	}
}

interface ModeActionSpec<TMode extends string> {
	name: string
	description: string
	label?: string
	/** The command the mode is appended to */
	command: string
	choices: readonly DropdownChoice<TMode>[]
	default: TMode
	/** Sent after the command, to have the unit report the new setting */
	sense?: string
}

/** An action sending a command with the mode chosen appended */
function modeAction<TMode extends string>(
	self: TascamCdInstance,
	spec: ModeActionSpec<TMode>,
): CompanionActionDefinition<ModeOptions<TMode>> {
	const label = spec.label ?? 'Mode'
	return {
		name: spec.name,
		description: spec.description,
		options: [{ type: 'dropdown', id: 'mode', label, choices: [...spec.choices], default: spec.default }],
		callback: async ({ options }, { signal }) => {
			const mode = choiceValue(spec.choices, options.mode, label)
			// Both are queued before either is awaited, so they go in this order
			const sent = [self.sendCommand(spec.command + mode, signal)]
			if (spec.sense !== undefined) sent.push(self.sendCommand(spec.sense, signal))
			await Promise.all(sent)
		},
	}
}

export function UpdateActions(self: TascamCdInstance): void {
	const actions: CompanionActionDefinitions<ActionSchema> = {
		[ActionId.Stop]: commandAction(
			self,
			'Stop',
			'STOP puts the controlled device into the stop state and also takes the controlled device out of input monitor mode.',
			cmd.stop,
		),
		[ActionId.Play]: commandAction(
			self,
			'Play',
			'Play puts the controlled device into playback mode and also brings the controlled device from record ready mode to recording mode.',
			cmd.play,
		),
		[ActionId.Record]: modeAction(self, {
			name: 'Record',
			description:
				'RECORD puts the controlled device into record ready mode. It also numbers tracks during recording and puts the controlled device into input monitoring mode when no media is in the controlled device.',
			command: cmd.record,
			choices: RECORD_MODES,
			default: RECORD_MODES[0].id,
		}),
		[ActionId.Pause]: commandAction(
			self,
			'Pause',
			'READY puts the controlled device into playback standby mode or record ready mode.',
			cmd.pause + '01',
		),
		[ActionId.Jog]: modeAction(self, {
			name: 'Jog',
			description: 'Enables JOG playback of the controlled device.',
			command: cmd.jog,
			choices: JOG_MODES,
			default: JOG_MODES[0].id,
		}),
		[ActionId.Shuttle]: modeAction(self, {
			name: 'Shuttle',
			description:
				'SHUTTLE puts the controlled device into the shuttle mode. The controlled device remains in the shuttle mode until it receives a command such as STOP, PLAY, or PAUSE.',
			command: cmd.shuttle,
			choices: SHUTTLE_MODES,
			default: SHUTTLE_MODES[0].id,
		}),
		[ActionId.FlashLoad]: commandAction(
			self,
			'Flash Load',
			'FLASH LOAD puts the controlled device into Flash Load mode.',
			cmd.flashLoad,
		),
		[ActionId.Eject]: commandAction(
			self,
			'Eject',
			'EJECT ejects a CD Media from the controlled device. (If the controlled device is SS-R250N, it returns ILLEGAL [F2].) If the device selected on the controlled device is not CD, this command is ignored.',
			cmd.eject,
		),
		[ActionId.Skip]: modeAction(self, {
			name: 'Skip',
			description: 'SKIP allows the controlled device to skip a track.',
			command: cmd.skip,
			choices: SKIP_MODES,
			default: SKIP_MODES[0].id,
		}),
		[ActionId.Call]: commandAction(
			self,
			'Call',
			'CALL locates the controlled device to a call point and puts the controlled device into the ready state.',
			cmd.call,
		),
		[ActionId.AutoCueLevelPreset]: modeAction(self, {
			name: 'Auto Cue Level Preset',
			description: 'AUTO CUE LEVEL PRESET sets the auto cue level of the controlled device.',
			command: cmd.autoCueLevelPreset,
			choices: LEVEL_MODES,
			default: LEVEL_MODES[0].id,
			sense: cmd.autoCueLevelPreset + SENSE,
		}),
		[ActionId.AutoTrackLevelPreset]: modeAction(self, {
			name: 'Auto Track Level Preset',
			description: 'AUTO TRACK LEVEL PRESET sets the auto track level of the controlled device.',
			command: cmd.autoTrackLevelPreset,
			choices: LEVEL_MODES,
			default: LEVEL_MODES[0].id,
			sense: cmd.autoTrackLevelPreset + SENSE,
		}),
		[ActionId.DirectTrackSearchPreset]: {
			name: 'Direct Track Search Preset',
			description:
				'DIRECT TRACK SEARCH PRESET performs a search for a track on the controlled device by specifying the track number.',
			options: [
				{
					type: 'number',
					id: 'track',
					label: 'Track Number',
					default: TRACK_MIN,
					min: TRACK_MIN,
					max: TRACK_MAX,
					asInteger: true,
				},
			],
			callback: async ({ options }, { signal }) =>
				self.sendCommand(cmd.directTrackSearchPreset + encodeTrackNumber(options.track), signal),
		},
		[ActionId.SyncRecLevelPreset]: modeAction(self, {
			name: 'Sync Rec Level Preset',
			description: 'SYNC REC LEVEL PRESET sets the level of the sync recording of the controlled device.',
			command: cmd.syncRecLevelPreset,
			choices: LEVEL_MODES,
			default: LEVEL_MODES[0].id,
			sense: cmd.syncRecLevelPreset + SENSE,
		}),
		[ActionId.AutoCueSelect]: modeAction(self, {
			name: 'Auto Cue Select',
			description: 'AUTO CUE SELECT turns the Auto-cue mode of the controlled device on or off.',
			command: cmd.autoCueSelect,
			choices: AUTO_CUE_MODES,
			default: AUTO_CUE_MODES[0].id,
			sense: cmd.autoCueSelect + SENSE,
		}),
		[ActionId.AutoTrackSelect]: modeAction(self, {
			name: 'Auto Track Select',
			description: 'AUTO TRACK SELECT sets the Auto Track mode of the controlled device.',
			command: cmd.autoTrackSelect,
			choices: AUTO_TRACK_MODES,
			default: AUTO_TRACK_MODES[0].id,
			sense: cmd.autoTrackSelect + SENSE,
		}),
		[ActionId.PitchControlSelect]: modeAction(self, {
			name: 'Pitch Control Select',
			description: 'PITCH CONTROL SELECT turns the pitch control mode of the controlled device on or off.',
			command: cmd.pitchControlSelect,
			choices: PITCH_CONTROL_MODES,
			default: PITCH_CONTROL_MODES[0].id,
			sense: cmd.pitchControlSelect + SENSE,
		}),
		[ActionId.AutoReadySelect]: modeAction(self, {
			name: 'Auto Ready Select',
			description: 'AUTO READY SELECT turns the auto ready mode of the controlled device on or off.',
			command: cmd.autoReadySelect,
			choices: AUTO_READY_MODES,
			default: AUTO_READY_MODES[0].id,
			sense: cmd.autoReadySelect + SENSE,
		}),
		[ActionId.RepeatMode]: modeAction(self, {
			name: 'Repeat Mode',
			description: 'REPEAT SELECT turns the repeat mode of the controlled device on or off.',
			label: 'Repeat Mode',
			command: cmd.repeatModeSelect,
			choices: REPEAT_MODES,
			default: REPEAT_MODES[0].id,
			sense: cmd.repeatModeSelect + SENSE,
		}),
		[ActionId.SyncRecSelect]: modeAction(self, {
			name: 'Sync Rec Select',
			description: 'SYNC REC SELECT turns the sync rec mode of the controlled device on or off.',
			command: cmd.syncRecSelect,
			choices: SYNC_REC_MODES,
			default: SYNC_REC_MODES[0].id,
			sense: cmd.syncRecSelect + SENSE,
		}),
		[ActionId.IncrPlaySelect]: modeAction(self, {
			name: 'Incremental Playback Select',
			description: 'INCR PLAY SELECT turns the incremental playback mode of the controlled device on or off.',
			command: cmd.incrPlaySelect,
			choices: INCR_PLAY_MODES,
			default: INCR_PLAY_MODES[0].id,
			sense: cmd.incrPlaySelect + SENSE,
		}),
		[ActionId.KeyControlSelect]: modeAction(self, {
			name: 'Key Control Select',
			description: 'KEY CONTROL SELECT turns the key control mode of the controlled device on or off.',
			command: cmd.keyControlSelect,
			choices: KEY_CONTROL_MODES,
			default: KEY_CONTROL_MODES[0].id,
			sense: cmd.keyControlSelect + SENSE,
		}),
		[ActionId.RemoteLocalMode]: modeAction(self, {
			name: 'Remote/Local Select',
			description: 'REMOTE/LOCAL SELECT enables or disables key operation on the controlled device.',
			label: 'Control Mode',
			command: cmd.remoteLocalModeSelect,
			choices: REMOTE_LOCAL_MODES,
			default: REMOTE_LOCAL_MODES[0].id,
			sense: cmd.remoteLocalModeSelect + SENSE,
		}),
		[ActionId.PlayMode]: modeAction(self, {
			name: 'Play Mode Select',
			description: 'PLAY MODE SELECT sets the playback mode of the controlled device.',
			label: 'Play Mode',
			command: cmd.playModeSelect,
			choices: PLAY_MODES,
			default: PLAY_MODES[0].id,
			sense: cmd.playModeSense,
		}),
		[ActionId.SpecifiedDeviceStatusSense]: modeAction(self, {
			name: 'Specified Device Status Sense',
			description:
				'SPECIFIED DEVICE STATUS SENSE requests to return the status of the specified device of the controlled device.',
			label: 'Device',
			command: cmd.specifiedDeviceStatusSense,
			choices: DEVICES,
			default: DEVICES[0].id,
		}),
		[ActionId.CurrentTrackTime]: {
			name: 'Current Track Time Sense',
			description:
				'CURRENT TRACK TIME SENSE sets which time the Track Time variable shows: about the current track or the whole media, when in a playback or a ready state. The choice is saved to the connection config.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: [...TRACK_TIME_MODES],
					default: TRACK_TIME_MODES[0].id,
				},
			],
			callback: async ({ options }, { signal }) => {
				const mode = choiceValue(TRACK_TIME_MODES, options.mode, 'Mode')
				self.setTrackTimeMode(mode)
				await self.sendCommand(cmd.currentTrackTimeSense + mode, signal)
			},
		},
		[ActionId.PowerControl]: modeAction(self, {
			name: 'Power Control',
			description: 'POWER CONTROL turns ON / OFF (standby) the power of the controlled device.',
			command: cmd.powerControl,
			choices: POWER_MODES,
			default: POWER_MODES[0].id,
		}),
		[ActionId.DeviceSelect]: modeAction(self, {
			name: 'Device Select',
			description: 'DEVICE SELECT changes the device to be used on the controlled device.',
			label: 'Device',
			command: cmd.deviceSelect,
			choices: DEVICE_MODES,
			default: DEVICE_MODES[0].id,
			sense: cmd.deviceSelect + SENSE,
		}),
		[ActionId.Divide]: commandAction(
			self,
			'Divide',
			'The File currently in playback standby mode on the controlled device is divided into two files at that point.',
			cmd.divide,
		),
		[ActionId.Delete]: commandAction(
			self,
			'Delete',
			'The file(s) for the current track on the controlled device are deleted.',
			cmd.delete,
		),
		[ActionId.PlayAreaSelect]: modeAction(self, {
			name: 'Play Area Select',
			description: 'PLAY AREA SELECT sets the playback area of the controlled device.',
			command: cmd.playAreaSelect,
			choices: PLAY_AREA_MODES,
			default: PLAY_AREA_MODES[0].id,
			sense: cmd.playAreaSelect + SENSE,
		}),
		[ActionId.FileNameSelect]: modeAction(self, {
			name: 'File Name Select',
			description: 'Set the format of the recording file name of the controlled device.',
			command: cmd.fileNameSelect,
			choices: FILE_NAME_MODES,
			default: FILE_NAME_MODES[0].id,
			sense: cmd.fileNameSelect + SENSE,
		}),
		[ActionId.MediaFormat]: modeAction(self, {
			name: 'Media Format',
			description: 'Formats the selected media in the controlled device.',
			command: cmd.mediaFormat,
			choices: MEDIA_FORMAT_MODES,
			default: MEDIA_FORMAT_MODES[0].id,
		}),
		[ActionId.InputSelect]: modeAction(self, {
			name: 'Input Select',
			description: 'INPUT SELECT sets the input source select of the controlled device.',
			label: 'Input',
			command: cmd.inputSelect,
			choices: INPUT_MODES,
			default: INPUT_MODES[0].id,
			sense: cmd.inputSelect + SENSE,
		}),
	}
	self.setActionDefinitions(actions)
}
