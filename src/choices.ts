import type { DropdownChoice } from '@companion-module/base'
import { SENSE } from './consts.js'

/**
 * Dropdown choices. The ids are the parameters the unit takes and reports, and are saved against every button using
 * them, so they must never change.
 */

type Choices = readonly DropdownChoice<string>[]
type ChoiceId<T extends Choices> = T[number]['id']

/** Asks a select command for the current setting. Offered by the actions that had it, as buttons may be saved with it */
const SENSE_CHOICE = { id: SENSE, label: 'Sense' } as const satisfies DropdownChoice<string>

export const RECORD_MODES = [
	{ id: '00', label: 'Record' },
	{ id: '01', label: 'Record Ready' },
	{ id: '02', label: 'Track Mark' },
	{ id: '10', label: 'Input Monitor' },
] as const satisfies Choices
export type RecordMode = ChoiceId<typeof RECORD_MODES>

export const JOG_MODES = [
	{ id: '00', label: 'OFF' },
	{ id: '01', label: 'ON' },
	{ id: '10', label: 'Jog Forward' },
	{ id: '11', label: 'Jog Reverse' },
] as const satisfies Choices
export type JogMode = ChoiceId<typeof JOG_MODES>

export const SHUTTLE_MODES = [
	{ id: '00', label: 'Shuttle Forward' },
	{ id: '01', label: 'Shuttle Reverse' },
] as const satisfies Choices
export type ShuttleMode = ChoiceId<typeof SHUTTLE_MODES>

export const SKIP_MODES = [
	{ id: '00', label: 'Track Skip Next' },
	{ id: '01', label: 'Track Skip Previous' },
	{ id: '20', label: 'Mark Skip Next' },
	{ id: '21', label: 'Mark Skip Previous' },
	{ id: '30', label: 'Time Skip Next' },
	{ id: '31', label: 'Time Skip Previous' },
] as const satisfies Choices
export type SkipMode = ChoiceId<typeof SKIP_MODES>

/** Auto cue, auto track and sync rec levels */
export const LEVEL_MODES = [
	{ id: '00', label: '-24dB' },
	{ id: '01', label: '-30dB' },
	{ id: '02', label: '-36dB' },
	{ id: '03', label: '-42dB' },
	{ id: '04', label: '-48dB' },
	{ id: '05', label: '-54dB' },
	{ id: '06', label: '-60dB' },
	{ id: '07', label: '-66dB' },
	{ id: '08', label: '-72dB' },
	SENSE_CHOICE,
] as const satisfies Choices
export type LevelMode = ChoiceId<typeof LEVEL_MODES>

export const AUTO_CUE_MODES = [
	{ id: '00', label: 'Auto-cue mode OFF' },
	{ id: '01', label: 'Auto-cue mode ON' },
	SENSE_CHOICE,
] as const satisfies Choices
export type AutoCueMode = ChoiceId<typeof AUTO_CUE_MODES>

export const AUTO_TRACK_MODES = [
	{ id: '00', label: 'Auto Track OFF' },
	{ id: '01', label: 'Auto Track ON (LEVEL)' },
	{ id: '02', label: 'Auto Track ON (Digital Direct)' },
	{ id: '03', label: 'Auto Track ON (TIME)' },
	{ id: '04', label: 'Auto Track ON (SIZE)' },
	SENSE_CHOICE,
] as const satisfies Choices
export type AutoTrackMode = ChoiceId<typeof AUTO_TRACK_MODES>

export const PITCH_CONTROL_MODES = [
	{ id: '00', label: 'Pitch control OFF' },
	{ id: '01', label: 'Pitch control ON' },
	SENSE_CHOICE,
] as const satisfies Choices
export type PitchControlMode = ChoiceId<typeof PITCH_CONTROL_MODES>

export const AUTO_READY_MODES = [
	{ id: '00', label: 'Auto-ready OFF' },
	{ id: '01', label: 'Auto-ready ON' },
	SENSE_CHOICE,
] as const satisfies Choices
export type AutoReadyMode = ChoiceId<typeof AUTO_READY_MODES>

