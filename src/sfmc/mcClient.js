const McRest = require('./mcRest');
const logger = require('../auxi/logger');
const stats = require('../auxi/stats');

/*
	list of required scopes per endpoint:
	GET /platform/v1/configcontext, GET /platform/v1/tokenContext - no scopes
	POST: /asset/v1/content/assets; POST, PATCH: /asset/v1/assets/
			- saved_content_write, email_write, documents_and_images_read, documents_and_images_write
		POST: /asset/v1/content/categories
			- documents_and_images_write, documents_and_images_read
*/
const REQUIRED_SCOPES = [
	'saved_content_write',
	'saved_content_read',
	'email_write',
	'email_read',
	'documents_and_images_read',
	'documents_and_images_write'
];

module.exports = class McClient {
	
	constructor(subdomain, clientId, clientSecret, mid) {
		this.client = new McRest({
			subdomain,
			clientId,
			clientSecret,
			accountId: mid,
			onApiCall: () => { stats.addApiCalls(); }
		});
		
		this.folders = false;
	}

	async createAsset(assetData) {
		logger.log('MC-Client: createAsset(2):', assetData);
		return this._post(`/asset/v1/assets/`, assetData);
	}

	async updateAsset(assetId, assetData) {
		return this._patch(`/asset/v1/assets/${assetId}`, assetData);
	}

	async deleteAsset(assetId) {
		return this._delete(`/asset/v1/assets/${assetId}`);
	}

	async getAsset(assetId) {
		return this._get(`/asset/v1/assets/${assetId}`);
	}

	/**
	 * Get all assets from SFMC - simple filter only.
	 * @param {object} query - query parameters.
	 * @returns {array} Array of assets.
	 */
	async getAssets(query = {}) {
		return this.client.getAll(`/asset/v1/assets`, query);
	}

	async createAssetFolder(name, parentId = 0) {
		let b = {
			name: name,
			parentId: parentId
		};
		return await this._post('/asset/v1/content/categories', b);
	}

	async getAssetFolder(folderName, refresh = true) {
		if (refresh || !this.folders) {
			logger.log('Refreshing Asset Folders...');
			this.folders = await this.getAssetFolders();
		}
		
		let filtered = this.folders.filter((fldr) => {
			return fldr.name === folderName;
		});
		logger.log('Filtered Asset Folders:', filtered);
		return filtered ? filtered[0] : false;
	}

	async getAssetFolders() {
		const allItems = [];
		let page = 1;

		return this.client.getAll(`/asset/v1/content/categories`);
	}

	async getAssetFolderById(folderId) {
		return this._get(`/asset/v1/content/categories/${folderId}`);
	}

	async validateApi() {
		let r = {
			ok: true,
			message: `API Connection OK.`
		};

		try {
			const tokenResponse = await this.validateScopes();
			if (Array.isArray(tokenResponse) && tokenResponse.length > 0 && 'statusCode' in tokenResponse[0]) {	// This means it's an error response
				r.ok = false;
				r.message = `SFMC API Scopes issue: \n${this.parseRestError(tokenResponse)}`;
				return r;
			}
			logger.log(`API Scopes OK.`);
		} catch (err) {
			r.ok = false;
			logger.error('validateApiKeys error:', err);

			if (Array.isArray(err)) {
				r.message = `Installed Package is missing required scopes: \n"${err.join(', ')}". Please update the package in SFMC and try again.`;
			} else {
				let m = this.parseRestError(err);
				r.message = `SFMC API Scopes issue: \n${m}`;
			}
			return r;
		}

		try {
				const data = await this.validateApiKeys();
				logger.log(`API Keys OK. user: ${data.body?.user?.id}, mid: ${data.body?.organization?.id}.`);
				r.userId = data.body?.user?.id;
				r.mid = data.body?.organization?.id;
		} catch (err) {
			logger.error('validateApiKeys error:', err);
			r.ok = false;
			let m = this.parseRestError(err);
			r.message = `SFMC API Credentials issue: \n${m}`;
		}
		return r;
	}

	async validateApiKeys() {
		return this._get(`/platform/v1/tokenContext`);
	}

	/**
	 * Validates, if passed scopes are valid for SSJS Manager.
	 * @returns {Promise<boolean|array|error>} - resolves with true, rejects missing scopes array or error.
	 */
	async validateScopes() {
		return new Promise((resolve, reject) => {
			// this.client.FuelAuthClient.getAccessToken()
			this.client.getAccessToken()
					.then((data) => {
						logger.log('validateApiKeys.getAccessToken.scopes: ', data.scope, '.');
						let scopes = data.scope ? data.scope.split(' ') : [];
						let missingScopes = [];
						REQUIRED_SCOPES.forEach((reqScope) => {
							if (!scopes.includes(reqScope)) {
								missingScopes.push(reqScope);
							}
						});
						if (missingScopes.length) {
							reject(missingScopes);
						} else {
							resolve(true);
						}
					})
					.catch((err) => {
						logger.error('validateApiKeys.getAccessToken error:', err);
						reject(err);
					});
		});
	}

	async _post(uri, body) {
		return this.client.post(uri, {}, body);
	}

	async _patch(uri, body) {
		return this.client.patch(uri, {}, body);
	}

	async _get(uri, qs) {
		return this.client.get(uri, qs);
	}

	async _delete(uri) {
		return this.client.delete(uri);
	}

	parseRestError(err) {
		logger.log('parseRestError:', JSON.stringify(err));
		
		if (err.body?.validationErrors?.length) {
			const ve = err.body.validationErrors[0];
			return ve?.message ? ve.message : JSON.stringify(ve);
		} else if (err.body?.message) {
			return err.body.message;
		} else if (err.res?.error_description) {
			return err.res.error_description;
		} else if (err.statusMessage) {
			return `${err.statusCode ? err.statusCode + ': ' : ''}${err.statusMessage}.`
		}
		return JSON.stringify(err);
	}

	isDuplicateAssetError(err) {
		logger.log('isDuplicateAssetError:', err?.statusCode, '-', err.statusMessage);
		let parsed = this.parseRestError(err);
		if (
				err?.statusCode === 400
				&& parsed.includes('must be unique.')
				&& parsed.includes('already taken. Suggested name')
		) {
			return true;
		}
	}

	isNotFoundError(err) {
		return err?.statusCode === 404;
	}

	static extractSubdomain(fqdn) {
		if (typeof(fqdn) === 'string') {
			fqdn = fqdn.trim();
			if (fqdn.substring(0, 8) === 'https://') {
				const subdomainRegex = /^https?:\/\/([a-zA-Z0-9.-]+)\.(auth|rest|soap).*/i;

				const match = fqdn.match(subdomainRegex);
				if (match && match[1]) {
						return match[1];
				} else {
						return fqdn;
				}
			} else if (fqdn.substring(0, 2) === 'mc' && fqdn.length > 15) {
				return fqdn;
			} else {
				return false;
			}
		} else {
			return false;
		}
	}
}