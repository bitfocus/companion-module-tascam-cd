const { InstanceStatus, TCPHelper } = require('@companion-module/base')
const {
	msgDelay,
	cmd,
	cmdOnKeepAlive,
	SOM,
	EOM,
	EndSession,
	keepAliveInterval,
	timeOutInterval,
	cmdOnLogin,
} = require('./consts.js')

module.exports = {
	addCmdtoQueue(msg) {
		if (msg !== undefined && msg.length > 0) {
			this.cmdQueue.push(msg)
			return true
		}
		this.log('warn', `Invalid command: ${msg}`)
		return false
	},

	processCmdQueue() {
		if (this.cmdQueue.length > 0 && this.recorder.loggedIn) {
			this.sendCommand(this.cmdQueue.splice(0, 1))
			this.cmdTimer = setTimeout(() => {
				this.processCmdQueue()
			}, msgDelay)
			return true
		}
		this.cmdTimer = setTimeout(() => {
			this.processCmdQueue()
		}, msgDelay)
		return undefined
	},

	startCmdQueue() {
		this.log('debug', 'starting cmdTimer')
		if (this.cmdTimer) {
			clearTimeout(this.cmdTimer)
			delete this.cmdTimer
		}
		this.cmdTimer = setTimeout(() => {
			this.processCmdQueue()
		}, msgDelay)
	},

	stopCmdQueue() {
		this.log('debug', 'stopping cmdTimer')
		clearTimeout(this.cmdTimer)
		delete this.cmdTimer
	},

	sendCommand(msg) {
		if (msg !== undefined) {
			if (this.socket !== undefined && this.socket.isConnected) {
				this.log('debug', `Sending Command: ${msg}`)
				this.socket.send(msg + EOM)
				return true
			} else {
				this.log('warn', `Socket not connected, tried to send: ${msg}`)
			}
		} else {
			this.log('warn', 'Command undefined')
		}
		return false
	},

	//queries made on initial connection.
	queryOnConnect() {
		this.sendCommand('  ')
		if (this.config.password == '') {
			this.recorder.loggedIn = true
			this.stopTimeOut()
			this.startCmdQueue()
			this.startKeepAlive()
			for (let i = 0; i < cmdOnLogin.length; i++) {
				this.addCmdtoQueue(SOM + cmdOnLogin[i])
			}
		}
		return true
	},

	keepAlive() {
		//request alive notifications
		for (let i = 0; i < cmdOnKeepAlive.length; i++) {
			this.addCmdtoQueue(SOM + cmdOnKeepAlive[i])
		}
		this.addCmdtoQueue(SOM + cmd.currentTrackTimeSense + this.config.currentTrackTimeMode)
		this.keepAliveTimer = setTimeout(() => {
			this.keepAlive()
		}, keepAliveInterval)
	},

	startKeepAlive() {
		this.log('debug', 'starting keepAlive')
		if (this.keepAliveTimer) {
			clearTimeout(this.keepAliveTimer)
			delete this.keepAliveTimer
		}
		this.keepAliveTimer = setTimeout(() => {
			this.keepAlive()
		}, keepAliveInterval)
	},

	stopKeepAlive() {
		this.log('debug', 'stopping keepAlive')
		clearTimeout(this.keepAliveTimer)
		delete this.keepAliveTimer
	},

	timeOut() {
		//dump cmdQueue to prevent excessive queuing of old commands
		this.log('debug', 'timeout reached purging queued commands')
		this.cmdQueue = []
		this.timeOutTimer = setTimeout(() => {
			this.timeOut()
		}, timeOutInterval)
	},

	startTimeOut() {
		this.log('debug', 'starting timeOutTimer')
		if (this.timeOutTimer) {
			clearTimeout(this.timeOutTimer)
			delete this.timeOutTimer
		}
		this.timeOutTimer = setTimeout(() => {
			this.timeOut()
		}, timeOutInterval)
	},

	stopTimeOut() {
		this.log('debug', 'stopping timeOutTimer')
		clearTimeout(this.timeOutTimer)
		delete this.timeOutTimer
	},

	initTCP() {
		this.receiveBuffer = ''
		if (this.socket !== undefined) {
			this.sendCommand(EndSession)
			this.socket.destroy()
			delete this.socket
			this.recorder.loggedIn = false
			this.startTimeOut()
			this.stopCmdQueue()
			this.stopKeepAlive()
		}
		if (this.config.host) {
			this.log('debug', 'Creating New Socket')

			this.updateStatus(InstanceStatus.Connecting, `Connecting to SS-CDR250N: ${this.config.host}`)
			this.socket = new TCPHelper(this.config.host, this.config.port)

			this.socket.on('status_change', (status, message) => {
				this.updateStatus(status, message)
			})
			this.socket.on('error', (err) => {
				this.log('error', `Network error: ${err.message}`)
				this.updateStatus(InstanceStatus.ConnectionFailure, err.message)
				this.recorder.loggedIn = false
				this.stopKeepAlive()
				this.stopCmdQueue()
				this.startTimeOut()
			})
			this.socket.on('connect', () => {
				this.log('info', `Connected to ${this.config.host}:${this.config.port}`)
				this.updateStatus(InstanceStatus.Connecting, `Logging in`)
				this.receiveBuffer = ''
				this.recorder.loggedIn = false
				this.queryOnConnect()
			})
			this.socket.on('data', (chunk) => {
				let i = 0,
					line = '',
					offset = 0
				this.receiveBuffer += chunk
				while ((i = this.receiveBuffer.indexOf(EOM, offset)) !== -1) {
					line = this.receiveBuffer.substr(offset, i - offset)
					offset = i + 2
					this.processCmd(line.toString())
				}
				this.receiveBuffer = this.receiveBuffer.substr(offset)
			})
		} else {
			this.updateStatus(InstanceStatus.BadConfig)
		}
	},
}
