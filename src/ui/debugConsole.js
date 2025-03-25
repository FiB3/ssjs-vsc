const vscode = require('vscode');

/**
 * Outputs through the VSCode Console (not browser console).
 */
class DebugConsole {
	constructor(channel = 'SSJS') {
		this.setup(channel);
	}

	setup(channel = 'SSJS') {
		this.channel = channel;
		this.console = vscode.window.createOutputChannel(channel);
	}

	error(...message) {
		this._log('ERROR', ...message);
	}

	warn(...message) {
		this._log('WARN', ...message);
	}

	log(...message) {
		this._log('INFO', ...message);
	}

	info(...message) {
		this._log('INFO', ...message);
	}

	debug(...message) {
		this._log('DEBUG', ...message);
	}

	clear() {
		this.console.clear();
	}

	_log(level, ...message) {
		this.console.show();
		this.console.appendLine(message.join(' '));
	}
}

module.exports = new DebugConsole();