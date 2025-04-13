const path = require('path');

// Create the mock VSCode API
const vscode = {
	ExtensionContext: class ExtensionContext {
		constructor(env = 'Development') {
				this.subscriptions = [];
				this.extensionUri = {
					fsPath: path.join(__dirname, '../..')
				};
				this.extensionMode = env;
				this.globalState = {
					// TODO: implement
				};
				this.workspaceState = {
					// TODO: implement
				};
		}
	},
	workspace: {
			workspaceFolders: [{
					uri: {
							fsPath: path.join(__dirname, '../unitTests/test-workspace')
					}
			}]
	},
	window: {
			createOutputChannel: (channel) => {
					const outputLog = {
							messages: [],
							visible: false
					};
					
					return {
							show: () => {
									outputLog.visible = true;
							},
							hide: () => {
									outputLog.visible = false;
							},
							clear: () => {
									outputLog.messages = [];
							},
							appendLine: (message) => {
									outputLog.messages.push({
											channel,
											message,
											timestamp: new Date()
									});
							},
							dispose: () => {
									outputLog.messages = [];
									outputLog.visible = false;
							},
							// Test helper methods
							getOutput: () => outputLog.messages,
							isVisible: () => outputLog.visible,
							getLastMessage: () => outputLog.messages[outputLog.messages.length - 1],
							getMessageCount: () => outputLog.messages.length
					};
			}
	},
	Uri: {
			file: (path) => ({ fsPath: path })
	},
	ExtensionMode: {
			Production: 1,
			Development: 2,
			Workspace: 3
	}
};

// Create mock for telemetry
const telemetryMock = {
	default: class TelemetryReporter {
		constructor(connectionString) {
			this.connectionString = connectionString;
			this.events = [];
			this.errors = [];
		}

		sendTelemetryEvent(eventName, properties, measurements) {
			this.events.push({ eventName, properties, measurements });
		}

		sendTelemetryErrorEvent(errorName, properties, measurements) {
			this.errors.push({ errorName, properties, measurements });
		}

		dispose() {
			this.events = [];
			this.errors = [];
		}
	}
};


// Create mock for dotenv
const dotenvMock = {
	config: function(options) {
		process.env.SSJS_VSC_TELEMETRY = 'test-connection-string';
	}
};

// Helper function to set up the mock
function setupVSCodeMock({ env = 'Development' }) {
	// Store the original _load function
	const originalLoad = require('module')._load;
	
	// Mock the vscode module before it's required
	require('module')._load = function(request, parent, isMain) {
		if (request === 'vscode') {
			const mockContext = new vscode.ExtensionContext(env);
			return {
				...vscode,
				ExtensionContext: mockContext
			};
		}
		if (request === '@vscode/extension-telemetry') {
			return telemetryMock;
		}
    if (request === 'dotenv') {
			return dotenvMock;
		}
		return originalLoad(request, parent, isMain);
	};
}

module.exports = {
	vscode,
	setupVSCodeMock,
	telemetryMock
};