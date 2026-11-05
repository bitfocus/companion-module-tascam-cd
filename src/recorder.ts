/**
 * What the module knows of the unit. A field is undefined until the unit reports it. Codes are kept as the unit sent
 * them, unchecked, so a code this version has no choice for still reads as itself rather than as something else.
 */
export type RecorderFields = {
	mechaStatus: string | undefined
	repeat: string | undefined
	incrPlay: string | undefined
	remoteLocal: string | undefined
	playMode: string | undefined
	/** As the ids of ERRORS */
	error: string | undefined
	/** As the ids of CAUTIONS */
	caution: string | undefined
	device: string | undefined
	playArea: string | undefined
	/** End of media */
	eom: boolean
	trackNumber: number | undefined
	/** h:mm:ss, in the configured track time mode */
	trackTime: string | undefined
}

function unknownState(): RecorderFields {
	return {
		mechaStatus: undefined,
		repeat: undefined,
		incrPlay: undefined,
		remoteLocal: undefined,
		playMode: undefined,
		error: undefined,
		caution: undefined,
		device: undefined,
		playArea: undefined,
		eom: false,
		trackNumber: undefined,
		trackTime: undefined,
	}
}

export class RecorderState {
	#fields: RecorderFields = unknownState()

	get<K extends keyof RecorderFields>(key: K): RecorderFields[K] {
		return this.#fields[key]
	}

	/** @returns whether the value changed */
	set<K extends keyof RecorderFields>(key: K, value: RecorderFields[K]): boolean {
		if (this.#fields[key] === value) return false
		this.#fields[key] = value
		return true
	}

	/** Forgets everything, as when the connection is lost or the config changes */
	reset(): void {
		this.#fields = unknownState()
	}
}
