const vscode = require('vscode');
const Metafile = require('./code/metafile');
const SourceCode = require('./code/sourceCode');
const CodeFolders = require('./code/codeFolders');
const Pathy = require('./auxi/pathy');
const file = require('./auxi/file');
const folder = require('./auxi/folder');

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
						this.confirmActionResult('ok', `Asset created.`);
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
						vscode.window.showWarningMessage(`Code Snippet already exists - either remove it in Marketing Cloud or change name of the script.`);
						assetId = -2;
					} else if (!devPageContext) {
						let m = this.mc.parseRestError(err);
						vscode.window.showErrorMessage(`Error on Creating Dev Asset! \n${m}`);
					} else {
						let m = this.mc.parseRestError(err);
						vscode.window.showErrorMessage(`Error on Installing Dev Asset for ${dialogs.getFriendlyDevContext(devPageContext)}! \n${m}`);
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
						this.confirmActionResult('ok', `Asset Updated.`);
					} else {
						vscode.window.showInformationMessage(`Dev Asset for ${dialogs.getFriendlyDevContext(devPageContext)} Updated.`);
					}
				})
				.catch(async (err) => {
					assetId = false;
					asset.content = '<<script>>';
					logger.debug('Dev Asset data:', asset);
					
					let m = this.mc.parseRestError(err);
					if (this.mc.isNotFoundError(err)) {
						this.confirmActionResult('warn', `Asset not found in Marketing Cloud!`);
						let shouldRemove = await dialogs.confirmAssetMetadataRemoval(`Asset not found in Marketing Cloud - remove local metadata?`);
						if (shouldRemove) {
							Metafile.delete(filePath);
							vscode.window.showInformationMessage(`Local metadata file removed (for file: ${filePath}).`);
						}
					} else if (!devPageContext) {
						this.confirmActionResult('error', `Error on Updating Dev Asset! \n${m}`);
					} else {
						vscode.window.showErrorMessage(`Error on Updating Dev Asset for ${dialogs.getFriendlyDevContext(devPageContext)}! \n${m}`);
					}
				});
		return assetId;
	}

	async fetchSfmcSnippet(filePath) {
		let metadata = Metafile.loadWithValidation(filePath);
		if (!metadata) {
			return;
		}

		const assetId = metadata.id;
		const assetName = metadata.name || 'Unknown Asset';

		// Show progress
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: `Fetching asset "${assetName}" from SFMC...`,
			cancellable: false
		}, async (progress) => {
			try {
				// Fetch asset from SFMC
				const response = await this.mc.getAsset(assetId);
				
				if (response.statusCode !== 200) {
					const errorMessage = this.mc.parseRestError(response);
					logger.error('Error fetching asset:', errorMessage);
					vscode.window.showErrorMessage(`Error fetching asset from SFMC: ${errorMessage}`);
					return;
				}

				const assetData = response.body;
				if (!assetData || !assetData.content) {
					logger.error('Asset data missing content');
					vscode.window.showErrorMessage('Asset data missing content field.');
					return;
				}

				const newContent = assetData.content;
				const currentContent = SourceCode.load(filePath);

				Metafile.upsert(filePath, assetData);

				// Compare content
				let comparisonResult = await SourceCode.runCodeComparison(newContent, filePath, assetName);
				telemetry.log('fetchAsset', { codeProvider: 'Asset', ...comparisonResult });
			} catch (err) {
				logger.error('Error fetching asset:', err);
				const errorMessage = this.mc.parseRestError(err);
				vscode.window.showErrorMessage(`Error fetching asset from SFMC: ${errorMessage}`);
				telemetry.error('fetchAsset', { error: err.message, codeProvider: 'Asset' });
			}
		});
	}

	async deleteSfmcSnippet(filePath) {
		let metadata = Metafile.loadWithValidation(filePath);
		if (!metadata) {
			return;
		}

		const assetId = metadata.id;
		const assetName = metadata.name || 'Unknown Asset';

		// Confirm deletion with user
		const confirmed = await dialogs.yesNoConfirm(
			'Delete Asset from SFMC',
			`Are you sure you want to delete "${assetName}" (ID: ${assetId}) from SFMC?`,
			'This action cannot be undone.'
		);

		if (!confirmed) {
			vscode.window.showWarningMessage(`Deletion cancelled.`);
			return;
		}

		// Delete the asset
		try {
			await this.mc.deleteAsset(assetId);
			// Delete local metadata file
			Metafile.delete(filePath);
			vscode.window.showInformationMessage(`Asset "${assetName}" deleted successfully from SFMC.`);
			telemetry.log('deleteAsset', { codeProvider: 'Asset' });
		} catch (err) {
			logger.error('Error deleting asset:', err);
			let errorMessage = this.mc.parseRestError(err);			
			vscode.window.showErrorMessage(`Error deleting asset from SFMC: ${errorMessage}`);
		}
	}

	async fetchAllSfmcSnippets() {
		const codeFolders = new CodeFolders('asset', this.mc);

		// snapshot the current folder structure and files:
		const initialSnapshot = codeFolders.snapshot();
		logger.log('initialSnapshot:', initialSnapshot);

		// fetch folders:
		const currentFolders = await codeFolders.upsertFolders();
		logger.log('folders:', currentFolders);

		// fetch assets:
		const assets = await this.mc.getAssets(); // { '$filter': 'assetType.id eq 220' }
		logger.log('assets:', assets);
		const currentFiles = [];

		assets.forEach(asset => {
			// TODO: currently supports only assets with .content (not other nested types of content)
			let content = '';
			let suffix = '';
			let setMetadata = false;

			if (asset.content) {
				setMetadata = true;
				content = asset.content;
				suffix = this.estimateSuffix(content);
			} else {
				suffix = '.md';
				content = '# Content Builder assets with content outside of .content are not yet supported:\n```json\n' + JSON.stringify(asset, null, 2) + '\n```';
			}
			let folderId = asset.category.id;

			let folderPath = codeFolders.findFolderPath(folderId);
			if (!folderPath) {
				logger.warn(`Folder not found for asset: ${asset.name} - asset not in Content Builder`);
				return;
			}
			if ([205].includes(asset.assetType.id)) {
				logger.warn(`Asset: ${asset.name} (${asset.assetType.id} / ${asset.assetType.name}) is not valid here`);
				return;
			}
			let filePath = `${folderPath}/${asset.name}${suffix}`;
			currentFiles.push(Pathy.joinToRoot(filePath));
			logger.log(`Asset: ${asset.name} => ${filePath}`);

			SourceCode.save(filePath, content, false);
			if (setMetadata) {
				Metafile.upsert(filePath, asset);
			}
		});

		// compare the initial snapshot with the current snapshot:
		let newSnapshot = {
			folders: currentFolders,
			files: currentFiles
		};
		logger.log('newSnapshot:', newSnapshot);

		// compare the folders:
		let changes = codeFolders.compareSnapshots(initialSnapshot, newSnapshot);
		logger.log('snapshot changes:', changes);

		changes.deletedFiles.forEach(filePath => {
			this._deleteFetchedFile(filePath);
		});

		changes.deletedFolders.forEach(folderPath => {
			folder.remove(folderPath);
		});

		return {
			assets: assets
		}
	}

	confirmActionResult(status, message) {
		if (status === 'ok') {
			vscode.window.showInformationMessage(message);
		} else if (status === 'warn') {
			vscode.window.showWarningMessage(message);
		} else if (status === 'error') {
			vscode.window.showErrorMessage(message);
		}
		// TODO: only flash, for current file name (if it's current file)
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
	 * Estimate the suffix for the asset name based on the content.
	 * Estimation is based on the number of opening tags for AMPscript or SSJS.
	 * @param {string} content 
	 * @returns {string} suffix - `.amp`, `.ssjs`, `.html`, or `.js`
	 */
	estimateSuffix(content) {
		// to exclude matches that are inside quotes (and JS comments)
		function countCodeMatches(content, pattern) {
			let count = 0;
			let match;
			while ((match = pattern.exec(content)) !== null) {
				let matchIndex = match.index;
				if (matchIndex > 0 && content[matchIndex - 1] !== "'" && content[matchIndex - 1] !== '"') {
					count++;
				}
			}
			return count;
		}
		let ampCount = countCodeMatches(content, /%%\[/g);
		let amp2Count = countCodeMatches(content, /%%=/g);
		ampCount += amp2Count;
		let ssjsCount = (content.match(/<script\s.*?runat=["']*server["']*/g) || []).length;

		if (ampCount > 0 && ssjsCount < ampCount) {
			return '.amp';
		} else if (ssjsCount > 0) {
			return '.ssjs';
		}

		// is this HTML or JS?
		let htmlCount = (content.match(/(<div|<table|<ul|<ol|<li|<p|<span|<h1|<h2|<h3|<h4|<h5|<h6|<img|<a|<button|<input|<textarea|<form|<\/html>|<\/body>|<\/head>|<\/div>|<\/p>|<\/span>)/g) || []).length;
		let jsCount = (content.match(/\s+(function\s*\(|var\s+\w+|let|const|\$\(|for|catch|try|return)/g) || []).length;
		logger.log(content.substring(0, 30) + `... => jsCount: ${jsCount}, ssjsCount: ${ssjsCount}, htmlCount: ${htmlCount}`);
		if (jsCount > 0 && (ssjsCount === 0)) {
			return '.js';
		} else if (htmlCount > 0) {
			return '.html';
		}

		return '.ssjs'; // best overall extension support
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
	 * @param {string} customerKey
	 * @returns {object} Request Body for Asset Creation.
	 * @private
	 */
	_buildDevAssetBody(assetName, scriptText, folderId = this.folderId, assetTypeId = 220, customerKey = null) {
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
		
		// Add customerKey if provided
		if (customerKey) {
			asset.customerKey = customerKey;
		}
		
		return asset;
	}

	/**
	 * Deletes the fetched file from the local file system.
	 * @param {string} filePath - path to the file to delete.
	 */
	_deleteFetchedFile(filePath) {
		file.delete(filePath);
		Metafile.delete(filePath);
	}
}

module.exports = SnippetHandler;