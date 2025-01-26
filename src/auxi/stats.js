const { init } = require("../telemetry");

const CACHE_NAME = 'ssjs-vsc:stats';

class Stats {
	constructor() {
		this.context;
		this.state;
	}

	init(context) {
		this.context = context;
		this.state = this.context.workspaceState.get(CACHE_NAME, { apiCalls: 0 });
	}

	/**
	 * Get the number of API calls made.
	 * @returns {number} - the number of API calls made.
	 */
	getApiCalls() {
		let dt = this.context.workspaceState.get(CACHE_NAME, { apiCalls: 0 });
		return dt.apiCalls || 0;
	}

	/**
	 * Add an API call to the stats.
	 * @param {number} [incrementBy=1] - number to increment the API call count by.
	 */
	addApiCalls(incrementBy = 1) {
		this.context.workspaceState.update(CACHE_NAME, {
			apiCalls: this.getApiCalls() + incrementBy
		});
	}

	/**
	 * Clear the stats data.
	 */
	clearData() {
		this.context.workspaceState.update(CACHE_NAME, { apiCalls: 0 });
	}
}

module.exports = new Stats();