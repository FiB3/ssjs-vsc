const vscode = require('vscode');
const Metafile = require('./code/metafile');

const dialogs = require('./ui/dialogs');
const { template } = require('./template');

const vsc = require('./vsc');
const telemetry = require('./telemetry');
const logger = require('./auxi/logger');
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
	 * @returns {number|boolean} - asset ID if created, false if failed. `-2` if duplicate.
	 */
	async createSfmcSnippet(asset, devPageContext = false, filePath) {
		let assetId = 0;
		await this.mc.createAsset(asset)
				.then((data) => {
					assetId = data.body.id;
					Metafile.upsert(filePath, data);
					if (!devPageContext) {
						vscode.window.showInformationMessage(`Asset created.`);
						vsc.flashEditorTab('ok');
					} else {
						vscode.window.showInformationMessage(`Deployment Asset for ${dialogs.getFriendlyDevContext(devPageContext)} Installed.`);
					}
				})
				.catch((err) => {
					logger.error('Create Dev Asset ERR:', err);
					asset.content = '<<script>>';
					logger.debug('Dev Asset data:', asset);
					assetId = false;
					// TODO: show error message:
					if (this.mc.isDuplicateAssetError(err)) {
						this.confirmUpsertResult('warn', `Code Snippet already exists - either remove it in Marketing Cloud or change name of the script.`);
						assetId = -2;
					} else if (!devPageContext) {
						let m = this.mc.parseRestError(err);
						this.confirmUpsertResult('error', `Error on Creating Dev Asset! \n${m}`);
					} else {
						let m = this.mc.parseRestError(err);
						this.confirmUpsertResult('error', `Error on Installing Dev Asset for ${dialogs.getFriendlyDevContext(devPageContext)}! \n${m}`);
					}
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
		await this.mc.updateAsset(devAssetId, asset)
				.then((data) => {
					assetId = data.body.id;
					Metafile.upsert(filePath, data);
					if (!devPageContext) {
						this.confirmUpsertResult('ok', `Asset Updated.`);
					} else {
						this.confirmUpsertResult('ok', `Dev Asset for ${dialogs.getFriendlyDevContext(devPageContext)} Updated.`);
					}
				})
				.catch(async (err) => {
					assetId = false;
					asset.content = '<<script>>';
					logger.debug('Dev Asset data:', asset);
					
					let m = this.mc.parseRestError(err);
					if (this.mc.isNotFoundError(err)) {
						this.confirmUpsertResult('warn', `Asset not found in Marketing Cloud!`);
						let shouldRemove = await dialogs.confirmAssetMetadataRemoval(`Asset not found in Marketing Cloud - remove local metadata?`);
						if (shouldRemove) {
							let metaFile = Metafile.getFileName(filePath);
							Metafile.delete(metaFile);
							vscode.window.showInformationMessage(`Local metadata file removed (filename: ${metaFile}).`);
						}
					} else if (!devPageContext) {
						this.confirmUpsertResult('error', `Error on Updating Dev Asset! \n${m}`);
					} else {
						this.confirmUpsertResult('error', `Error on Updating Dev Asset for ${dialogs.getFriendlyDevContext(devPageContext)}! \n${m}`);
					}
				});
		return assetId;
	}

	confirmUpsertResult(status, message) {
		if (status === 'ok') {
			vscode.window.showInformationMessage(message);
		} else if (status === 'warn') {
			vscode.window.showWarningMessage(message);
		} else if (status === 'error') {
			vscode.window.showErrorMessage(message);
		}
		// if flash enabled, flash the editor tab:
		if (Config.isEditorFlashEnabled()) {
			vsc.flashEditorTab(status);
		}
	}

	saveDevContext(filePath, devContext) {
		try {
			Metafile.upsert(filePath, { devContext });
		} catch (err) {
			vscode.window.showErrorMessage(`Error on saving data, please let us know more details on the issue on: https://github.com/FiB3/ssjs-vsc/issues`);
			telemetry.error('saveDevContext', { error: err.message, codeProvider: 'Asset', update: true, devContext });
			throw new Error(`Error on saving Dev Context:` + err.message);
		}
	}

	getDevContext(filePath) {
		let meta = Metafile.load(filePath);
		logger.log(`getDevContext: meta.devContext: ${meta.devContext}.`, meta);
		return meta.devContext || false;
	}

	async checkAssetFolder() {
		if (!this.config.getAssetFolderId()) {
			logger.log(`No Folder ID`);
			return await this.createAssetFolder();
		} else {
			logger.log(`Found Folder ID`);
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
			logger.log(`Could not create Content Builder Folder!`, f);
			return {
				ok: false,
				message: 'Could not create Content Builder Folder!'
			};
		} else {
			let fldrPath = `${parentFolderName} > ${folderName}`;
			this.config.setAssetFolderId(f.body.id, fldrPath);
			return {
				ok: true,
				message: f.body.existing
						? `Using existing folder at ${fldrPath}.`
						: `Folder for Dev Assets created at ${fldrPath}.`
			};
		}
	}

	/**
	 * Create new Dev Folder for Content Blocks.
	 * Store the data in the Config.
	 * @param {string} folderName 
	 */
	async createFolder(folderName, parentFolderName) {
		let newFolder = await this.getFolder(folderName);
		if (newFolder) {
			vscode.window.showInformationMessage(`Using existsting folder.`);
			newFolder.existing = true;
			return {
				body: newFolder
			};
		}

		let parent = await this.getFolder(parentFolderName, false);
		if (!parent) {
			vscode.window.showWarningMessage(`Parent Folder not found!`);
			return false;
		}

		let r;
		try {
			// returns body
			r = await this.mc.createAssetFolder(folderName, parent.id);
		} catch (err) {
			logger.log(`Error on creating Asset folder:`, err);
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
		let fileText = template.runScriptFile(filePath, this.config, 'dev');
		let assetName = Metafile.getBlockName(filePath);
		this.folderId = this.config.getAssetFolderId();
		// prepare minimal asset:
		return this._buildDevAssetBody(assetName, fileText, this.folderId);
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