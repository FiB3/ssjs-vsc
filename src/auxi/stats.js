const { logger } = require('./logger');
const ContextHolder = require('../config/contextHolder');

const CACHE_NAME = 'ssjs-vsc:stats';

class Stats {
	constructor() {
		this.context = null;
		this.state = null;
	}

	init() {
		this.context = ContextHolder.getContext();
		this.state = this.context.workspaceState.get(CACHE_NAME, {
				apiCalls: 0,
				createdDate: new Date().toISOString(),
				lastTokenRefresh: new Date().toISOString()
		});
		// if api calls are not properly set, let's reinit them
		if (this.state.apiCalls === undefined || this.state.createdDate === undefined) {
			this.state.apiCalls = this.state.apiCalls || 0;
			this.state.createdDate = new Date().toISOString();
			this.updateState('init');
		}
	}

	/**
	 * Get the number of API calls made.
	 * @returns {number} - the number of API calls made.
	 */
	getApiCalls() {
		return this.state.apiCalls || 0;
	}

	/**
	 * Get the creation date of the stats data.
	 * @returns {Date} - the creation date of the stats data.
	 */
	getCreatedDate() {
		logger.log(`getCreatedDate`, this.state.createdDate);
		return new Date(this.state.createdDate);
	}


	/**
	 * Get the last token refresh date.
	 * @returns {Date} - the last token refresh date.
	 */
	getLastTokenRefresh() {
		let lastTokenRefresh = this.state.lastTokenRefresh;
		logger.log(`getLastTokenRefresh: ${lastTokenRefresh}.`);
		return lastTokenRefresh ? new Date(lastTokenRefresh) : new Date('1970-01-01T00:00:00Z');
	}

	/**
	 * Set the last token refresh date.
	 * @param {Date} date - the last token refresh date.
	 */
	updateLastTokenRefresh(date = new Date()) {
		this.state.lastTokenRefresh = date.toISOString();
		this.updateState('updateLastTokenRefresh');
	}

	/**
	 * Add an API call to the stats with timestamp tracking.
	 * @param {number} [incrementBy=1] - number to increment the API call count by.
	 */
	addApiCalls(incrementBy = 1) {
		this.state.apiCalls += incrementBy;
		this.updateState('addApiCalls');
	}

	/**
	 * Clear the stats data.
	 */
	clearData() {
		this.state = {
			apiCalls: 0,
			createdDate: new Date().toISOString(),
			lastTokenRefresh: new Date().toISOString()
		};
		this.updateState('clearData');
	}

	updateState(reason) {
		logger.log(`updateState(${reason}): ${JSON.stringify(this.state)}.`);
		this.context.workspaceState.update(CACHE_NAME, this.state);
	}
}

module.exports = new Stats();