export const REPEAT_STATES = [
	{ id: '00', label: 'Repeat OFF' },
	{ id: '01', label: 'Repeat ON' },
] as const satisfies Choices
export type RepeatState = ChoiceId<typeof REPEAT_STATES>
export const REPEAT_MODES = [...REPEAT_STATES, SENSE_CHOICE] as const satisfies Choices
export type RepeatMode = ChoiceId<typeof REPEAT_MODES>

export const SYNC_REC_MODES = [
	{ id: '00', label: 'Sync Rec OFF' },
	{ id: '01', label: 'Sync Rec ON' },
	SENSE_CHOICE,
] as const satisfies Choices
export type SyncRecMode = ChoiceId<typeof SYNC_REC_MODES>

export const INCR_PLAY_STATES = [
	{ id: '00', label: 'Incremental Playback OFF' },
	{ id: '01', label: 'Incremental Playback ON' },
] as const satisfies Choices
export type IncrPlayState = ChoiceId<typeof INCR_PLAY_STATES>
export const INCR_PLAY_MODES = [...INCR_PLAY_STATES, SENSE_CHOICE] as const satisfies Choices
export type IncrPlayMode = ChoiceId<typeof INCR_PLAY_MODES>

export const KEY_CONTROL_MODES = [
	{ id: '00', label: 'Key control mode OFF' },
	{ id: '01', label: 'Key control mode ON' },
	SENSE_CHOICE,
] as const satisfies Choices
export type KeyControlMode = ChoiceId<typeof KEY_CONTROL_MODES>

export const REMOTE_LOCAL_STATES = [
	{ id: '00', label: 'Remote Only' },
	{ id: '01', label: 'Local and Remote' },
] as const satisfies Choices
export type RemoteLocalState = ChoiceId<typeof REMOTE_LOCAL_STATES>
export const REMOTE_LOCAL_MODES = [...REMOTE_LOCAL_STATES, SENSE_CHOICE] as const satisfies Choices
export type RemoteLocalMode = ChoiceId<typeof REMOTE_LOCAL_MODES>

/** Play modes the Play Mode Select action sets */
export const PLAY_MODES = [
	{ id: '00', label: 'Continuous' },
	{ id: '01', label: 'Single' },
	{ id: '04', label: 'Program' },
	{ id: '06', label: 'Random' },
] as const satisfies Choices
export type PlayMode = ChoiceId<typeof PLAY_MODES>

/** Play modes the unit reports, which tell apart a program with and without data */
export const PLAY_MODE_STATES = [
	{ id: '00', label: 'Continuous' },
	{ id: '01', label: 'Single' },
	{ id: '04', label: 'Program (data not available)' },
	{ id: '05', label: 'Program (data available)' },
	{ id: '06', label: 'Random' },
] as const satisfies Choices
export type PlayModeState = ChoiceId<typeof PLAY_MODE_STATES>

export const DEVICES = [
	{ id: '00', label: 'SD1' },
	{ id: '01', label: 'SD2' },
	{ id: '10', label: 'USB' },
	{ id: '11', label: 'CD' },
] as const satisfies Choices
export type Device = ChoiceId<typeof DEVICES>
export const DEVICE_MODES = [...DEVICES, SENSE_CHOICE] as const satisfies Choices
export type DeviceMode = ChoiceId<typeof DEVICE_MODES>

export const TRACK_TIME_MODES = [
	{ id: '00', label: 'Elapsed Time' },
	{ id: '01', label: 'Remain Time' },
	{ id: '02', label: 'Total Elapsed Time' },
	{ id: '03', label: 'Total Remain Time' },
] as const satisfies Choices
export type TrackTimeMode = ChoiceId<typeof TRACK_TIME_MODES>

export const POWER_MODES = [
	{ id: '00', label: 'Power On' },
	{ id: '11', label: 'Power Off' },
	{ id: '80', label: 'Reset' },
] as const satisfies Choices
export type PowerMode = ChoiceId<typeof POWER_MODES>

