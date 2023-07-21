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