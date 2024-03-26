const vscode = require('vscode');
const path = require('path');
const file = require('./auxi/file');
const json = require('./auxi/json');
const dialogs = require('./ui/dialogs');
const { template } = require('./template');

const Config = require('./config');

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

	/**
	 * Create new Dev/Deploy Asset in SFMC for the given script file.
	 * @param {Object} asset asset data for the creation request 
	 * @param {boolean|string} devPageContext - false for dev asset, string for deployment asset (page/text)
	 * @param {string} filePath - path of the script file (to create metadata file) 
	 * @returns {number|boolean} - asset ID if created, false if failed.
	 */
	async createSfmcSnippet(asset, devPageContext = false, filePath) {
		let assetId = 0;
		await this.mc._post(`/asset/v1/assets/`, asset)
				.then((data) => {
					assetId = data.body.id;
					this.saveMetadata(filePath, data);
					if (!devPageContext) {
						vscode.window.showInformationMessage(`Asset created.`);
					} else {
						vscode.window.showInformationMessage(`Deployment Asset for ${dialogs.getFriendlyDevContext(devPageContext)} Installed.`);
					}
				})
				.catch((err) => {
					console.error('Create Dev Asset ERR:', err);
					asset.content = '<<script>>';
					console.debug('Dev Asset data:', asset);
					// TODO: show error message:
					let m = this.mc.parseRestError(err);
					if (!devPageContext) {
						vscode.window.showErrorMessage(`Error on Creating Dev Asset! \n${m}`);
					} else {
						vscode.window.showErrorMessage(`Error on Installing Dev Asset for ${dialogs.getFriendlyDevContext(devPageContext)}! \n${m}`);
					}
					assetId = false;
				});
		return assetId;
	}

	/**
	 * Update existing Dev/Deploy Asset in SFMC for the given script file.
	 * @param {number} devAssetId ID of the Asset
	 * @param {string} scriptText
	 * @param {boolean|string} devPageContext - false for dev asset, string for deployment asset (page/text)
	 * @param {string} filePath - path of the script file (to create metadata file)
	 * @returns {number|boolean} - asset ID if updated, false if failed.
	 */
	async updateSfmcSnippet(devAssetId, scriptText, devPageContext = false, filePath) {
		let asset = {
			content: scriptText
		};
		
		let assetId = 0;
		await this.mc._patch(`/asset/v1/assets/${devAssetId}`, asset)
				.then((data) => {
					assetId = data.body.id;
					this.saveMetadata(filePath, data, true);
					if (!devPageContext) {
						vscode.window.showInformationMessage(`Asset Updated.`);
					} else {
						vscode.window.showInformationMessage(`Dev Asset for ${dialogs.getFriendlyDevContext(devPageContext)} Updated.`);
					}
				})
				.catch((err) => {
					assetId = false;
					console.error('Update Dev Asset ERR:', err);
					asset.content = '<<script>>';
					console.debug('Dev Asset data:', asset);
					// TODO: show error message:
					let m = this.mc.parseRestError(err);
					if (!devPageContext) {
						vscode.window.showErrorMessage(`Error on Updating Dev Asset! \n${m}`);
					} else {
						vscode.window.showErrorMessage(`Error on Updating Dev Asset for ${dialogs.getFriendlyDevContext(devPageContext)}! \n${m}`);
					}
				});
		return assetId;
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

	saveDevContext(filePath, devContext) {
		this.addToMetadata(filePath, { devContext });
	}

	getDevContext(filePath) {
		let meta = this.loadMetadata(filePath);
		console.log(`getDevContext: meta.devContext: ${meta.devContext}.`, meta);
		return meta.devContext || false;
	}

	/**
	 * Save metadata file for the asset.
	 * @param {*} filePath path of the script file (not metadata file)
	 * @param {*} reqData data from asset creation/update request
	 * @param {boolean} upsert - if true, the metadata file will be updated, if exists.
	 */
	saveMetadata(filePath, reqData, upsert = false) {
		let dt = {};
		dt.id = reqData.body.id;
		dt.name = reqData.body.name;
		dt.assetType = reqData.body.assetType;
		dt.category = reqData.body.category;
		dt.enterpriseId = reqData.body.enterpriseId;
		dt.id = reqData.body.id;
		// TODO: make automatic upsert if file exists:
		if (upsert === true) {
			this.addToMetadata(filePath, dt);
			return;
		}
		const metadataPath = this.getMetadataFileName(filePath);
		console.log(`metadata-path: ${metadataPath}`);
		json.save(metadataPath, dt);
	}

	/**
	 * Add metadata to the metadata file.
	 * @param {string} filePath - path of the file - gets metadata file path automatically.
	 * @param {object} data
	 */
	addToMetadata(filePath, data) {
		let dt = this.loadMetadata(filePath);
		Object.assign(dt, data);
		// console.log('addToMetadata:', dt);
		const metadataPath = this.getMetadataFileName(filePath);
		json.save(metadataPath, dt);
	}

	/**
	 * Load metadata file for the asset.
	 * @param {string} filePath path of the script file (not metadata file)
	 * @returns {object} metadata object
	 */
	loadMetadata(filePath) {
		let metaPath = this.getMetadataFileName(filePath);
		// TODO: add validation for validity of the file (JSON, values, etc.)
		return json.load(metaPath);
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

	// version for dialog
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

	// version for Custom View
	async createAssetFolderUi(parentFolderName = 'Content Builder', folderName) {
		if (!folderName) {
			return {
				ok: false,
				message: 'Folder name not provided.'
			};
		}
		if (typeof(parentFolderName) === 'string' && parentFolderName.trim().length == 0) {
			parentFolderName = 'Content Builder';
		}
		if (typeof(folderName) === 'string' && parentFolderName.trim().length == 0) {
			return {
				ok: false,
				message: 'Requires Name of the new folder!'
			};
		}

		let f = await this.createFolder(folderName, parentFolderName);

		if (!f) {
			console.log(`Could not create Content Builder Folder!`, f);
			return {
				ok: false,
				message: 'Could not create Content Builder Folder!'
			};
		} else {
			let fldrPath = `${parentFolderName} > ${folderName}`;
			this.config.setAssetFolderId(f.body.id, fldrPath);
			return {
				ok: true,
				message: `Folder for Dev Assets created at ${fldrPath}.`
			};
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

	/**
	 * Checks if assets exists based on asset-metadata file existence.
	 * @param {string} filePath 
	 * @returns {boolean}
	 */
	snippetExists(filePath) {
		const p = this.getMetadataFileName(filePath);
		console.log(`assetExists:`, p, '. exists?', file.exists(p));
		return file.exists(p);
	}

	/**
	 * Prepare Request Body for (new) Deployment Asset/Snippet.
	 * @param {string} scriptText
	 * @param {string} devPageContext
	 * @returns {object} Request Body for Asset Creation.
	 */
	getReqForDeploymentAsset(scriptText, devPageContext = 'ssjs') {
		let assetName = this._generateDevAssetName(devPageContext);
		this.folderId = this.config.getAssetFolderId();
		// prepare minimal asset:
		return this._buildDevAssetBody(assetName, scriptText, this.folderId);
	}

	/**
	 * Prepare Request Body for (new) Dev Asset/Snippet.
	 * @param {string} filePath
	 * @returns {object} Request Body for Asset Creation.
	 */
	getReqForDevAsset(filePath) {
		let fileText = template.runScriptFile(filePath, this.config, true);
		let assetName = this.getBlockName(filePath);
		this.folderId = this.config.getAssetFolderId();
		// prepare minimal asset:
		return this._buildDevAssetBody(assetName, fileText, this.folderId);
	}

	/**
	 * Get name of metadata file for the given script file.
	 * ./script.ssjs => ./.script.ssjs-ssjs-vsc.json
	 * @param {string} filePath absolute path of the given script file
	 * @returns {string} path of the metadata file. 
	 */
	getMetadataFileName(filePath) {
		return path.join(path.dirname(filePath), `.${this.getBlockName(filePath)}.json`);
	}

	getBlockName(filePath) {
		let fName = path.basename(filePath);
		return `${fName}-ssjs-vsc`;
	}

	/**
	 * Get name of deployment file for the given script file - for manual deployment.
	 * @param {string} devPathContext 
	 * @returns {string} path of the deployment file within VSCode workspace.
	 */
	getDeploymentFileName(devPathContext = 'page') {
		return `./.vscode/deploy.me.${devPathContext}.ssjs`;
	}

	/**
	 * Get name of dev asset file for the given script file - automatic deployment.
	 * @param {string} devPathContext 
	 * @returns {string} path of the deployment file within VSCode workspace.
	 */
	getDevAssetFileName(devPathContext = 'page') {
		return `./.vscode/devAsset.${devPathContext}.ssjs`;
	}

	/**
	 * Generate unique name for the Dev Asset.
	 * @param {string} devPageContext
	 * @returns {string} unique name for the Dev Asset.
	 */
	_generateDevAssetName(devPageContext = 'ssjs') {
		let timestamp = Math.round(new Date().getTime() / 1000);
		let userId = this.config.getSfmcUserId() || 'anonymous';
		return `devAsset.${devPageContext}.${userId}.${timestamp}`;
	}

	/**
	 * Prepare Request Body for (new) Dev Asset/Snippet.
	 * @param {string} assetName
	 * @param {string} scriptText
	 * @param {string} folderId
	 * @param {number} assetTypeId
	 * @returns {object} Request Body for Asset Creation.
	 * @private
	 */
	_buildDevAssetBody(assetName, scriptText, folderId = this.folderId, assetTypeId = 220) {
		let asset = {
			name: assetName,
			category: {
				id: folderId
			},
			content: scriptText,
			assetType: {
				id: assetTypeId
			}
		};
		return asset;
	}
}

module.exports = SnippetHandler;