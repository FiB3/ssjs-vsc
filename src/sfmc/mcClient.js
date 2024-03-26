const ET_Client = require('sfmc-fuelsdk-node');

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
		let clientSetup = {
			origin: `https://${subdomain}.rest.marketingcloudapis.com`,
			authOrigin: `https://${subdomain}.auth.marketingcloudapis.com`,
			soapOrigin: `https://${subdomain}.soap.marketingcloudapis.com/Service.asmx`,
			authOptions: {
				authVersion: 2
			}
		};
		if (mid) {
			clientSetup.authOptions.accountId = mid;
		}

		this.client = new ET_Client(
				clientId,
				clientSecret,
				null,
				clientSetup
		);

	}

	/*
		assetTypeId: webpage (205), json (182) ?
	*/
	async createAsset(name, content, assetTypeId) {
		console.log('CREATE ASSET');
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
		console.log('BODY:', body);
		return this._post(`/asset/v1/content/assets`, body);
	}

	async createAssetFolder(name, parentId = 0) {
		let b = {
			name: name,
			parentId: parentId
		};
		return await this._post('/asset/v1/content/categories', b);
	}

	async getAssetFolder(folderName) {
		let folders = await this.getAssetFolders();
		
		let filtered = folders.filter((fldr) => {
			return fldr.name === folderName;
		});
		console.log('Filtered Asset Folders:', filtered);
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
					console.errpr(`Get Asset Folders: ${r.statusCode}:`, r);
					break;
				}
				const result = r.body;
				if (!result || result.items?.length === 0) {
					console.log('No Result!');
					break;
				}
				allItems.push(...result.items);
				// If the current page is the last page, exit the loop
				if (result.page >= Math.ceil(result.count / result.pageSize)) {
					console.log(`Last Page: ${result.count} total items.`);
					break;
				}

				// Increment the page number for the next request
				page++;
			} catch (error) {
				// Handle errors, e.g., network errors or other exceptions
				console.error('Error retrieving items:', error);
				break; // Exit the loop on error
			}
    }
    return allItems;
	}

	async validateApi() {
    let r = {
      ok: true,
			message: `API Connection OK.`
    };

    try {
        await this.validateScopes();
        console.log(`API Scopes OK.`);
    } catch (err) {
        r.ok = false;
				console.error('validateApiKeys error:', err);
        if (Array.isArray(err)) {
            r.message = `Installed Package is missing required scopes: \n${err.join(', ')}. Please update the package in SFMC and reopen VSCode.`;
        } else {
            let m = this.parseRestError(err);
            r.message = `SFMC API Scopes issue: \n${m}`;
        }
        return r;
    }

    try {
        const data = await this.validateApiKeys();
        console.log(`API Keys OK.`);
        r.userId = data.body?.user?.id;
    } catch (err) {
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
			this.client.FuelAuthClient.getAccessToken()
					.then((data) => {
						// console.log('validateApiKeys.getAccessToken.scopes: ', data.scope, '.');
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
						console.error('validateApiKeys.getAccessToken error:', err);
						resolve(err);
					});
		});
	}

	async _post(uri, body) {
		return new Promise((resolve, reject) => {
			this.client.RestClient.post({
					uri,
					body,
					json: true
				})
				.then((data) => {
					let r = {
						statusCode: data.res.statusCode,
						statusMessage: data.res.statusMessage,
						body: data.body
					};
					console.log(`MC._post ${uri}:`, r);

					if ([ 200, 201, 202 ].includes(data.res?.statusCode)) {
						resolve(r);
					} else {
						reject(r);
					}
				})
				.catch((err) => {
					console.error(`POST ${uri}: ${JSON.stringify(err)}`);
					reject(err);
				});
		});
	}

	async _patch(uri, body) {
		return new Promise((resolve, reject) => {
			this.client.RestClient.patch({
					uri,
					body,
					json: true
				})
				.then((data) => {
					let r = {
						statusCode: data.res.statusCode,
						statusMessage: data.res.statusMessage,
						body: data.body
					};
					console.log(`MC._patch ${uri}:`, r);

					if ([ 200, 201, 202 ].includes(data.res?.statusCode)) {
						resolve(r);
					} else {
						reject(r);
					}
				})
				.catch((err) => {
					console.error(`PATCH ${uri}: ${JSON.stringify(err)}`);
					reject(err);
				});
		});
	}

	async _get(uri, qs) {
		return new Promise((resolve, reject) => {
			this.client.RestClient.get({
					uri,
					qs,
					json: true
				})
				.then((data) => {
					let r = {
						statusCode: data.res.statusCode,
						statusMessage: data.res.statusMessage,
						body: data.body
					};
					console.log(`MC._get ${uri}:`, r);

					if ([ 200, 201, 202 ].includes(data.res?.statusCode)) {
						resolve(r);
					} else {
						reject(r);
					}
				})
				.catch((err) => {
					console.error(`GET ${uri}: ${JSON.stringify(err)}`);
					reject(err);
				});
		});
	}

	parseRestError(err) {
		if (err.body?.validationErrors?.length) {
			const ve = err.body.validationErrors[0];
			return ve?.message ? ve.message : JSON.stringify(ve);
		} else if (err.body?.message) {
			return err.body.message;
		} else if (err.res?.error_description) {
			return err.res.error_description;
		}
		return JSON.stringify(err);
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