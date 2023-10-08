const vscode = require('vscode');
var fs = require('fs');
var path = require('path');

const mcClient = require('./sfmc/mcClient');

const { template } = require('./template')
const file = require('./auxi/file');
const json = require('./auxi/json');

module.exports = class AssetCodeProvider {

	constructor(config) {
		this.config = config;

		this.folderId;
		this.mc = null;
	}

	/**
	 * Create New Dev Asset Block based on File.
	 * @param {string} filePath path of the ssjs file.
	 */
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

	/**
	 * Update Dev Asset Block  based on File.
	 * @param {string} filePath path of the ssjs file.
	 */
	async updateCode(filePath) {
		// get metadata:
		let metaPath = this.getBlockMetaFile(filePath);
		let meta = json.load(metaPath);
		// get templated file:
		let fileText = template.runOneFile(filePath, this.config, true);

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

	/**
	 * Create new Dev Folder for Content Blocks.
	 * Store the data in the Config.
	 * @param {string} folderName 
	 */
	async createFolder(folderName, parentFolderName) {
		// TODO: implement
		// TODO: update this.folderId
		let parent = await this.getFolder(parentFolderName);
		if (!parent) {
			return false;
		}

		let r = await this.mc.createAssetFolder(folderName, parent.id);
		return r;
	}

	/**
	 * Get info about Dev Folder for Content Blocks.
	 * Store the data in the Config.
	 * @param {string} folderName 
	 */
	async getFolder(folderName) {
		return await this.mc.getAssetFolder(folderName);
	}

	getAssetReqData(filePath) {
		// get templated file:
		let fileText = template.runOneFile(filePath, this.config, true);
		// get asset folder in MC:
		this.folderId = this.config.getAssetFolderId();
		
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
		// console.log('Config:', c);
		this.mc = new mcClient(c.subdomain, c.clientId, c.clientSecret, c.mid);
	}
}