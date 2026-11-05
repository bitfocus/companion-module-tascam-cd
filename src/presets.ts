import type {
	CompanionButtonStyleProps,
	CompanionPresetDefinitions,
	CompanionPresetSection,
	CompanionSimplePresetDefinition,
	SomePresetActionEntry,
	SomePresetSimpleFeedbackEntry,
} from '@companion-module/base'
import type TascamCdInstance from './main.js'
import type { ModuleTypes } from './main.js'
import { ActionId } from './actions.js'
import { CAUTIONS, DEVICES, ERRORS, type Device, type MechaStatus } from './choices.js'
import { colours, FeedbackId } from './feedbacks.js'
import { icons } from './icons.js'

type Preset = CompanionSimplePresetDefinition<ModuleTypes>
type PresetAction = SomePresetActionEntry<ModuleTypes>
type PresetFeedback = SomePresetSimpleFeedbackEntry<ModuleTypes>

/** The preset id for selecting each device, kept from before this map */
const DEVICE_PRESET_IDS = {
	'00': 'device_SD1',
	'01': 'device_SD2',
	'10': 'device_USB',
	'11': 'device_CD',
} as const satisfies Record<Device, string>

/** The label each device's preset shows */
const DEVICE_PRESET_TEXT = { '00': 'SD 1', '01': 'SD 2', '10': 'USB', '11': 'CD' } as const satisfies Record<
	Device,
	string
>

function devicePreset(device: Device): Preset {
	const text = DEVICE_PRESET_TEXT[device]
	return {
		type: 'simple',
		name: text,
		style: { text, size: '14', color: colours.white, bgcolor: colours.black },
		steps: [{ down: [{ actionId: ActionId.DeviceSelect, options: { mode: device } }], up: [] }],
		feedbacks: [
			{
				feedbackId: FeedbackId.DeviceSelect,
				options: { device },
				style: { color: colours.black, bgcolor: colours.green },
			},
		],
	}
}

/**
 * Shows OK, or the error or caution the unit reports. Errors come after cautions, so an error shows over a caution.
 */
function statusPreset(): Preset {
	const cautions = CAUTIONS.filter((c) => c.id !== '0-00').map((c): PresetFeedback => ({
		feedbackId: FeedbackId.Caution,
		options: { caution: c.id },
		style: { color: colours.black, bgcolor: colours.orange, text: c.label },
	}))
	const errors = ERRORS.filter((e) => e.id !== '0-00').map((e): PresetFeedback => ({
		feedbackId: FeedbackId.Error,
		options: { error: e.id },
		style: { color: colours.black, bgcolor: colours.red, text: e.label },
	}))
	return {
		type: 'simple',
		name: 'Status',
		style: { text: 'OK', size: '14', color: colours.black, bgcolor: colours.green },
		steps: [{ down: [], up: [] }],
		feedbacks: [...cautions, ...errors],
	}
}

function transportStyle(png64: string): CompanionButtonStyleProps {
	return {
		text: '',
		size: '14',
		png64,
		pngalignment: 'center:center',
		color: colours.white,
		bgcolor: colours.black,
		show_topbar: false,
	}
}

/** Lit in each colour while the unit reports the mecha status it is paired with */
function mechaStatusFeedbacks(...states: [MechaStatus, number][]): PresetFeedback[] {
	return states.map(([status, bgcolor]) => ({
		feedbackId: FeedbackId.MechaStatus,
		options: { status },
		style: { color: colours.black, bgcolor },
	}))
}

function transportPreset(name: string, png64: string, action: PresetAction, feedbacks: PresetFeedback[] = []): Preset {
	return {
		type: 'simple',
		name,
		style: transportStyle(png64),
		steps: [{ down: [action], up: [] }],
		feedbacks,
	}
}

