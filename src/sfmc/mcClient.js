const ET_Client = require('sfmc-fuelsdk-node');

module.exports = class McClient {
	
	constructor(subdomain, clientId, clientSecret, mid) {
		this.client = new ET_Client(
				clientId,
				clientSecret,
				null,
				{
					origin: `https://${subdomain}.rest.marketingcloudapis.com`,
					authOrigin: `https://${subdomain}.auth.marketingcloudapis.com`,
					soapOrigin: `https://${subdomain}.soap.marketingcloudapis.com/Service.asmx`,
					authOptions: {
						authVersion: 2
					}
		});
		if (mid) {
			this.client.authOptions.accountId = mid;
		}
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
					console.log(r);

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
}