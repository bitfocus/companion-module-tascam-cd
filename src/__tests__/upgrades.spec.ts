import { describe, expect, it } from 'vitest'
import type {
	CompanionMigrationAction,
	CompanionStaticUpgradeProps,
	CompanionUpgradeContext,
} from '@companion-module/base'
import { UpgradeScripts, numericActionOptionsApi2 } from '../upgrades.js'
import { ActionId } from '../actions.js'
import { GetConfigFields, type ModuleConfig, type ModuleSecrets } from '../config.js'
import { actionDefinitions, fakeInstance } from './fixtures.js'

/**
 * Upgrade scripts are order-sensitive: a stored upgrade index records how far a configuration has been migrated, so
 * scripts may only ever be appended. Pin the indexes rather than taking the last entry, so appending a script can't
 * silently retarget this suite.
 */
const PRE200_SCRIPT_INDEX = 0
const API2_SCRIPT_INDEX = 1
const PASSWORD_SCRIPT_INDEX = 2
const EXPECTED_SCRIPT_COUNT = 3

// Options reach upgrade scripts already wrapped as ExpressionOrValue — Companion does that before running them
const v = (value: unknown) => ({ isExpression: false, value })

function action(actionId: string, options: Record<string, unknown>): CompanionMigrationAction {
	return {
		id: `action-${actionId}`,
		controlId: 'bank-1',
		actionId,
		options: options as CompanionMigrationAction['options'],
	}
}

const config = (overrides: Record<string, unknown> = {}) =>
	({ host: '10.0.0.1', port: 23, password: 'SS-CDR250N', ...overrides }) as ModuleConfig

function run(
	index: number,
	actions: CompanionMigrationAction[],
	savedConfig: ModuleConfig | null = null,
	savedSecrets: ModuleSecrets | null = null,
) {
	return UpgradeScripts[index]({} as CompanionUpgradeContext<ModuleConfig>, {
		config: savedConfig,
		secrets: savedSecrets,
		actions,
		feedbacks: [],
	} satisfies CompanionStaticUpgradeProps<ModuleConfig, ModuleSecrets>)
}

it('the scripts sit at the indexes this suite targets', () => {
	// Appending a script is fine — bump EXPECTED_SCRIPT_COUNT. Never insert, reorder or remove one.
	expect(UpgradeScripts).toHaveLength(EXPECTED_SCRIPT_COUNT)
})

describe('pre-2.0.0 upgrade script', () => {
	it('folds the 1.x actions into ones taking a mode, writing options as Companion stores them', () => {
		const actions = [
			action('recordready', {}),
			action('mark', {}),
			action('next', {}),
			action('powerOff', {}),
			action('jump', { track: v('0012') }),
			action('stop', {}),
		]
		const result = run(PRE200_SCRIPT_INDEX, actions)
		expect(result.updatedActions).toEqual(actions.slice(0, 5))
		expect(actions.map(({ actionId, options }) => ({ actionId, options }))).toEqual([
			{ actionId: ActionId.Record, options: { mode: v('01') } },
			{ actionId: ActionId.Record, options: { mode: v('02') } },
			{ actionId: ActionId.Skip, options: { mode: v('00') } },
			{ actionId: ActionId.PowerControl, options: { mode: v('11') } },
			{ actionId: ActionId.DirectTrackSearchPreset, options: { track: v('0012') } },
			{ actionId: ActionId.Stop, options: {} },
		])
	})

	it('gives a config with no port the default', () => {
		expect(run(PRE200_SCRIPT_INDEX, [], config({ port: undefined })).updatedConfig).toEqual(config({ port: 23 }))
		expect(run(PRE200_SCRIPT_INDEX, [], config()).updatedConfig).toBeNull()
		expect(run(PRE200_SCRIPT_INDEX, []).updatedConfig).toBeNull()
	})
})

describe('API 2.x upgrade script', () => {
	it('makes the track number typed into the old text input a number', () => {
		const search = action(ActionId.DirectTrackSearchPreset, { track: v('0012') })
		const result = run(API2_SCRIPT_INDEX, [search])
		expect(result.updatedActions).toEqual([search])
		expect(search.options).toEqual({ track: v(12) })
	})

	it('a 1.x Jump action reaches Direct Track Search with a number, through both scripts', () => {
		const jump = action('jump', { track: v('7') })
		run(PRE200_SCRIPT_INDEX, [jump])
		run(API2_SCRIPT_INDEX, [jump])
		expect(jump).toMatchObject({ actionId: ActionId.DirectTrackSearchPreset, options: { track: v(7) } })
	})

	it('reports only the actions it changed', () => {
		const done = action(ActionId.DirectTrackSearchPreset, { track: v(3) })
		const other = action(ActionId.Record, { mode: v('00') })
		expect(run(API2_SCRIPT_INDEX, [done, other]).updatedActions).toEqual([])
		expect(done.options).toEqual({ track: v(3) })
	})

	it('makes a port saved as text a number, and leaves anything else for the module to reject', () => {
		expect(run(API2_SCRIPT_INDEX, [], config({ port: '23' })).updatedConfig).toEqual(config({ port: 23 }))
		expect(run(API2_SCRIPT_INDEX, [], config({ port: 23 })).updatedConfig).toBeNull()
		expect(run(API2_SCRIPT_INDEX, [], config({ port: 'telnet' })).updatedConfig).toBeNull()
	})

	it('lists only options that are number fields now', () => {
		const defs = actionDefinitions(fakeInstance())
		for (const [actionId, keys] of Object.entries(numericActionOptionsApi2)) {
			const options = (defs[actionId as ActionId] || undefined)?.options ?? []
			for (const key of keys) {
				expect(options.find((o) => o.id === key)?.type, `${actionId}.${key}`).toBe('number')
			}
		}
	})
})

describe('password to secret upgrade script', () => {
	it('moves the password from the config to the secrets', () => {
		const result = run(PASSWORD_SCRIPT_INDEX, [], config({ password: 'abc' }))
		expect(result.updatedConfig).toEqual({ host: '10.0.0.1', port: 23 })
		expect(result.updatedSecrets).toEqual({ password: 'abc' })
	})

	it('moves an empty password as empty, so a unit with none is not given the default', () => {
		const result = run(PASSWORD_SCRIPT_INDEX, [], config({ password: '' }))
		expect(result.updatedConfig).not.toHaveProperty('password')
		expect(result.updatedSecrets).toEqual({ password: '' })
	})

	it('keeps a password already in the secrets, still taking it out of the config', () => {
		const result = run(PASSWORD_SCRIPT_INDEX, [], config({ password: 'old' }), { password: 'new' })
		expect(result.updatedConfig).not.toHaveProperty('password')
		expect(result.updatedSecrets).toBeNull()
	})

	it('changes nothing for a config with no password in it, or no config', () => {
		const withoutPassword = config({ password: undefined })
		delete (withoutPassword as Record<string, unknown>).password
		expect(run(PASSWORD_SCRIPT_INDEX, [], withoutPassword)).toMatchObject({ updatedConfig: null, updatedSecrets: null })
		expect(run(PASSWORD_SCRIPT_INDEX, [])).toMatchObject({ updatedConfig: null, updatedSecrets: null })
	})

	it('moves it to a field that is a secret now', () => {
		expect(GetConfigFields().find((field) => field.id === 'password')?.type).toBe('secret-text')
	})
})
