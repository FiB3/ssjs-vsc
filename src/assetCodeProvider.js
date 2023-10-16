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

	constructor(config) {
		super(config);

		this.folderId;
		this.mc = null;
	}

	async init() {
		let c = await this.config.getSfmcInstanceData();
		this.mc = new mcClient(c.subdomain, c.clientId, c.clientSecret, c.mid);
	}

	async uploadScript() {
		const activeTextEditor = vscode.window.activeTextEditor;

		if (activeTextEditor) {
			// Get the URI (Uniform Resource Identifier) of the currently open file
			const fileUri = activeTextEditor.document.uri;
			// Convert the URI to a file path
			const filePath = fileUri.fsPath;
			// TODO: file type check:
			if (USABLE_EXT.includes(path.extname(filePath))) {
				vscode.window.showWarningMessage(`Extension ${path.extname(filePath)} is not allowed for deployment!`);
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
					vscode.window.showWarningMessage(`Error when creating Folder for Dev Assets!`);
				} else {
					vscode.window.showInformationMessage(`Folder for Dev Assets created!`);
					console.log(f);
					this.config.setAssetFolderId(f.body.id);
				}
			} else {
				console.log(`Found Folder ID`);
			}

			if (this.assetExists(filePath)) {
				let r = await this.updateCode(filePath);
				console.log(r);
				vscode.window.showInformationMessage(`Asset uploaded.`);
			} else {
				let r = await this.createNewBlock(filePath);
				console.log(r);
				vscode.window.showInformationMessage(`Asset created.`);
			}
		} else {
			vscode.window.showErrorMessage('No file is currently open.');
		}
	}

	async deployAnyScript() {
		// check setup file (existence, public-domain and it's setup, dev-token):
		let configData = [];
		try {
			configData = this.config.loadConfig();
		} catch (err) {
			vscode.window.showErrorMessage(`Setup file not found or incorrect. Please, check it and create it using "SSJS: Create Config".`);
		}
		// if (configData['public-domain'] || configData['proxy-any-file']?.['main-path']) {
		// 	vscode.window.showWarningMessage(`Some project setup is not filled - check your .vscode/ssjs-setup.json file.`);
		// }

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
		let deployPath = path.join(this.config.getUserWorkspacePath(), DEPLOYED_NAME);
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
		let fileText = template.runScriptFile(filePath, this.config, true);

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

	// async initMcClient() {
	// 	let c = await this.config.getSfmcInstanceData();
	// 	console.log('Config:', c);
	// 	this.mc = new mcClient(c.subdomain, c.clientId, c.clientSecret, c.mid);
	// }
}