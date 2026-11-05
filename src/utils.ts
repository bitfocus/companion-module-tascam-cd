import type { DropdownChoice } from '@companion-module/base'

/**
 * Marks a branch the type system believes is unreachable, and supplies the value to use if it is reached anyway.
 * Leaving a union member unhandled above becomes a compile error here.
 *
 * It falls back rather than throwing: option values are restored from a saved configuration, so one that this version
 * no longer offers is still possible at runtime.
 */
export function unhandledOption<TFallback>(_value: never, fallback: TFallback): TFallback {
	return fallback
}

/** The message of anything thrown, which need not be an Error */
export function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err)
}

/**
 * An option's value, checked against its choices. In expression mode Companion skips the action when the result is not
 * one of them, but a value is passed on unchecked, and one saved by an older version may no longer be offered.
 * @throws if the value is not one of the choices
 */
export function choiceValue<TId extends string>(
	choices: readonly DropdownChoice<TId>[],
	value: unknown,
	label: string,
): TId {
	const choice = choices.find((c) => c.id === value)
	if (choice === undefined) throw new Error(`${label} ${String(value)} is not valid`)
	return choice.id
}

/** The label of the choice with this id, or undefined if there is none */
export function choiceLabel(choices: readonly DropdownChoice<string>[], id: string | undefined): string | undefined {
	return choices.find((c) => c.id === id)?.label
}
