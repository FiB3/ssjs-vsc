const { logger } = require('./logger');

const CACHE_NAME = 'ssjs-vsc:stats';

class Stats {
	constructor() {
		this.context;
		this.state;
	}

	init(context) {
		this.context = context;
		this.state = this.context.workspaceState.get(CACHE_NAME, {
				apiCalls: 0,
				createdDate: new Date().toISOString()
		});
		if (this.state.apiCalls === undefined || this.state.createdDate === undefined) {
			this.state = {
				apiCalls: this.state.apiCalls || 0,
				createdDate: new Date().toISOString()
			};
			this.context.workspaceState.update(CACHE_NAME, this.state);
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
	 * Add an API call to the stats with timestamp tracking.
	 * @param {number} [incrementBy=1] - number to increment the API call count by.
	 */
	addApiCalls(incrementBy = 1) {
		this.context.workspaceState.update(CACHE_NAME, {
			apiCalls: this.getApiCalls() + incrementBy,
			createdDate: this.state.createdDate
		});
	}

	/**
	 * Clear the stats data.
	 */
	clearData() {
		this.context.workspaceState.update(CACHE_NAME, {
				apiCalls: 0,
				createdDate: new Date().toISOString()
		});
	}
}

module.exports = new Stats();