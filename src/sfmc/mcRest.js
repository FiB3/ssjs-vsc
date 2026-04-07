const logger = require('../auxi/logger');

class McRest {
  constructor({ subdomain, clientId, clientSecret, accountId, onApiCall }) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accountId = accountId;
    this.subdomain = subdomain;
    this.baseUrl = `https://${subdomain}.rest.marketingcloudapis.com`;
    this.authUrl = `https://${subdomain}.auth.marketingcloudapis.com/v2/token`;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.authPromise = null; // to only run one auth at the time
    this.onApiCall = onApiCall || ((method, url) => { logger.log(`MC._request ${method} ${url}`); }); // Fallback no-op function
  }

  async authenticate() {
    if (this.authPromise) {
      return this.authPromise;
    }

    this.authPromise = this.getAccessToken()
				.then(() => {
					this.authPromise = null;
				}).catch(error => {
					this.authPromise = null;
					throw new Error(`Authentication failed: ${error.message}`);
				});

    return this.authPromise;
  }

	async getAccessToken() {
		this.onApiCall('POST', `/v2/token`);

    return new Promise((resolve, reject) => {
      fetch(this.authUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					client_id: this.clientId,
					client_secret: this.clientSecret,
					account_id: this.accountId,
					grant_type: 'client_credentials'
				})
      })
				.then(async response => {
					let data = await response.json();
					this.accessToken = data.access_token;
					this.tokenExpiry = Date.now() + data.expires_in * 1000;
					resolve(data);
				})
				.catch(error => {
          reject({
            statusCode: error.response?.status || 500,
            statusMessage: error.response?.statusText || error.message,
            body: error.response?.data || error.message
          });
				});
    });
	}

  async get(endpoint, query = {}) {
    return this._request('GET', endpoint, query);
  }

  async getAll(endpoint, query = {}) {
    const allItems = [];
    let page = 1;
    while (true && page < 100) {
      try {
        const r = await this.get(endpoint, { '$page': page, '$pageSize': 500, ...query });

				if (r.statusCode !== 200) {
					logger.error(`getAll ${endpoint} (${page}): ${r.statusCode}:`, r);
					throw new Error(r);
				}
				const result = r.body;
				if (!result || result.items?.length === 0) {
					logger.log(`getAll ${endpoint} (${page}): No Result!`);
					break;
				}
				allItems.push(...result.items);
				// If the current page is the last page, exit the loop
				if (result.page >= Math.ceil(result.count / result.pageSize)) {
					logger.log(`getAll ${endpoint} (${page}): Last Page: ${result.count} total items.`);
					break;
				}

				// Increment the page number for the next request
				page++;
			} catch (error) {
				// Handle errors, e.g., network errors or other exceptions
				logger.error(`getAll ${endpoint} (${page}): Error retrieving items:`, error);
				throw error; // Exit the loop on error
			}
    }
    return allItems;
  }

  async post(endpoint, query, body ) {
    return this._request('POST', endpoint, query, body);
  }

	async patch(endpoint, query, body) {
		return this._request('PATCH', endpoint, query, body);
	}

  async put(endpoint, query, body) {
    return this._request('PUT', endpoint, query, body);
  }

  async delete(endpoint, query, body) {
    return this._request('DELETE', endpoint, query, body);
  }

	async _request(method, endpoint, query = {}, body = {}) {
    await this.ensureAuthenticated();

    const url = endpoint.startsWith('https://')
				? endpoint
				: `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const config = {
      method,
      // url,
      headers: {
        // Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      params: query,
      data: body
    };

    this.onApiCall(method, endpoint); // Notify about API call

		return new Promise((resolve, reject) => {
			fetch(url, config)
					.then(async response => {
						let data = await response.json();
						let r = {
							statusCode: response.status,
							statusMessage: response.statusText || 'Unknown result',
							body: data
						};
						logger.info(`MC._request ${method} ${endpoint}:`, r);

						if ([ 200, 201, 202 ].includes(r.statusCode)) {
							resolve(r);
						} else {
							reject(r);
						}
					})
					.catch(error => {
						logger.error(error);
						let r = {
							statusCode: error.status || 0,
							statusMessage: error.message || 'JS Error',
							body: error.response?.data || JSON.stringify(error)
						};
						logger.error(`MC._request ${method} ${endpoint}:`, r);
						reject(r);
					});
		});
  }

	async ensureAuthenticated() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }
}

module.exports = McRest;
