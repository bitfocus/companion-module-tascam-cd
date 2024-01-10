const { InstanceBase, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades.js')
const UpdateActions = require('./actions.js')
const UpdateFeedbacks = require('./feedbacks.js')
const UpdateVariableDefinitions = require('./variables.js')
const config = require('./config.js')
const choices = require('./choices.js')
const tcp = require('./tcp.js')
const processCmd = require('./processcmd.js')
const { EndSession, msgDelay } = require('./consts.js')

class TASCAM_SS_CDR250N extends InstanceBase {
	constructor(internal) {
		super(internal)
		Object.assign(this, { ...config, ...tcp, ...processCmd, ...choices })
		this.keepAliveTimer = {}
		this.cmdTimer = {}
		this.cmdQueue = []
	}
	async init(config) {
		this.updateStatus('Starting')
		this.config = config
		this.cmdTimer = setTimeout(() => {
			this.processCmdQueue()
		}, msgDelay)
		this.initVariables()
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		this.updateVariableValues()
		this.initTCP()
	}
	// When module gets deleted
	async destroy() {
		this.log('debug', `destroy. ID: ${this.id}`)
		clearTimeout(this.keepAliveTimer)
		clearTimeout(this.cmdTimer)
		this.keepAliveTimer = null
		this.cmdTimer = null
		if (this.socket) {
			this.sendCommand(EndSession)
			this.socket.destroy()
		}
		this.updateStatus(InstanceStatus.Disconnected)
	}

	updateVariableValues() {
		let varList = []
		varList['trackNo'] = 'unknown'
		varList['trackTime'] = 'unknown'
		varList['errorStatus'] = 'unknown'
		varList['cautionStatus'] = 'unknown'
		varList['deviceStatus'] = 'unknown'
		this.setVariableValues(varList)
	}

	initVariables() {
		this.recorder = {
			loggedIn: false,
			mechaStatus: 'unknown',
			repeat: 'unknown',
			incrPlay: 'unknown',
			remoteLocal: 'unknown',
			playMode: 'unknown',
			error: 'unknown',
			caution: 'unknown',
			device: 'unknown',
			playArea: 'unknown',
			track: {
				number: 'unknown',
				currentTrackTime: '00',
			},
		}
	}

	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}
}

runEntrypoint(TASCAM_SS_CDR250N, UpgradeScripts)
