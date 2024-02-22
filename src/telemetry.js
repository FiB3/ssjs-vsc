const vscode = require('vscode');
const TelemetryReporter = require('@vscode/extension-telemetry').default;

const KEY = '8c0a3736-8ee0-423d-9c4f-e207ae935339';
const TELEMETRY_DEV_OFF = true; // disables telemetry in dev mode - console.log only

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
		console.log(`Telemetry logging in Prod mode: ${this.isProd}, logging OFF: ${TELEMETRY_DEV_OFF}`);
	}

	/**
	 * Send telemetry event.
	 * @param {string} eventName
	 * @param {Object} [properties={}]
	 * @param {Object} [measurements={}]
	 */
	log(eventName, properties = {}, measurements = {}) {
		properties.isProd = this.isProd;
		if (TELEMETRY_DEV_OFF) {
			console.log(`Telemetry.log: ${eventName}`, properties, measurements);
			return;
		}
		this.reporter.sendTelemetryEvent(eventName, properties, measurements);
	}

	/**
	 * Send telemetry error event.
	 * @param {string} eventName
	 * @param {Object} [properties={}]
	 * @param {Object} [measurements={}]
	 */
	error(errorName, properties = {}, measurements = {}) {
		properties.isProd = this.isProd;
		if (TELEMETRY_DEV_OFF) {
			console.log(`Telemetry.error: ${errorName}`, properties, measurements);
			return;
		}
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