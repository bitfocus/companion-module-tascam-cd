import type { CompanionVariableDefinitions } from '@companion-module/base'
import type TascamCdInstance from './main.js'

/** The value every variable shows until the unit reports it */
export const UNKNOWN = 'unknown'

export type VariablesSchema = {
	/** The track number, or {@link UNKNOWN} */
	trackNo: number | string
	playState: string
	trackTime: string
	errorStatus: string
	cautionStatus: string
	deviceStatus: string
}

export function UpdateVariableDefinitions(self: TascamCdInstance): void {
	const variables: CompanionVariableDefinitions<VariablesSchema> = {
		trackNo: { name: 'Track Number' },
		playState: { name: 'Play State' },
		trackTime: { name: 'Track Time' },
		errorStatus: { name: 'Error Status' },
		cautionStatus: { name: 'Caution Status' },
		deviceStatus: { name: 'Device Status' },
	}
	self.setVariableDefinitions(variables)
}

/** Every variable as it is before the unit reports anything */
export function unknownVariables(): VariablesSchema {
	return {
		trackNo: UNKNOWN,
		playState: UNKNOWN,
		trackTime: UNKNOWN,
		errorStatus: UNKNOWN,
		cautionStatus: UNKNOWN,
		deviceStatus: UNKNOWN,
	}
}
