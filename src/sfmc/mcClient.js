const ET_Client = require('sfmc-fuelsdk-node');

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
		return filtered ? filtered[0] : false;
	}

	async getAssetFolders() {
		const allItems = [];
    let page = 1;
		let qs = {
			'$page': 1,
			'$pageSize': 500
		};

    while (true) {
			try {
				const r = await this._get(`/asset/v1/content/categories`, qs);
				if (r.statusCode !== 200) {
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

	async validateApiKeys() {
		return this._get(`/platform/v1/tokenContext`);
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
					console.log(`MC._post:`, r);

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
					console.log(r);

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