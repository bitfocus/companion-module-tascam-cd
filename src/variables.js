module.exports = async function (self) {
	let varList = [
		{ variableId: 'trackNo', name: 'Track Number' },
		{ variableId: 'trackTime', name: 'Track Time' },
		{ variableId: 'errorStatus', name: 'Error Status' },
		{ variableId: 'cautionStatus', name: 'Caution Status' },
		{ variableId: 'deviceStatus', name: 'Device Status' },
	]
	self.setVariableDefinitions(varList)
}
