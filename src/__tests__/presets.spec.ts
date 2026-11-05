import { expect, it } from 'vitest'
import type { CompanionOptionValues, CompanionSimplePresetDefinition, DropdownChoice } from '@companion-module/base'
import type { ModuleTypes } from '../main.js'
import { actionDefinitions, fakeInstance, feedbackDefinitions, presetDefinitions } from './fixtures.js'

type Field = { id: string; type: string; choices?: DropdownChoice[] }

/** Every option set is a key the definition has, and a dropdown's value is one of its choices */
function expectValidOptions(fields: readonly Field[], options: CompanionOptionValues, where: string): void {
	for (const [key, value] of Object.entries(options)) {
		const field = fields.find((f) => f.id === key)
		expect(field, `${where}: option ${key}`).toBeDefined()
		if (field?.type === 'dropdown') {
			expect(
				field.choices?.map((c) => c.id),
				`${where}: ${key}`,
			).toContain(value)
		}
	}
}

it('every preset uses actions and feedbacks that exist, with valid options', () => {
	const fake = fakeInstance()
	const actions = actionDefinitions(fake)
	const feedbacks = feedbackDefinitions(fake)
	const { presets } = presetDefinitions(fake)
	for (const [id, preset] of Object.entries(presets)) {
		const simple = preset as CompanionSimplePresetDefinition<ModuleTypes>
		expect(simple.type, id).toBe('simple')
		for (const step of simple.steps) {
			for (const action of [...step.down, ...step.up]) {
				if (!('actionId' in action) || action.actionId.startsWith('internal:')) continue
				const def = actions[action.actionId as keyof typeof actions]
				expect(def, `${id}: ${action.actionId}`).toBeTruthy()
				expectValidOptions((def || undefined)?.options ?? [], action.options as CompanionOptionValues, id)
			}
		}
		for (const feedback of simple.feedbacks) {
			const def = feedbacks[feedback.feedbackId as keyof typeof feedbacks]
			expect(def, `${id}: ${feedback.feedbackId}`).toBeTruthy()
			expectValidOptions((def || undefined)?.options ?? [], feedback.options as CompanionOptionValues, id)
		}
	}
})

it('the structure lists every preset once, and only presets that exist', () => {
	const { structure, presets } = presetDefinitions(fakeInstance())
	const listed = structure.flatMap((section) =>
		section.definitions.flatMap((d) => (typeof d === 'string' ? [d] : d.type === 'simple' ? d.presets : [])),
	)
	expect(listed.toSorted()).toEqual(Object.keys(presets).toSorted())
})
