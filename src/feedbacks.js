const { combineRgb } = require('@companion-module/base')

module.exports = async function (self) {
	self.setFeedbackDefinitions({
		repeat: {
			name: 'Repeat',
			type: 'boolean',
			label: 'Repeat',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					id: 'status',
					type: 'dropdown',
					label: 'Status',
					choices: self.repeat_feedback,
					default: '00',
				},
			],
			callback: ({ options }) => {
				return options.status == self.recorder.repeat
			},
		},
		incrPlay: {
			name: 'Incremental Play',
			type: 'boolean',
			label: 'Incremental Play',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					id: 'status',
					type: 'dropdown',
					label: 'Status',
					choices: self.incrPlay_feedback,
					default: '00',
				},
			],
			callback: ({ options }) => {
				return options.status == self.recorder.incrPlay
			},
		},
		remoteLocal: {
			name: 'Remote/Local Control',
			type: 'boolean',
			label: 'Remote/Local Control',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					id: 'status',
					type: 'dropdown',
					label: 'Status',
					choices: self.remoteLocal_feedback,
					default: '00',
				},
			],
			callback: ({ options }) => {
				return options.status == self.recorder.remoteLocal
			},
		},
		playMode: {
			name: 'Play Mode',
			type: 'boolean',
			label: 'Play Mode',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					id: 'status',
					type: 'dropdown',
					label: 'Mode',
					choices: self.play_feedback,
					default: '00',
				},
			],
			callback: ({ options }) => {
				return options.status == self.recorder.playMode
			},
		},
		mechaStatus: {
			name: 'Mecha Status',
			type: 'boolean',
			label: 'Mecha Status',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					id: 'status',
					type: 'dropdown',
					label: 'Status',
					choices: self.mechaStatus_feedback,
					default: '00',
				},
			],
			callback: ({ options }) => {
				return options.status == self.recorder.mechaStatus
			},
		},
		error: {
			name: 'Error State',
			type: 'boolean',
			label: 'Error State',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					id: 'error',
					type: 'dropdown',
					label: 'Error',
					choices: self.errorSense_feedback,
					default: '0-00',
				},
			],
			callback: ({ options }) => {
				return options.error == self.recorder.error
			},
		},
		caution: {
			name: 'Caution State',
			type: 'boolean',
			label: 'Caution State',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					id: 'caution',
					type: 'dropdown',
					label: 'Caution',
					choices: self.cautionSense_feedback,
					default: '0-00',
				},
			],
			callback: ({ options }) => {
				return options.caution == self.recorder.caution
			},
		},
		deviceSelect: {
			name: 'Device Select',
			type: 'boolean',
			label: 'Device Select',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					id: 'device',
					type: 'dropdown',
					label: 'Device',
					choices: self.deviceSelect_feedback,
					default: '00',
				},
			],
			callback: ({ options }) => {
				return options.device == self.recorder.device
			},
		},
		playArea: {
			name: 'Play Area',
			type: 'boolean',
			label: 'Play Area',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					id: 'playArea',
					type: 'dropdown',
					label: 'Play Area',
					choices: self.playArea_feedback,
					default: '00',
				},
			],
			callback: ({ options }) => {
				return options.playArea == self.recorder.playArea
			},
		},
	})
}
