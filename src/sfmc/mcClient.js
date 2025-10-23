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
	'email_write',
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

	/*
		assetTypeId: webpage (205), json (182) ?
	*/
	async createAsset(name, content, assetTypeId) {
		logger.log('CREATE ASSET');
		let body = {
			"name": name,
			// "content": content,
			"assetType": {
					"id": assetTypeId
			},
			"version": 1,
			"contentType": "text/html",
			// "category": {
			// 	"name": "Content Builder", // by default
			// },
			"meta": {
				"globalStyles": {
						"isLocked": false,
						"body": {
								"max-width": "1280px"
						}
				}
			},
			"views": {
					"html": {
							"thumbnail": {},
							"content": content,
							"meta": {},
							"slots": {
									"col1": {
											"design": "<p style=\"font-family:arial;color:#ccc;font-size:11px;text-align:center;vertical-align:middle;font-weight:bold;padding:10px;margin:0;border:#ccc dashed 1px;\">Drop blocks or content here</p>",
											"modelVersion": 2
									}
							},
							"modelVersion": 2
					}
			},
			"availableViews": [
					"html"
			]
		};
		logger.log('BODY:', body);
		return this._post(`/asset/v1/content/assets`, body);
	}

	async createAsset(assetData) {
		return this._post(`/asset/v1/assets/`, assetData);
	}

	async updateAsset(assetId, assetData) {
		return this._patch(`/asset/v1/assets/${assetId}`, assetData);
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

		while (true && page < 100) {
			try {
				const r = await this._get(`/asset/v1/content/categories`, {
					'$page': page,
					'$pageSize': 500
				});

				if (r.statusCode !== 200) {
					logger.errpr(`Get Asset Folders: ${r.statusCode}:`, r);
					break;
				}
				const result = r.body;
				if (!result || result.items?.length === 0) {
					logger.log('No Result!');
					break;
				}
				allItems.push(...result.items);
				// If the current page is the last page, exit the loop
				if (result.page >= Math.ceil(result.count / result.pageSize)) {
					logger.log(`Last Page: ${result.count} total items.`);
					break;
				}

				// Increment the page number for the next request
				page++;
			} catch (error) {
				// Handle errors, e.g., network errors or other exceptions
				logger.error('Error retrieving items:', error);
				break; // Exit the loop on error
			}
		}
		return allItems;
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