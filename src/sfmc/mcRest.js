const axios = require('axios');
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
      axios.post(this.authUrl, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        account_id: this.accountId,
        grant_type: 'client_credentials'
      })
				.then(response => {
					this.accessToken = response.data.access_token;
					this.tokenExpiry = Date.now() + response.data.expires_in * 1000;
					resolve(response.data);
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

  async get(endpoint, query ) {
    return this._request('GET', endpoint, query);
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
      url,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      params: query,
      data: body
    };

    this.onApiCall(method, endpoint); // Notify about API call

		return new Promise((resolve, reject) => {
			axios(config)
					.then(response => {
						let r = {
							statusCode: response.status,
							statusMessage: response.statusText,
							body: response.data
						};
						logger.info(`MC._request ${method} ${endpoint}:`, r);

						if ([ 200, 201, 202 ].includes(response.status)) {
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
						logger.error(`MC._request ${method} ${endpoint}: ${JSON.stringify(r)}`);
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
