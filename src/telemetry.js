const vscode = require('vscode');
const TelemetryReporter = require('@vscode/extension-telemetry').default;

const KEY = '8c0a3736-8ee0-423d-9c4f-e207ae935339';

class TelemetryHandler {
	constructor() {
		this.reporter = new TelemetryReporter(KEY);
	}

	/**
	 * One time set of context and dev mode.
	 * @param {Object} context
	 */
	init(context) {
		context.subscriptions.push(this.reporter);
		this.isProd = context.extensionMode === vscode.ExtensionMode.Production;
		console.log(`Telemetry activated in prod: ${this.isProd}`);
	}

	/**
	 * Send telemetry event.
	 * @param {string} eventName
	 * @param {Object} [properties={}]
	 * @param {Object} [measurements={}]
	 */
	log(eventName, properties = {}, measurements = {}) {
		properties.isProd = this.isProd;
		this.reporter.sendTelemetryEvent(eventName, properties, measurements);
		// reporter.sendTelemetryEvent('sampleEvent', { 'stringProp': 'some string' });
	}

	/**
	 * Send telemetry error event.
	 * @param {string} eventName
	 * @param {Object} [properties={}]
	 * @param {Object} [measurements={}]
	 */
	error(errorName, properties = {}, measurements = {}) {
		properties.isProd = this.isProd;
		this.reporter.sendTelemetryErrorEvent(errorName, properties, measurements);
	}

	/**
	 * Dispose of the reporter.
	 */
	dispose() {
		this.reporter.dispose();
	}
}

module.exports = new TelemetryHandler();