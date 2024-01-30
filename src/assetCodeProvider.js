const vscode = require('vscode');
var path = require('path');

const BaseCodeProvider = require('./baseCodeProvider');
const Config = require('./config');
const mcClient = require('./sfmc/mcClient');

const { template } = require('./template');
const file = require('./auxi/file');
const json = require('./auxi/json');

const DEPLOYMENT_TOKEN_TEMPLATE = './templates/assetProvider/tokenDeployment.ssjs';
const DEPLOYMENT_BASIC_AUTH_TEMPLATE = './templates/assetProvider/formAuthDeployment.ssjs';

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
			if (!await this.snippets.checkAssetFolder()) {
				return;
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
		// PREPARE:
		let prepResult = await this.prepareAnyScriptDeployment();
		if (!prepResult) {
			return;
		}
		
		// SPECIFIC GET DATA:
		if (prepResult == 'Token-Protected') {
			console.log(`TODO: Deploying Token-Protected script.`);
		} else if (prepResult == 'Basic-Auth') {
			console.log(`TODO: Deploying Basic-Auth script.`);
		}
		const tkn = this.config.getDevPageToken();
		// BUILD ASSET TEMPLATE - build view separately, extract rest to super
		const devAssetView = {
			"tokenEnabled": tkn ? true : false, // TODO: make naming generic
			"token": tkn // TODO: make naming generic
		};
		this.runAnyScriptDeployment(DEPLOYMENT_TOKEN_TEMPLATE, devAssetView);
	}

	async getDevUrl() {
		// TODO: extract the logic to separate function in order to use it in future updates
		// TODO: allow token exclusion
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
				let url = this.config.getDevPageInfo().devPageUrl ? this.config.getDevPageInfo().devPageUrl : '';
				let u = tkn ? `${url}?token=${tkn}&asset-id=${id}` : `${url}?asset-id=${id}`;
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