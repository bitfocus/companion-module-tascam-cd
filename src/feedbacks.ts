import {
	combineRgb,
	type CompanionFeedbackBooleanEvent,
	type CompanionFeedbackDefinition,
	type CompanionFeedbackDefinitions,
	type DropdownChoice,
} from '@companion-module/base'
import type TascamCdInstance from './main.js'
import {
	CAUTIONS,
	DEVICES,
	ERRORS,
	INCR_PLAY_STATES,
	MECHA_STATUSES,
	PLAY_AREA_STATES,
	PLAY_MODE_STATES,
	REMOTE_LOCAL_STATES,
	REPEAT_STATES,
	type CautionCode,
	type Device,
	type ErrorCode,
	type IncrPlayState,
	type MechaStatus,
	type PlayAreaState,
	type PlayModeState,
	type RemoteLocalState,
	type RepeatState,
} from './choices.js'
import type { RecorderFields } from './recorder.js'

export const colours = {
	black: combineRgb(0, 0, 0),
	white: combineRgb(255, 255, 255),
	red: combineRgb(255, 0, 0),
	orange: combineRgb(255, 128, 0),
	green: combineRgb(0, 204, 0),
}

/**
 * Feedback ids. The values are the ids saved against every button using the feedback, so they must never change. They
 * predate this enum, which is why they are camelCase.
 */
export enum FeedbackId {
	Repeat = 'repeat',
	IncrPlay = 'incrPlay',
	RemoteLocal = 'remoteLocal',
	PlayMode = 'playMode',
	MechaStatus = 'mechaStatus',
	Error = 'error',
	Caution = 'caution',
	DeviceSelect = 'deviceSelect',
	PlayArea = 'playArea',
	Eom = 'eom',
}

/** A feedback true while the unit reports the value chosen. The option keys are saved against every button too */
type StateFeedback<TKey extends string, TValue extends string> = {
	type: 'boolean'
	options: Record<TKey, TValue>
}

export type FeedbackSchema = {
	[FeedbackId.Repeat]: StateFeedback<'status', RepeatState>
	[FeedbackId.IncrPlay]: StateFeedback<'status', IncrPlayState>
	[FeedbackId.RemoteLocal]: StateFeedback<'status', RemoteLocalState>
	[FeedbackId.PlayMode]: StateFeedback<'status', PlayModeState>
	[FeedbackId.MechaStatus]: StateFeedback<'status', MechaStatus>
	[FeedbackId.Error]: StateFeedback<'error', ErrorCode>
	[FeedbackId.Caution]: StateFeedback<'caution', CautionCode>
	[FeedbackId.DeviceSelect]: StateFeedback<'device', Device>
	[FeedbackId.PlayArea]: StateFeedback<'playArea', PlayAreaState>
	[FeedbackId.Eom]: { type: 'boolean'; options: Record<string, never> }
}

/** The recorder fields a {@link stateFeedback} can compare against */
type StateField = {
	[K in keyof RecorderFields]: RecorderFields[K] extends string | undefined ? K : never
}[keyof RecorderFields]

interface StateFeedbackSpec<TKey extends string, TValue extends string> {
	name: string
	/** The option's key */
	id: TKey
	label: string
	choices: readonly DropdownChoice<TValue>[]
	default: TValue
	field: StateField
}

/** A feedback true while a recorder field holds the value chosen */
function stateFeedback<TKey extends string, TValue extends string>(
	self: TascamCdInstance,
	spec: StateFeedbackSpec<TKey, TValue>,
): CompanionFeedbackDefinition<StateFeedback<TKey, TValue>> {
	return {
		name: spec.name,
		type: 'boolean',
		defaultStyle: { bgcolor: colours.red, color: colours.black },
		options: [
			{
				type: 'dropdown',
				// Extract<TKey, string> is TKey, as TKey extends string, but TypeScript doesn't resolve that for a generic
				id: spec.id as Extract<TKey, string>,
				label: spec.label,
				choices: [...spec.choices],
				default: spec.default,
			},
		],
		callback: ({ options }: CompanionFeedbackBooleanEvent<Record<TKey, TValue>>) => {
			const value = self.recorder.get(spec.field)
			return value !== undefined && value === options[spec.id]
		},
	}
}

export function UpdateFeedbacks(self: TascamCdInstance): void {
	const feedbacks: CompanionFeedbackDefinitions<FeedbackSchema> = {
		[FeedbackId.Repeat]: stateFeedback(self, {
			name: 'Repeat',
			id: 'status',
			label: 'Status',
			choices: REPEAT_STATES,
			default: REPEAT_STATES[0].id,
			field: 'repeat',
		}),
		[FeedbackId.IncrPlay]: stateFeedback(self, {
			name: 'Incremental Play',
			id: 'status',
			label: 'Status',
			choices: INCR_PLAY_STATES,
			default: INCR_PLAY_STATES[0].id,
			field: 'incrPlay',
		}),
		[FeedbackId.RemoteLocal]: stateFeedback(self, {
			name: 'Remote/Local Control',
			id: 'status',
			label: 'Status',
			choices: REMOTE_LOCAL_STATES,
			default: REMOTE_LOCAL_STATES[0].id,
			field: 'remoteLocal',
		}),
		[FeedbackId.PlayMode]: stateFeedback(self, {
			name: 'Play Mode',
			id: 'status',
			label: 'Mode',
			choices: PLAY_MODE_STATES,
			default: PLAY_MODE_STATES[0].id,
			field: 'playMode',
		}),
		[FeedbackId.MechaStatus]: stateFeedback(self, {
			name: 'Mecha Status',
			id: 'status',
			label: 'Status',
			choices: MECHA_STATUSES,
			default: MECHA_STATUSES[0].id,
			field: 'mechaStatus',
		}),
		[FeedbackId.Error]: stateFeedback(self, {
			name: 'Error State',
			id: 'error',
			label: 'Error',
			choices: ERRORS,
			default: ERRORS[0].id,
			field: 'error',
		}),
		[FeedbackId.Caution]: stateFeedback(self, {
			name: 'Caution State',
			id: 'caution',
			label: 'Caution',
			choices: CAUTIONS,
			default: CAUTIONS[0].id,
			field: 'caution',
		}),
		[FeedbackId.DeviceSelect]: stateFeedback(self, {
			name: 'Device Select',
			id: 'device',
			label: 'Device',
			choices: DEVICES,
			default: DEVICES[0].id,
			field: 'device',
		}),
		[FeedbackId.PlayArea]: stateFeedback(self, {
			name: 'Play Area',
			id: 'playArea',
			label: 'Play Area',
			choices: PLAY_AREA_STATES,
			default: PLAY_AREA_STATES[0].id,
			field: 'playArea',
		}),
		[FeedbackId.Eom]: {
			name: 'End Of Media',
			type: 'boolean',
			defaultStyle: { bgcolor: colours.red, color: colours.black },
			options: [],
			callback: () => self.recorder.get('eom'),
		},
	}
	self.setFeedbackDefinitions(feedbacks)
}
