module.exports = [
	/*
	 * Place your upgrade scripts here
	 * Remember that once it has been added it cannot be removed!
	 */
	function pre200(_context, props) {
		const result = {
			updatedActions: [],
			updatedConfig: null,
			updatedFeedbacks: [],
		}

		for (const action of props.actions) {
			switch (action.actionId) {
				case 'recordready':
					action.actionId = 'record'
					action.options = { mode: '01' }
					result.updatedActions.push(action)
					break
				case 'record':
					action.actionId = 'record'
					action.options = { mode: '00' }
					result.updatedActions.push(action)
					break
				case 'mark':
					action.actionId = 'record'
					action.options = { mode: '02' }
					result.updatedActions.push(action)
					break
				case 'prev':
					action.actionId = 'skip'
					action.options = { mode: '01' }
					result.updatedActions.push(action)
					break
				case 'next':
					action.actionId = 'skip'
					action.options = { mode: '00' }
					result.updatedActions.push(action)
					break
				case 'jump':
					action.actionId = 'directTrackSearchPreset'
					action.options = { track: action.options.track } // need to sort this out
					result.updatedActions.push(action)
					break
				case 'powerOn':
					action.actionId = 'powerControl'
					action.options = { mode: '00' }
					result.updatedActions.push(action)
					break
				case 'powerOff':
					action.actionId = 'powerControl'
					action.options = { mode: '11' }
					result.updatedActions.push(action)
					break
			}
		}
		if (props.config !== null) {
			let config = props.config
			if (config.port == undefined || config.port == null) {
				config.port = 23
				result.updatedConfig = config
			}
		}
		return result
	},
]
