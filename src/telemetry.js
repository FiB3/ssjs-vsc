const vscode = require('vscode');
const TelemetryReporter = require('@vscode/extension-telemetry').default;
const ContextHolder = require('./config/contextHolder');
const logger = require('./auxi/logger');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Connection string for Application Insights - only used in development
const CONNECTION_STRING = process.env.SSJS_VSC_TELEMETRY;
const TELEMETRY_DEV_OFF = true; // disables telemetry in dev mode - logs via logger instead

class TelemetryHandler {
	constructor() {
		this.reporter = CONNECTION_STRING ? new TelemetryReporter(CONNECTION_STRING) : null;
		if (!this.reporter) {
			logger.warn('No telemetry reporter found. Please check your .env file.');
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