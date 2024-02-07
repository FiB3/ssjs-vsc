const vscode = require('vscode');
const path = require('path');
const file = require('../auxi/file');
const json = require('../auxi/json');
const dialogs = require('../dialogs');

const Config = require('../config');

/**
 * Helper class to handle SFMC Code Snippets - creation in SFMC & storage within VSCode.
 */
class SnippetHandler {
		
	constructor(config, mc = null) {
		this.config = config;
		this.mc = mc;
	}

	attachMc(mc) {
		this.mc = mc;
	}

	getReqData(scriptText, devPageContext = 'ssjs') {
		let timestamp = Math.round(new Date().getTime() / 1000);
		let userId = this.config.getSfmcUserId() || 'anonymous';
		let assetName = `devAsset.${devPageContext}.${userId}.${timestamp}`;
		// get asset folder in MC:
		this.folderId = this.config.getAssetFolderId();

		// prepare minimal asset:
		let asset = {
			name: assetName,
			category: {
				id: this.folderId
			},
			content: scriptText,
			assetType: {
				id: 220
			}
		};
		return asset;
	}

	saveScriptText(filePath, snippetText, withFileOpen = false) {
		const scriptPath = path.join(Config.getUserWorkspacePath(), filePath);
		// console.log(`Code Snippet Path: ${scriptPath}`);
		file.save(scriptPath, snippetText);
		if (withFileOpen) {
			vscode.workspace.openTextDocument(scriptPath).then((doc) =>
				vscode.window.showTextDocument(doc, {
				})
			);
		}
		return scriptPath;
	}

	/**
	 * Save metadata file for the asset.
	 * @param {*} filePath path of the script file (not metadata file)
	 * @param {*} reqData data from asset creation/update request
	 */
	saveMetadata(filePath, reqData) {
		let dt = {};
		dt.id = reqData.body.id;
		dt.name = reqData.body.name;
		dt.assetType = reqData.body.assetType;
		dt.category = reqData.body.category;
		dt.enterpriseId = reqData.body.enterpriseId;
		dt.id = reqData.body.id;

		const metadataPath = this.getMetadataFileName(filePath);
		console.log(`metadata-path: ${metadataPath}`);
		json.save(metadataPath, dt);
	}

	// TODO: not finished yet:
	loadMetadata(filePath) {
		let metaPath = this.snippets.getMetadataFileName(filePath);
		let meta = json.load(metaPath);
	}

	async checkAssetFolder() {
		if (!this.config.getAssetFolderId()) {
			console.log(`No Folder ID`);
			return await this.createAssetFolder();
		} else {
			console.log(`Found Folder ID`);
			return true;
		}
	}

	async createAssetFolder() {
		const parentFolderName = await dialogs.getDevFolderParentName();
		const folderName = await dialogs.getDevFolderName();

		if (!folderName || !parentFolderName) {
			return false;
		}

		let f = await this.createFolder(folderName, parentFolderName);

		if (!f) {
			// add log??
			return false;
		} else {
			vscode.window.showInformationMessage(`Folder for Dev Assets created!`);
			this.config.setAssetFolderId(f.body.id, `${parentFolderName} > ${folderName}`);
			return true;
		}
	}

	/**
	 * Create new Dev Folder for Content Blocks.
	 * Store the data in the Config.
	 * @param {string} folderName 
	 */
	async createFolder(folderName, parentFolderName) {
		let parent = await this.getFolder(parentFolderName);
		if (!parent) {
			vscode.window.showWarningMessage(`Parent Folder not found!`);
			return false;
		}

		let r;
		try {
			r = await this.mc.createAssetFolder(folderName, parent.id);
		} catch (err) {
			console.log(`Error on creating Asset folder:`, err);
			let m = this.mc.parseRestError(err);
			vscode.window.showWarningMessage(`Could not create Content Builder Folder! \n${m}`);
			return false;
		} 
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

	// assetExists
	snippetExists(filePath) {
		const p = this.getMetadataFileName(filePath);
		console.log(`assetExists:`, p, '. exists?', file.exists(p));
		return file.exists(p);
	}

	/**
	 * 
	 * @param {string} filePath absolute path of the given script file
	 * @returns {string}
	 */
	getMetadataFileName(filePath) {
		return path.join(path.dirname(filePath), `.${this.getBlockName(filePath)}.json`);
	}

	getBlockName(filePath) {
		let fName = path.basename(filePath);
		return `${fName}-ssjs-vsc`;
	}

	getDeploymentFileName(devPathContext = 'page') {
		return `./.vscode/deployment.${devPathContext}.ssjs`;
	}

	getDevAssetFileName(devPathContext = 'page') {
		return `./.vscode/devAsset.${devPathContext}.ssjs`;
	}
}

module.exports = SnippetHandler;