const vscode = require('vscode');
var path = require('path');

const BaseCodeProvider = require('./baseCodeProvider');
const Config = require('./config');
const mcClient = require('./sfmc/mcClient');

const { template } = require('./template');
const file = require('./auxi/file');
const json = require('./auxi/json');

const DEPLOYMENT_TEMPLATE = './templates/assetDeployment.ssjs';
const DEPLOYED_NAME = 'deployment.ssjs';
const USABLE_EXT = [ `.ssjs`, `.html`, `.amp` ];

module.exports = class AssetCodeProvider extends BaseCodeProvider {

	constructor(config, statusBar) {
		super(config, statusBar)

		this.folderId;
	}

	async init(testConnection = false) {
		super.init(true, testConnection);
	}

	async uploadScript(autoUpload) {
		const activeTextEditor = vscode.window.activeTextEditor;

		if (activeTextEditor) {
			// Get the URI (Uniform Resource Identifier) of the currently open file
			const fileUri = activeTextEditor.document.uri;
			// Convert the URI to a file path
			const filePath = fileUri.fsPath;
			// TODO: file type check:
			if (!USABLE_EXT.includes(path.extname(filePath))) {
				if (!autoUpload) {
					vscode.window.showWarningMessage(`File type ${path.extname(filePath)} is not allowed for deployment!`);
				}
				return;
			}
			// if not existing, run dialog:
			if (!this.config.getAssetFolderId()) {
				console.log(`No Folder ID`);
				const assetProviderTitle = `Asset Provider Folder`;
				const folderName = await vscode.window.showInputBox({
					title: assetProviderTitle,
					prompt: `Enter Folder Name for Dev Assets:`,
					ignoreFocusOut: true
				});

				const parentFolderName = await vscode.window.showInputBox({
					title: assetProviderTitle,
					prompt: `Enter Parent Folder Name for Dev Assets:`,
					ignoreFocusOut: true
				});

				let f = await this.createFolder(folderName, parentFolderName);

				if (!f) {
					return;
				} else {
					vscode.window.showInformationMessage(`Folder for Dev Assets created!`);
					this.config.setAssetFolderId(f.body.id, `${parentFolderName} > ${folderName}`);
				}
			} else {
				console.log(`Found Folder ID`);
			}

			if (this.assetExists(filePath)) {
				await this.updateCode(filePath);
			} else if (!autoUpload) {
				await this.createNewBlock(filePath);
			} else {
				vscode.window.showInformationMessage(`Run 'SSJS: Upload Script' command to deploy any script for the first time.`);
			}
		} else {
			console.log('No file is currently open.');
			// vscode.window.showErrorMessage('No file is currently open.');
		}
	}

	async deployAnyScript() {
		const packageData = this.config.getPackageJsonData();
		const tkn = this.config.getDevPageToken();
		const templatePath = path.join(this.config.sourcePath, DEPLOYMENT_TEMPLATE);

		const deployScript = template.runFile(templatePath, {
			"page": packageData['repository'],
			"version": `v${packageData['version']}`,
			"tokenEnabled": tkn ? true : false,
			"token": tkn
		});

		// save into active editor (root) and open:
		let deployPath = path.join(Config.getUserWorkspacePath(), DEPLOYED_NAME);
		file.save(deployPath, deployScript);
		vscode.workspace.openTextDocument(deployPath).then((doc) =>
			vscode.window.showTextDocument(doc, {
			})
		);
	}

	async getDevUrl() {
		const activeTextEditor = vscode.window.activeTextEditor;

		if (activeTextEditor) {
			// Get the URI (Uniform Resource Identifier) of the currently open file
			const fileUri = activeTextEditor.document.uri;
			// Convert the URI to a file path
			const filePath = fileUri.fsPath;
			// TODO: file type check:
			if (USABLE_EXT.includes(path.extname(filePath))) {
				let meta = json.load(this.getBlockMetaFile(filePath));
				let id = meta.id;
				let tkn = this.config.getDevPageToken();
				let u = tkn ? `?token=${tkn}&asset-id=${id}` : `?asset-id=${id}`;
				vscode.env.clipboard.writeText(u);
			} else {
				vscode.window.showWarningMessage(`File *${path.extname(filePath)} is not allowed for deployment!`);
			}
		} else {
			vscode.window.showErrorMessage('No file is currently open.');
		}
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
					// console.log('DATA', data);
					this.saveAssetFile(filePath, data);
					vscode.window.showInformationMessage(`Asset created.`);
				})
				.catch((err) => {
					console.error('Create Asset ERR:', err);
					asset.content = '<<script>>';
					console.debug('Asset data:', asset);
					// TODO: show error message:
					let m = this.mc.parseRestError(err);
					vscode.window.showErrorMessage(`Error on creating Asset! \n${m}`);
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
		let fileText = template.runScriptFile(filePath, this.config, true);

		let asset = {
			content: fileText
		};

		await this.mc._patch(`/asset/v1/assets/${meta.id}`, asset)
				.then((data) => {
					this.saveAssetFile(filePath, data);
					vscode.window.showInformationMessage(`Asset uploaded.`);
				})
				.catch((err) => {
					// console.error('Patch Asset ERR:', err);
					asset.content = '<<script>>';
					console.debug('Asset data:', asset);
					// TODO: show error message:
					let m = this.mc.parseRestError(err);
					vscode.window.showErrorMessage(`Error on updating Dev Asset. \n${m}`);
				});
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

	getAssetReqData(filePath) {
		// get templated file:
		let fileText = template.runScriptFile(filePath, this.config, true);
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

	saveAssetFile(filePath, reqData) {
		let dt = {};
		dt.id = reqData.body.id;
		dt.name = reqData.body.name;
		dt.assetType = reqData.body.assetType;
		dt.category = reqData.body.category;
		dt.enterpriseId = reqData.body.enterpriseId;
		dt.id = reqData.body.id;

		const p = this.getBlockMetaFile(filePath);
		json.save(p, dt);
	}

	assetExists(filePath) {
		const p = this.getBlockMetaFile(filePath);
		console.log(`assetExists:`, p, '. exists?', file.exists(p));
		return file.exists(p);
	}

	getBlockMetaFile(filePath) {
		return path.join(path.dirname(filePath), `.${this.getBlockName(filePath)}.json`);
	}

	getBlockName(filePath) {
		let fName = path.basename(filePath);
		return `${fName}-ssjs-vsc`;
	}
}