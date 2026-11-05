import {
	FixupNumericOrVariablesValueToExpressions,
	type CompanionMigrationAction,
	type CompanionMigrationOptionValues,
	type CompanionStaticUpgradeProps,
	type CompanionStaticUpgradeResult,
	type CompanionStaticUpgradeScript,
	type CompanionUpgradeContext,
	type JsonValue,
} from '@companion-module/base'
import { DEFAULT_PORT, type ModuleConfig, type ModuleSecrets } from './config.js'
import { ActionId } from './actions.js'

type OptionValue = CompanionMigrationOptionValues[string]

/** An option value as Companion stores it: not an expression */
const value = (v: JsonValue): OptionValue => ({ isExpression: false, value: v })

/**
 * Options that were textinputs taking numbers before the API 2.x migration. They are number fields since. Frozen
 * history for UpgradeScripts[1]: do not edit to track later changes, add a new script instead.
 */
export const numericActionOptionsApi2: Partial<Record<ActionId, string[]>> = {
	[ActionId.DirectTrackSearchPreset]: ['track'],
}

/**
 * Converts the listed options in place. Returns whether anything changed — the helper always hands back a fresh object,
 * so compare contents rather than identity, or every untouched action would be reported as updated.
 */
function fixupOptions(action: CompanionMigrationAction, keys: string[] | undefined): boolean {
	if (!keys) return false
	let changed = false
	for (const key of keys) {
		const current = action.options[key]
		const fixed = FixupNumericOrVariablesValueToExpressions(current)
		if (fixed?.isExpression !== current?.isExpression || fixed?.value !== current?.value) {
			action.options[key] = fixed
			changed = true
		}
	}
	return changed
}

/** A config as saved before UpgradeScripts[2], with the password still in it */
type ConfigWithPassword = ModuleConfig & { password?: unknown }

/** The port as a number, where a textinput saved it as a string. Anything else is left for validPort to reject */
function numericPort(port: unknown): unknown {
	if (typeof port !== 'string' || !/^\d+$/.test(port.trim())) return port
	return Number(port.trim())
}

export const UpgradeScripts: CompanionStaticUpgradeScript<ModuleConfig, ModuleSecrets>[] = [
	/*
	 * Place your upgrade scripts here
	 * Remember that once it has been added it cannot be removed!
	 */

	// 0: module v2.0.0 — the 1.x actions folded into ones taking a mode. Options are written in the form Companion has
	// passed upgrade scripts since API 2.x, which is the only form this script now sees.
	function pre200(
		_context: CompanionUpgradeContext<ModuleConfig>,
		props: CompanionStaticUpgradeProps<ModuleConfig, ModuleSecrets>,
	): CompanionStaticUpgradeResult<ModuleConfig, ModuleSecrets> {
		const result: CompanionStaticUpgradeResult<ModuleConfig, ModuleSecrets> = {
			updatedActions: [],
			updatedConfig: null,
			updatedFeedbacks: [],
		}
		const remap: Record<string, { actionId: ActionId; mode: string } | undefined> = {
			recordready: { actionId: ActionId.Record, mode: '01' },
			record: { actionId: ActionId.Record, mode: '00' },
			mark: { actionId: ActionId.Record, mode: '02' },
			prev: { actionId: ActionId.Skip, mode: '01' },
			next: { actionId: ActionId.Skip, mode: '00' },
			powerOn: { actionId: ActionId.PowerControl, mode: '00' },
			powerOff: { actionId: ActionId.PowerControl, mode: '11' },
		}
		for (const action of props.actions) {
			const target = remap[action.actionId]
			if (target !== undefined) {
				action.actionId = target.actionId
				action.options = { mode: value(target.mode) }
				result.updatedActions.push(action)
			} else if (action.actionId === 'jump') {
				action.actionId = ActionId.DirectTrackSearchPreset
				action.options = { track: action.options.track }
				result.updatedActions.push(action)
			}
		}
		if (props.config !== null && (props.config.port === undefined || props.config.port === null)) {
			result.updatedConfig = { ...props.config, port: DEFAULT_PORT }
		}
		return result
	},

	// 1: API 2.x — Direct Track Search's track became a number field, and so did the port in the config.
	// "0012" becomes 12, "$(local:x)" becomes an expression, anything else with a variable is wrapped in parseVariables().
	function api2(
		_context: CompanionUpgradeContext<ModuleConfig>,
		props: CompanionStaticUpgradeProps<ModuleConfig, ModuleSecrets>,
	): CompanionStaticUpgradeResult<ModuleConfig, ModuleSecrets> {
		let updatedConfig: ModuleConfig | null = null
		if (props.config !== null) {
			const port = numericPort(props.config.port)
			if (port !== props.config.port) updatedConfig = { ...props.config, port: port as number }
		}
		return {
			updatedConfig,
			updatedActions: props.actions.filter((action) =>
				fixupOptions(action, numericActionOptionsApi2[action.actionId as ActionId]),
			),
			updatedFeedbacks: [],
		}
	},

	// 2: the password moved from the config to the secrets, which Companion does not report to the web UI
	function passwordToSecret(
		_context: CompanionUpgradeContext<ModuleConfig>,
		props: CompanionStaticUpgradeProps<ModuleConfig, ModuleSecrets>,
	): CompanionStaticUpgradeResult<ModuleConfig, ModuleSecrets> {
		const result: CompanionStaticUpgradeResult<ModuleConfig, ModuleSecrets> = {
			updatedConfig: null,
			updatedSecrets: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}
		if (props.config === null || !('password' in props.config)) return result
		const { password, ...config } = props.config as ConfigWithPassword
		result.updatedConfig = config
		// A password already in the secrets can only have been entered since, so it is the one to keep
		if (typeof props.secrets?.password !== 'string') {
			result.updatedSecrets = { ...props.secrets, password: typeof password === 'string' ? password : '' }
		}
		return result
	},
]
