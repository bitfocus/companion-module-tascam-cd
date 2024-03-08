const { resp, cmd, cmdOnLogin, SOM } = require('./consts.js')

module.exports = {
	processCmd(chunk) {
		let reply = chunk.toString()
		this.log('debug', `response recieved: ${reply}`)

		switch (reply) {
			case resp.password:
				this.sendCommand(this.config.password)
				return true
			case resp.loginSuccess:
				this.updateStatus('ok', 'Logged in')
				this.log('info', 'OK: Logged In')
				this.recorder.loggedIn = true
				this.stopTimeOut()
				this.startCmdQueue()
				this.startKeepAlive()
				for (let i = 0; i < cmdOnLogin.length; i++) {
					this.addCmdtoQueue(SOM + cmdOnLogin[i])
				}
				return true
			case resp.loginFail:
				this.recorder.loggedIn = false
				this.log('error', 'Password is incorrect')
				this.stopCmdQueue()
				this.stopKeepAlive()
				this.startTimeOut()
				return false
		}
		while (reply[0] != SOM && reply.length > 0) {
			reply = reply.slice(1)
		}
		if (reply.length == 0) {
			return false
		}
		let response = reply.substr(1, 2)
		let venderCmd = reply.substr(1, 6)
		venderCmd = venderCmd.substr(0, 4) == resp.deviceSelectReturn ? venderCmd.substr(0, 4) : venderCmd
		let param = []
		let varList = []
		switch (response) {
			case resp.keepAlive:
				this.log('debug', `keepAlive`)
				break
			case resp.infoReturn:
				break
			case resp.flashLoadAck:
				break
			case resp.autoCueLevelReturn:
				break
			case resp.autoTrackLevelReturn:
				break
			case resp.pitchControlDataReturn:
				break
			case resp.autoTrackTimeReturn:
				break
			case resp.clockDateReturn:
				break
			case resp.syncRecLevelReturn:
				break
			case resp.keyControlDataReturn:
				break
			case resp.autoCueSelectReturn:
				break
			case resp.autoTrackSelectReturn:
				break
			case resp.eomTrackTimeReturn:
				break
			case resp.eomMediaTimeReturn:
				break
			case resp.pitchControlSelectReturn:
				break
			case resp.autoReadySelectReturn:
				break
			case resp.repeatSelectReturn:
				param[0] = reply.substr(3, 2)
				this.recorder.repeat = param[0] === undefined ? this.recoder.repeat : param[0]
				this.checkFeedbacks('repeat')
				break
			case resp.syncRecSelectReturn:
				break
			case resp.incrPlaySelectReturn:
				param[0] = reply.substr(3, 2)
				this.recorder.incrPlay = param[0] === undefined ? this.recoder.incrPlay : param[0]
				this.checkFeedbacks('incrPlay')
				break
			case resp.remoteLocalModeReturn:
				param[0] = reply.substr(3, 2)
				this.recorder.remoteLocal = param[0] === undefined ? this.recoder.remoteLocal : param[0]
				this.checkFeedbacks('remoteLocal')
				break
			case resp.playModeReturn:
				param[0] = reply.substr(3, 2)
				this.recorder.playMode = param[0] === undefined ? this.recoder.playMode : param[0]
				this.checkFeedbacks('playMode')
				break
			case resp.mechaStatusReturn:
				param[0] = reply.substr(3, 2)
				this.recorder.mechaStatus = param[0] === undefined ? this.recoder.mechaStatus : param[0]
				this.checkFeedbacks('mechaStatus')
				break
			case resp.specifiedDeviceStatusReturn:
				break
			case resp.trackNoStatusReturn:
				this.recorder.eom = reply[3] + reply[4] == '01' ? true : false
				this.checkFeedbacks('eom')
				param[0] = parseInt(reply[7] + reply[8] + reply[5] + reply[6])
				this.recorder.track.number = isNaN(param[0]) ? this.recorder.track.number : param[0]
				varList['trackNo'] = this.recorder.track.number
				this.setVariableValues(varList)
				break
			case resp.mediaStatusReturn:
				break
			case resp.trackCurrentInfoReturn:
				param[0] = parseInt(reply[5] + reply[6] + reply[3] + reply[4])
				this.recorder.track.number = isNaN(param[0]) ? this.recorder.track.number : param[0]
				varList['trackNo'] = this.recorder.track.number
				switch (this.recorder.device) {
					case '00': //sd card 1
					case '01': //sd card 2
					case '10': //usb
					case '11': //cd
					default:
						param[1] = parseInt(`${reply[9]}${reply[10]}${reply[7]}${reply[8]}`) //total minutes
						param[2] = Math.floor(param[1] / 60)
						param[3] = param[1] % 60
						param[4] = parseInt(`${reply[11]}${reply[12]}`) //seconds
						this.recorder.track.currentTrackTime = `${param[2]}:${param[3]}:${param[4]}`
				}
				varList['trackTime'] = this.recorder.track.currentTrackTime
				this.setVariableValues(varList)
				break
			case resp.trackCurrentTimeReturn:
				param[0] = reply[3] + reply[4] //time mode
				if (this.config.currentTrackTimeMode != param[0]) {
					this.log('debug', `Configured Time Mode ${this.config.currentTrackTimeMode} Returned Time Mode ${param[0]}`)
				}
				param[1] = parseInt(`${reply[7]}${reply[8]}${reply[5]}${reply[6]}`) //total minutes
				param[2] = Math.floor(param[1] / 60)
				param[3] = param[1] % 60
				param[4] = parseInt(`${reply[9]}${reply[10]}`) //seconds
				param[5] = parseInt(`${reply[11]}${reply[12]}`) //frames
				this.recorder.track.currentTrackTime = `${param[2]}:${param[3]}:${param[4]}`
				varList['trackTime'] = this.recorder.track.currentTrackTime
				this.setVariableValues(varList)
				break
			case resp.nameReturn:
				break
			case resp.totalTrackNoTotalTimeReturn:
				break
			case resp.pgmTotalTrackNoTotalTimeReturn:
				break
			case resp.keyboardTypeReturn:
				break
			case resp.errorSenseRequest:
				this.log('debug', `errorSenseRequest`)
				this.addCmdtoQueue(SOM + cmd.errorSense)
				break
			case resp.cautionSenseRequest:
				this.log('debug', `cautionSenseRequest`)
				this.addCmdtoQueue(SOM + cmd.cautionSense)
				break
			case resp.illegalStatus:
				this.log('warn', `Illegal Status, Invalid Command: ${reply.substr(3)}`)
				break
			case resp.powerOnStatus:
				this.log('info', 'powerOnStatus')
				break
			case resp.changeStatus:
				param[0] = reply.substr(3, 2)
				if (param[0] == '00') {
					//mecha status changed
					this.addCmdtoQueue(SOM + cmd.mechaStatusSense)
				} else if (param[0] == '03') {
					//take number changed
					this.addCmdtoQueue(SOM + cmd.currentTrackTimeSense)
				}
				break
			case resp.errorSenseReturn:
				param[0] = reply[6] + '-' + reply[3] + reply[4]
				switch (param[0]) {
					case '0-00':
						this.log('info', `errorSenseReturn: No Error`)
						varList['errorStatus'] = 'No Error'
						//no error
						break
					case '0-01':
						//rec error
						this.log('warn', `errorSenseReturn: Record Error`)
						varList['errorStatus'] = 'Record Error'
						break
					case '1-02':
						//device error
						this.log('warn', `errorSenseReturn: Device Error`)
						varList['errorStatus'] = 'Device Error'
						break
					case '1-08':
						//Stand-By Error
						this.log('warn', `errorSenseReturn: Stand-By Error`)
						varList['errorStatus'] = 'Stand-By Error'
						break
					case '1-09':
						//Information Write Error
						this.log('warn', `errorSenseReturn: Information Write Error`)
						varList['errorStatus'] = 'Information Write Error'
						break
					case '1-FF':
						//Other Error
						this.log('warn', `errorSenseReturn: Other Error`)
						varList['errorStatus'] = 'Other Error'
						break
					default:
						//Shouldn't occur
						this.log('warn', `errorSenseReturn: Switch Default: ${param[0]}`)
						varList['errorStatus'] = 'Switch Default'
				}
				this.recorder.error = param[0]
				this.setVariableValues(varList)
				this.checkFeedbacks('error')
				break
			case resp.cautionSenseReturn:
				param[0] = reply[6] + '-' + reply[3] + reply[4]
				switch (param[0]) {
					case '0-00':
						//no caution
						this.log('info', `cautionSenseReturn: No Caution`)
						varList['cautionStatus'] = 'No Caution'
						break
					case '1-02':
						//Media Error
						this.log('warn', `cautionSenseReturn: Media Error`)
						varList['cautionStatus'] = 'Media Error'
						break
					case '1-03':
						//Can't Undo
						this.log('warn', `cautionSenseReturn: Can't Undo`)
						varList['cautionStatus'] = "Can't Undo"
						break
					case '1-06':
						//Media Full
						this.log('warn', `cautionSenseReturn: Media Full`)
						varList['cautionStatus'] = 'Media Full'
						break
					case '1-07':
						//Track Full
						this.log('warn', `cautionSenseReturn: Track Full`)
						varList['cautionStatus'] = 'Track Full'
						break
					case '1-09':
						//Digital In Unlock
						this.log('warn', `cautionSenseReturn: Digital In Unlock`)
						varList['cautionStatus'] = 'Digital In Unlock'
						break
					case '1-0A':
						//No Call Point
						this.log('warn', `cautionSenseReturn: No Call Point`)
						varList['cautionStatus'] = 'No Call Point'
						break
					case '1-0B':
						//Can't REC
						this.log('warn', `cautionSenseReturn: Can't REC`)
						varList['cautionStatus'] = "Can't REC"
						break
					case '1-0C':
						//Write Protected
						this.log('warn', `cautionSenseReturn: Write Protected`)
						varList['cautionStatus'] = 'Write Protected'
						break
					case '1-0D':
						//Not Execute
						this.log('warn', `cautionSenseReturn: Not Execute`)
						varList['cautionStatus'] = 'Not Execute'
						break
					case '1-0F':
						//Can't Edit
						this.log('warn', `cautionSenseReturn: Can't Edit`)
						varList['cautionStatus'] = "Can't Edit"
						break
					case '1-13':
						//Can't Select
						this.log('warn', `cautionSenseReturn: Can't Select`)
						varList['cautionStatus'] = "Can't Select"
						break
					case '1-14':
						//Track Protected
						this.log('warn', `cautionSenseReturn: Track Protected`)
						varList['cautionStatus'] = 'Track Protected'
						break
					case '1-16':
						//Name Full
						this.log('warn', `cautionSenseReturn: Name Full`)
						varList['cautionStatus'] = 'Name Full'
						break
					case '1-18':
						//Play List Error
						this.log('warn', `cautionSenseReturn: Play List Error`)
						varList['cautionStatus'] = 'Play List Error'
						break
					case '1-1D':
						//Not Audio
						this.log('warn', `cautionSenseReturn: Not Audio`)
						varList['cautionStatus'] = 'Not Audio'
						break
					case '1-1E':
						//Decode Error
						this.log('warn', `cautionSenseReturn: Decode Error`)
						varList['cautionStatus'] = 'Decode Error'
						break
					case '1-1F':
						//Media Not Match
						this.log('warn', `cautionSenseReturn: Media Not Match`)
						varList['cautionStatus'] = 'Media Not Match'
						break
					case '1-FF':
						//Other Caution
						this.log('warn', `cautionSenseReturn: Other Caution`)
						varList['cautionStatus'] = 'Other Caution'
						break
					default:
						//Shouldn't occur
						this.log('warn', `cautionSenseReturn: Switch Default: ${param[0]}`)
						varList['cautionStatus'] = 'Switch Default'
				}
				this.recorder.caution = param[0]
				this.setVariableValues(varList)
				this.checkFeedbacks('caution')
				break
			case resp.venderCommandReturn:
				switch (venderCmd) {
					case resp.deviceSelectReturn:
						param[0] = reply.substr(5, 2)
						this.recorder.device = param[0] === undefined ? this.recoder.device : param[0]
						switch (param[0]) {
							case '00':
								varList['deviceStatus'] = 'SD1'
								break
							case '01':
								varList['deviceStatus'] = 'SD2'
								break
							case '10':
								varList['deviceStatus'] = 'USB'
								break
							case '11':
								varList['deviceStatus'] = 'CD'
								break
							default:
								varList['deviceStatus'] = 'Switch Default'
						}
						this.setVariableValues(varList)
						this.checkFeedbacks('deviceSelect')
						break
					case resp.timeSkipReturn:
						break
					case resp.playAreaSelectReturn:
						param[0] = reply.substr(7, 2)
						this.recorder.playArea = param[0] === undefined ? this.recoder.playArea : param[0]
						this.checkFeedbacks('playArea')
						break
					case resp.autoTrackSizeReturn:
						break
					case resp.userWordPresetReturn:
						break
					case resp.userWordSenseReturn:
						break
					case resp.fileNameSelectReturn:
						break
					case resp.currentMediaRecordableTimeReturn:
						break
					case resp.mediaFormatAck:
						break
					case resp.inputSelectReturn:
						break
					case resp.fileRenameAck:
						break
					case resp.createFolderAck:
						break
					case resp.renameFolderAck:
						break
					case resp.currentFolderNoReturn:
						break
					case resp.searchFolderNoReturn:
						break
					case resp.folderNameReturn:
						break
					case resp.fileNameReturn:
						break
					case resp.folderCountReturn:
						break
					case resp.fileCountReturn:
						break
					default:
						this.log('debug', `unknown vender command: ${reply}`)
				}
				break
			default:
				this.log('warn', `Unexpected response from unit: ${reply}`)
		}
	},
}
