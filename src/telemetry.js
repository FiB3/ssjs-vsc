const vscode = require('vscode');
const { TelemetryReporter } = require('@vscode/extension-telemetry');
const ContextHolder = require('./config/contextHolder');
const logger = require('./auxi/logger');
const path = require('path');

// Connection string for Application Insights:
const CONNECTION_STRING = '8c0a3736-8ee0-423d-9c4f-e207ae935339';
const TELEMETRY_DEV_OFF = true; // disables telemetry in dev mode - logs via logger instead

class TelemetryHandler {
	constructor() {
		this.reporter = CONNECTION_STRING ? new TelemetryReporter(CONNECTION_STRING) : null;
		if (!this.reporter) {
			logger.warn('No telemetry reporter found. Please check your telemetry connection string.');
		}
	}

	/**
	 * One time initialization of the telemetry handler.
	 */
	init() {
		if (this.reporter) {
			ContextHolder.getContext().subscriptions.push(this.reporter);
		}
		this.isProd = ContextHolder.isProduction();
		logger.debug(`Telemetry logging in Prod mode: ${this.isProd}, logging OFF: ${TELEMETRY_DEV_OFF}`);
	}

	/**
	 * Send telemetry event.
	 * @param {string} eventName
	 * @param {Object} [properties={}]
	 * @param {Object} [measurements={}]
	 */
	log(eventName, properties = {}, measurements = {}) {
		properties.isProd = this.isProd;
		if (!this.isProd && TELEMETRY_DEV_OFF) {
			logger.info(`Telemetry.log: ${eventName}`, properties, measurements);
			return;
		}
		if (this.reporter) {
			this.reporter.sendTelemetryEvent(eventName, properties, measurements);
		}
	}

	/**
	 * Send telemetry error event.
	 * @param {string} eventName
	 * @param {Object} [properties={}]
	 * @param {Object} [measurements={}]
	 */
	error(errorName, properties = {}, measurements = {}) {
		properties.isProd = this.isProd;
		if (!this.isProd && TELEMETRY_DEV_OFF) {
			logger.error(`Telemetry.error: ${errorName}`, properties, measurements);
			return;
		}
		if (this.reporter) {
			this.reporter.sendTelemetryErrorEvent(errorName, properties, measurements);
		}
	}

	/**
	 * Dispose of the reporter.
	 */
	dispose() {
		if (this.reporter) {
			this.reporter.dispose();
		}
	}
}

module.exports = new TelemetryHandler();