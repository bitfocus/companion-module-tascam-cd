import { vi } from 'vitest'
import type {
	CompanionActionCallbackContext,
	CompanionActionDefinitions,
	CompanionActionEvent,
	CompanionFeedbackBooleanEvent,
	CompanionFeedbackCallbackContext,
	CompanionFeedbackDefinitions,
	CompanionOptionValues,
	CompanionPresetDefinitions,
	CompanionPresetSection,
} from '@companion-module/base'
import type TascamCdInstance from '../main.js'
import type { ModuleTypes } from '../main.js'
import { UpdateActions, type ActionId, type ActionSchema } from '../actions.js'
import { UpdateFeedbacks, type FeedbackId, type FeedbackSchema } from '../feedbacks.js'
import { UpdatePresets } from '../presets.js'
import { RecorderState } from '../recorder.js'

function createMocks() {
	return {
		sendCommand: vi.fn<TascamCdInstance['sendCommand']>(async () => {}),
		setTrackTimeMode: vi.fn<TascamCdInstance['setTrackTimeMode']>(),
		setActionDefinitions: vi.fn<(defs: CompanionActionDefinitions<ActionSchema>) => void>(),
		setFeedbackDefinitions: vi.fn<(defs: CompanionFeedbackDefinitions<FeedbackSchema>) => void>(),
		setPresetDefinitions:
			vi.fn<
				(structure: CompanionPresetSection<ModuleTypes>[], presets: CompanionPresetDefinitions<ModuleTypes>) => void
			>(),
	}
}

export type FakeInstance = { self: TascamCdInstance; recorder: RecorderState } & ReturnType<typeof createMocks>

/**
 * A plain object standing in for the instance, for the definitions to be built from. The recorder state is real;
 * everything that would reach Companion or the unit is a mock.
 */
export function fakeInstance(): FakeInstance {
	const mocks = createMocks()
	const recorder = new RecorderState()
	const self = { recorder, ...mocks } as unknown as TascamCdInstance
	return { self, recorder, ...mocks }
}

export function actionDefinitions(fake: FakeInstance): CompanionActionDefinitions<ActionSchema> {
	UpdateActions(fake.self)
	return fake.setActionDefinitions.mock.calls[0][0]
}

export function feedbackDefinitions(fake: FakeInstance): CompanionFeedbackDefinitions<FeedbackSchema> {
	UpdateFeedbacks(fake.self)
	return fake.setFeedbackDefinitions.mock.calls[0][0]
}

export function presetDefinitions(fake: FakeInstance): {
	structure: CompanionPresetSection<ModuleTypes>[]
	presets: CompanionPresetDefinitions<ModuleTypes>
} {
	UpdatePresets(fake.self)
	const [structure, presets] = fake.setPresetDefinitions.mock.calls[0]
	return { structure, presets }
}

// The definitions' hooks are typed per action. These take any options, as the values Companion passes are not checked
type AnyCallback = (event: CompanionActionEvent, context: CompanionActionCallbackContext) => Promise<void> | void
type AnyFeedbackCallback = (event: CompanionFeedbackBooleanEvent, context: CompanionFeedbackCallbackContext) => boolean

/** Runs an action's callback as Companion would, with the option values already resolved */
export async function runAction(
	defs: CompanionActionDefinitions<ActionSchema>,
	actionId: ActionId,
	options: CompanionOptionValues = {},
	signal = new AbortController().signal,
): Promise<void> {
	const def = defs[actionId]
	if (!def) throw new Error(`${actionId} is not defined`)
	const event: CompanionActionEvent = {
		id: `action-${actionId}`,
		controlId: 'bank-1',
		actionId,
		surfaceId: undefined,
		options,
	}
	await (def.callback as AnyCallback)(event, { type: 'action', signal } as never)
}

export function checkFeedback(
	defs: CompanionFeedbackDefinitions<FeedbackSchema>,
	feedbackId: FeedbackId,
	options: CompanionOptionValues = {},
): boolean {
	const def = defs[feedbackId]
	if (!def) throw new Error(`${feedbackId} is not defined`)
	const event: CompanionFeedbackBooleanEvent = {
		type: 'boolean',
		id: `feedback-${feedbackId}`,
		controlId: 'bank-1',
		feedbackId,
		options,
		previousOptions: null,
	}
	return (def.callback as AnyFeedbackCallback)(event, { type: 'feedback', signal: new AbortController().signal })
}