export const PLAY_AREA_STATES = [
	{ id: '00', label: 'All' },
	{ id: '01', label: 'Folder' },
	{ id: '02', label: 'Playlist' },
] as const satisfies Choices
export type PlayAreaState = ChoiceId<typeof PLAY_AREA_STATES>
export const PLAY_AREA_MODES = [...PLAY_AREA_STATES, SENSE_CHOICE] as const satisfies Choices
export type PlayAreaMode = ChoiceId<typeof PLAY_AREA_MODES>

export const FILE_NAME_MODES = [
	{ id: '00', label: 'DATE/TIME' },
	{ id: '10', label: 'USER01' },
	{ id: '11', label: 'USER02' },
	{ id: '12', label: 'USER03' },
	{ id: '13', label: 'USER04' },
	{ id: '14', label: 'USER05' },
	SENSE_CHOICE,
] as const satisfies Choices
export type FileNameMode = ChoiceId<typeof FILE_NAME_MODES>

export const MEDIA_FORMAT_MODES = [
	{ id: '00', label: 'Quick Format' },
	{ id: '01', label: 'Full Format' },
] as const satisfies Choices
export type MediaFormatMode = ChoiceId<typeof MEDIA_FORMAT_MODES>

/** Sense is '00FF' rather than 'FF', as saved on existing buttons. The action follows every selection with 'FF' */
export const INPUT_MODES = [
	{ id: '000000', label: 'ANALOG BALANCED' },
	{ id: '000001', label: 'ANALOG UNBALANCED' },
	{ id: '000100', label: 'DIGITAL XLR' },
	{ id: '000101', label: 'DIGITAL COAXIAL' },
	{ id: '000200', label: 'IF-DA2(DANTE)' },
	{ id: '00FF', label: 'Sense' },
] as const satisfies Choices
export type InputMode = ChoiceId<typeof INPUT_MODES>

export const MECHA_STATUSES = [
	{ id: '00', label: 'No Media' },
	{ id: '01', label: 'Preparing for disc ejection' },
	{ id: '10', label: 'Stop' },
	{ id: '11', label: 'Play' },
	{ id: '12', label: 'Ready On (Pause)' },
	{ id: '28', label: 'Cue - Searching forward' },
	{ id: '29', label: 'Review - Searching backward' },
	{ id: '80', label: 'Monitor' },
	{ id: '81', label: 'Record' },
	{ id: '82', label: 'Record Pause' },
	{ id: '83', label: 'Information Writing' },
	{ id: 'FF', label: 'Other' },
] as const satisfies Choices
export type MechaStatus = ChoiceId<typeof MECHA_STATUSES>

/** Ids are the error's category and code, as `<category>-<code>` */
export const ERRORS = [
	{ id: '0-00', label: 'No Error' },
	{ id: '0-01', label: 'Record Error' },
	{ id: '1-02', label: 'Device Error' },
	{ id: '1-08', label: 'Stand-By Error' },
	{ id: '1-09', label: 'Information Write Error' },
	{ id: '1-FF', label: 'Other Error' },
] as const satisfies Choices
export type ErrorCode = ChoiceId<typeof ERRORS>

/** Ids are as {@link ERRORS} */
export const CAUTIONS = [
	{ id: '0-00', label: 'No Caution' },
	{ id: '1-02', label: 'Media Error' },
	{ id: '1-03', label: "Can't Undo" },
	{ id: '1-06', label: 'Media Full' },
	{ id: '1-07', label: 'Track Full' },
	{ id: '1-09', label: 'Digital In Unlock' },
	{ id: '1-0A', label: 'No Call Point' },
	{ id: '1-0B', label: "Can't REC" },
	{ id: '1-0C', label: 'Write Protected' },
	{ id: '1-0D', label: 'Not Execute' },
	{ id: '1-0F', label: "Can't Edit" },
	{ id: '1-13', label: "Can't Select" },
	{ id: '1-14', label: 'Track Protected' },
	{ id: '1-16', label: 'Name Full' },
	{ id: '1-18', label: 'Play List Error' },
	{ id: '1-1D', label: 'Not Audio' },
	{ id: '1-1E', label: 'Decode Error' },
	{ id: '1-1F', label: 'Media Not Match' },
	{ id: '1-FF', label: 'Other Caution' },
] as const satisfies Choices
export type CautionCode = ChoiceId<typeof CAUTIONS>