export function UpdatePresets(self: TascamCdInstance): void {
	const presets: CompanionPresetDefinitions<ModuleTypes> = {
		status: statusPreset(),
		play: transportPreset(
			'Play',
			icons.play,
			{ actionId: ActionId.Play, options: {} },
			mechaStatusFeedbacks(['11', colours.green]),
		),
		pause: transportPreset(
			'Pause',
			icons.pause,
			{ actionId: ActionId.Pause, options: {} },
			mechaStatusFeedbacks(['12', colours.orange]),
		),
		stop: transportPreset(
			'Stop',
			icons.stop,
			{ actionId: ActionId.Stop, options: {} },
			mechaStatusFeedbacks(['10', colours.red]),
		),
		record: transportPreset(
			'Record',
			icons.record,
			{ actionId: ActionId.Record, options: { mode: '00' } },
			mechaStatusFeedbacks(['81', colours.red], ['82', colours.orange]),
		),
		eject: transportPreset(
			'Eject',
			icons.eject,
			{ actionId: ActionId.Eject, options: {} },
			mechaStatusFeedbacks(['01', colours.red]),
		),
		skip_back_track: transportPreset('Track Skip Previous', icons.skipback, {
			actionId: ActionId.Skip,
			options: { mode: '01' },
		}),
		skip_forward_track: transportPreset('Track Skip Next', icons.skipforward, {
			actionId: ActionId.Skip,
			options: { mode: '00' },
		}),
		skip_back_mark: transportPreset('Mark Skip Previous', icons.skipback, {
			actionId: ActionId.Skip,
			options: { mode: '21' },
		}),
		skip_forward_mark: transportPreset('Mark Skip Next', icons.skipforward, {
			actionId: ActionId.Skip,
			options: { mode: '20' },
		}),
		skip_back_time: transportPreset('Time Skip Previous', icons.skipback, {
			actionId: ActionId.Skip,
			options: { mode: '31' },
		}),
		skip_forward_time: transportPreset('Time Skip Next', icons.skipforward, {
			actionId: ActionId.Skip,
			options: { mode: '30' },
		}),
		jog_back: transportPreset(
			'Jog Back',
			icons.searchback,
			{ actionId: ActionId.Jog, options: { mode: '11' } },
			mechaStatusFeedbacks(['29', colours.red]),
		),
		jog_forward: transportPreset(
			'Jog Forward',
			icons.searchforward,
			{ actionId: ActionId.Jog, options: { mode: '10' } },
			mechaStatusFeedbacks(['28', colours.red]),
		),
		shuttle_back: transportPreset(
			'Shuttle Back',
			icons.searchback,
			{ actionId: ActionId.Shuttle, options: { mode: '01' } },
			mechaStatusFeedbacks(['29', colours.red]),
		),
		shuttle_forward: transportPreset(
			'Shuttle Forward',
			icons.searchforward,
			{ actionId: ActionId.Shuttle, options: { mode: '00' } },
			mechaStatusFeedbacks(['28', colours.red]),
		),
	}
	for (const { id } of DEVICES) presets[DEVICE_PRESET_IDS[id]] = devicePreset(id)

	const structure: CompanionPresetSection<ModuleTypes>[] = [
		{
			id: 'device_select',
			name: 'Device Select',
			definitions: DEVICES.map(({ id }) => DEVICE_PRESET_IDS[id]),
		},
		{ id: 'status', name: 'Status', definitions: ['status'] },
		{
			id: 'transport',
			name: 'Transport',
			definitions: [
				{
					id: 'transport_main',
					type: 'simple',
					name: 'Transport',
					presets: ['play', 'pause', 'stop', 'record', 'eject'],
				},
				{ id: 'skip_track', type: 'simple', name: 'Track Skip', presets: ['skip_back_track', 'skip_forward_track'] },
				{ id: 'skip_mark', type: 'simple', name: 'Mark Skip', presets: ['skip_back_mark', 'skip_forward_mark'] },
				{ id: 'skip_time', type: 'simple', name: 'Time Skip', presets: ['skip_back_time', 'skip_forward_time'] },
				{ id: 'jog', type: 'simple', name: 'Jog', presets: ['jog_back', 'jog_forward'] },
				{ id: 'shuttle', type: 'simple', name: 'Shuttle', presets: ['shuttle_back', 'shuttle_forward'] },
			],
		},
	]
	self.setPresetDefinitions(structure, presets)
}
