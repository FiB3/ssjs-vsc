const vscode = require('vscode');
var fs = require('fs');
var path = require('path');

const Mustache = require('mustache');

const mcClient = require('./sfmc/mcClient');
const file = require('./auxi/file');
const json = require('./auxi/json');

Mustache.escape = function(text) {return text;};

module.exports = class AssetCodeProvider {

	constructor(config) {
		this.config = config;

		this.folderId = 460715; // TODO: use from storage
	}

	async createNewBlock(filePath) {
		let asset = this.getAssetReqData(filePath);

		// create the asset:
		await this.mc._post(`/asset/v1/assets/`, asset)
				.then((data) => {
					console.log('DATA', data);
					// add the file path to the asset json??
					// save the json with details as name.ssjs-vsc.json
					const p = this.getBlockMetaFile(filePath);
					json.save(p, data.body);
				})
				.catch((err) => {
					console.log('ERR', err);
					// TODO: show error message:
					vscode.window.showErrorMessage(`Error on creating Dev Asset.`);
				});
	}

	async updateCode(filePath) {
		// get metadata:
		let metaPath = this.getBlockMetaFile(filePath);
		let meta = json.load(metaPath);
		// grab only the stuff to use:
		let fileText = file.load(filePath);
		// TODO: template:

		// 
		let asset = {
			content: fileText
		};

		await this.mc._patch(`/asset/v1/assets/${meta.id}`, asset)
				.then((data) => {
					console.log('DATA', data);
					// add the file path to the asset json??
					// save the json with details as name.ssjs-vsc.json
					const p = this.getBlockMetaFile(filePath);
					json.save(p, data.body);
				})
				.catch((err) => {
					console.log('ERR', err);
					// TODO: show error message:
					vscode.window.showErrorMessage(`Error on updating Dev Asset.`);
				});
	}

	getAssetReqData(filePath) {
		// get the file
		let fileText = file.load(filePath);
		// TODO: template:


		// prepare minimal asset:
		let asset = {
			name: this.getBlockName(filePath),
			category: {
				id: this.folderId
			},
			content: fileText,
			assetType: {
				id: 220
			}
		};
		return asset;
	}

	assetExists(filePath) {
		const p = this.getBlockMetaFile(filePath);
		console.log(`assetExists:`, p, '. exists?', file.exists(p));
		return file.exists(p);
	}

	getBlockMetaFile(filePath) {
		return path.join(path.dirname(filePath), `${this.getBlockName(filePath)}.json`);
	}

	getBlockName(filePath) {
		let fName = path.basename(filePath);
		return `${fName}-ssjs-vsc`;
	}

	async initMcClient() {
		let c = await this.config.getSfmcInstanceData();
		console.log('Config:', c);
		this.mc = new mcClient(c.subdomain, c.clientId, c.clientSecret, c.mid);
	}
}