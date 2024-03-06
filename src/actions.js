//const { Regex } = require('@companion-module/base')
const { SOM, cmd } = require('./consts.js')

module.exports = function (self) {
	self.setActionDefinitions({
		stop: {
			name: 'Stop',
			description:
				'STOP puts the controlled device into the stop state and also takes the controlled device out of input monitor mode.',
			options: [],
			callback: () => {
				self.addCmdtoQueue(SOM + cmd.stop)
			},
		},
		play: {
			name: 'Play',
			description:
				'Play puts the controlled device into playback mode and also brings the controlled device from record ready mode to recording mode.',
			options: [],
			callback: () => {
				self.addCmdtoQueue(SOM + cmd.play)
			},
		},
		record: {
			name: 'Record',
			description:
				'RECORD puts the controlled device into record ready mode. It also numbers tracks during recording and puts the controlled device into input monitoring mode when no media is in the controlled device.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.record_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.record + options.mode)
			},
		},
		pause: {
			name: 'Pause',
			description: 'READY puts the controlled device into playback standby mode or record ready mode.',
			options: [],
			callback: () => {
				self.addCmdtoQueue(SOM + cmd.pause + '01')
			},
		},
		jog: {
			name: 'Jog',
			description: 'Enables JOG playback of the controlled device.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.jog_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.jog + options.mode)
			},
		},
		shuttle: {
			name: 'Shuttle',
			description:
				'SHUTTLE puts the controlled device into the shuttle mode. The controlled device remains in the shuttle mode until it receives a command such as STOP, PLAY, or PAUSE.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.shuttle_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.shuttle + options.mode)
			},
		},
		flashLoad: {
			name: 'Flash Load',
			description: 'FLASH LOAD puts the controlled device into Flash Load mode.',
			options: [],
			callback: () => {
				self.addCmdtoQueue(SOM + cmd.flashLoad)
			},
		},
		eject: {
			name: 'Eject',
			description:
				'EJECT ejects a CD Media from the controlled device. (If the controlled device is SS-R250N, it returns ILLEGAL [F2].) If the device selected on the controlled device is not CD, this command is ignored.',
			options: [],
			callback: () => {
				self.addCmdtoQueue(SOM + cmd.eject)
			},
		},
		skip: {
			name: 'Skip',
			description: 'SKIP allows the controlled device to skip a track.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.skip_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.skip + options.mode)
			},
		},
		call: {
			name: 'Call',
			description:
				'CALL locates the controlled device to a call point and puts the controlled device into the ready state.',
			options: [],
			callback: () => {
				self.addCmdtoQueue(SOM + cmd.call)
			},
		},
		autoCueLevelPreset: {
			name: 'Auto Cue Level Preset',
			description: 'AUTO CUE LEVEL PRESET sets the auto cue level of the controlled device.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.autoCueLevelPreset_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.autoCueLevelPreset + options.mode)
				self.addCmdtoQueue(SOM + cmd.autoCueLevelPreset + 'FF')
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.autoCueLevelPreset + 'FF')
			},
		},
		autoTrackLevelPreset: {
			name: 'Auto Track Level Preset',
			description: 'AUTO TRACK LEVEL PRESET sets the auto track level of the controlled device.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.autoTrackLevelPreset_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.autoTrackLevelPreset + options.mode)
				self.addCmdtoQueue(SOM + cmd.autoTrackLevelPreset + 'FF')
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.autoTrackLevelPreset + 'FF')
			},
		},
		directTrackSearchPreset: {
			name: 'Direct Track Search Preset',
			description:
				'DIRECT TRACK SEARCH PRESET performs a search for a track on the controlled device by specifying the track number.',
			options: [
				{
					type: 'textinput',
					id: 'track',
					label: 'Track Number',
					regex: '/^[0-9]{1,4}/g',
					default: '0001',
					tooltip: 'Enter a 1 to 4 digit track number.',
				},
			],
			callback: ({ options }) => {
				let num = ('0000' + options.track).substr(-4)
				let track = num.substr(2)
				track += num.substr(0, 2)
				self.addCmdtoQueue(SOM + cmd.directTrackSearchPreset + track)
			},
			//learn: () => {},
			//subscribe: () => {},
		},
		syncRecLevelPreset: {
			name: 'Sync Rec Level Preset',
			description: 'SYNC REC LEVEL PRESET sets the level of the sync recording of the controlled device.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.syncRecLevelPreset_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.autoTrackLevelPreset + options.mode)
				self.addCmdtoQueue(SOM + cmd.autoTrackLevelPreset + 'FF')
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.autoTrackLevelPreset + 'FF')
			},
		},
		autoCueSelect: {
			name: 'Auto Cue Select',
			description: 'AUTO CUE SELECT turns the Auto-cue mode of the controlled device on or off.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.autoCueSelect_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.autoCueSelect + options.mode)
				self.addCmdtoQueue(SOM + cmd.autoCueSelect + 'FF')
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.autoCueSelect + 'FF')
			},
		},
		autoTrackSelect: {
			name: 'Auto Track Select',
			description: 'AUTO TRACK SELECT turns the Auto-cue mode of the controlled device on or off.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.autoTrackSelect_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.autoTrackSelect + options.mode)
				self.addCmdtoQueue(SOM + cmd.autoTrackSelect + 'FF')
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.autoTrackSelect + 'FF')
			},
		},
		pitchControlSelect: {
			name: 'Pitch Control Select',
			description: 'PITCH CONTROL SELECT turns the pitch control mode of the controlled device on or off.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.pitchControlSelect_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.pitchControlSelect + options.mode)
				self.addCmdtoQueue(SOM + cmd.pitchControlSelect + 'FF')
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.pitchControlSelect + 'FF')
			},
		},
		autoReadySelect: {
			name: 'Auto Ready Select',
			description: 'AUTO READY SELECT turns the auto ready mode of the controlled device on or off.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.autoReadySelect_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.autoReadySelect + options.mode)
				self.addCmdtoQueue(SOM + cmd.autoReadySelect + 'FF')
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.autoReadySelect + 'FF')
			},
		},
		repeatMode: {
			name: 'Repeat Mode',
			description: 'REPEAT SELECT turns the repeat mode of the controlled device on or off.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Repeat Mode',
					choices: self.repeat_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.repeatModeSelect + options.mode)
				self.addCmdtoQueue(SOM + cmd.repeatModeSelect + 'FF')
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.repeatModeSelect + 'FF')
			},
		},
		syncRecSelect: {
			name: 'Sync Rec Select',
			description: 'SYNC REC SELECT turns the sync rec mode of the controlled device on or off.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.syncRecSelect_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.syncRecSelect + options.mode)
				self.addCmdtoQueue(SOM + cmd.syncRecSelect + 'FF')
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.syncRecSelect + 'FF')
			},
		},
		incrPlaySelect: {
			name: 'Incremental Playback Select',
			description: 'INCR PLAY SELECT turns the incremental playback mode of the controlled device on or off.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.incrPlay_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.incrPlaySelect + options.mode)
				self.addCmdtoQueue(SOM + cmd.incrPlaySelect + 'FF')
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.incrPlaySelect + 'FF')
			},
		},
		keyControlSelect: {
			name: 'Key Control Select',
			description: 'KEY CONTROL SELECT turns the key control mode of the controlled device on or off.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.keyControlSelect_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.keyControlSelect + options.mode)
				self.addCmdtoQueue(SOM + cmd.keyControlSelect + 'FF')
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.keyControlSelect + 'FF')
			},
		},
		remoteLocalMode: {
			name: 'Remote/Local Select',
			description: 'REMOTE/LOCAL SELECT enables or disables key operation on the controlled device.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Control Mode',
					choices: self.remoteLocal_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.remoteLocalModeSelect + options.mode)
				self.addCmdtoQueue(SOM + cmd.remoteLocalModeSelect + 'FF')
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.remoteLocalModeSelect + 'FF')
			},
		},
		playMode: {
			name: 'Play Mode Select',
			description: 'PLAY MODE SELECT sets the playback mode of the controlled device.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Play Mode',
					choices: self.play_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.playModeSelect + options.mode)
				self.addCmdtoQueue(SOM + cmd.playModeSense)
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.playModeSense)
			},
		},
		specifiedDeviceStatusSense: {
			name: 'Specified Device Status Sense',
			description:
				'SPECIFIED DEVICE STATUS SENSE requests to return the status of the specified device of the controlled device.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Device',
					choices: self.specifiedDeviceStatusSense_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.specifiedDeviceStatusSense + options.mode)
			},
			//learn: () => {},
			//subscribe: () => {},
		},
		currentTrackTime: {
			name: 'Current Track Time Sense',
			description:
				'CURRENT TRACK TIME SENSE requests the controlled device to return the selected time information about the current track or the whole media, when in a playback or a ready state.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.currentTrackTime_sense,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.recorder.currentTrackTimeMode = options.mode
				self.addCmdtoQueue(SOM + cmd.currentTrackTimeSense + self.recorder.track.currentTrackTimeMode)
			},
			//learn: () => {},
			//subscribe: () => {},
		},
		powerControl: {
			name: 'Power Control',
			description: 'POWER CONTROL turns ON / OFF (standby) the power of the controlled device.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.powerControl_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.powerControl + options.mode)
			},
			//learn: () => {},
			//subscribe: () => {},
		},
		deviceSelect: {
			name: 'Device Select',
			description: 'DEVICE SELECT changes the device to be used on the controlled device.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Device',
					choices: self.deviceSelect_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.deviceSelect + options.mode)
				self.addCmdtoQueue(SOM + cmd.deviceSelect + 'FF')
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.deviceSelect + 'FF')
			},
		},
		divide: {
			name: 'Divide',
			description:
				'The File currently in playback standby mode on the controlled device is divided into two files at that point.',
			options: [],
			callback: () => {
				self.addCmdtoQueue(SOM + cmd.divide)
			},
		},
		delete: {
			name: 'Delete',
			description: 'The file(s) for the current track on the controlled device are deleted.',
			options: [],
			callback: () => {
				self.addCmdtoQueue(SOM + cmd.delete)
			},
		},
		playAreaSelect: {
			name: 'Play Area Select',
			description: 'PLAY AREA SELECT sets the playback area of the controlled device.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.playArea_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.playAreaSelect + options.mode)
				self.addCmdtoQueue(SOM + cmd.playAreaSelect + 'FF')
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.playAreaSelect + 'FF')
			},
		},
		fileNameSelect: {
			name: 'File Name Select',
			description: 'Set the format of the recording file name of the controlled device.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.fileNameSelect_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.fileNameSelect + options.mode)
				self.addCmdtoQueue(SOM + cmd.fileNameSelect + 'FF')
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.fileNameSelect + 'FF')
			},
		},
		mediaFormat: {
			name: 'Media Format',
			description: 'Formats the selected media in the controlled device.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					choices: self.mediaFormat_mode,
					default: '00',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.mediaFormat + options.mode)
			},
			//learn: () => {},
			//subscribe: () => {},
		},
		inputSelect: {
			name: 'Input Select',
			description: 'INPUT SELECT sets the input source select of the controlled device.',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Input',
					choices: self.inputSelect_mode,
					default: '000000',
				},
			],
			callback: ({ options }) => {
				self.addCmdtoQueue(SOM + cmd.inputSelect + options.mode)
				self.addCmdtoQueue(SOM + cmd.inputSelect + 'FF')
			},
			//learn: () => {},
			subscribe: () => {
				self.addCmdtoQueue(SOM + cmd.inputSelect + 'FF')
			},
		},
	})
}
