const vscode = require('vscode');
var path = require('path');

const BaseCodeProvider = require('./baseCodeProvider');
// const Config = require('./config');
const checks = require('./checks');
const vsc = require('./vsc');

const { template } = require('./template');
const file = require('./auxi/file');
const json = require('./auxi/json');

const DEPLOYMENT_TOKEN_TEMPLATE = './templates/assetProvider/tokenDeployment.ssjs';
const DEPLOYMENT_BASIC_AUTH_TEMPLATE = './templates/assetProvider/formAuthDeployment.ssjs';

module.exports = class AssetCodeProvider extends BaseCodeProvider {

	constructor(config, statusBar) {
		super(config, statusBar);
		this.folderId;
	}

	async init(testConnection = false) {
		super.init(true, testConnection);
	}

	async uploadScript(autoUpload) {
		const filePath = vsc.getActiveEditor();

		if (filePath) {
			// file type check:
			if (!checks.isFileSupported(filePath, !autoUpload)) {
				return;
			}
			// if not existing, run dialog:
			if (!await this.snippets.checkAssetFolder()) {
				return;
			}

			if (this.snippets.snippetExists(filePath)) {
				await this.updateCode(filePath);
			} else if (!autoUpload) {
				await this.createNewBlock(filePath);
			} else {
				vscode.window.showInformationMessage(`Run 'SSJS: Upload Script' command to deploy any script for the first time.`);
			}
		}
	}

	async deployAnyScript() {
		// PREPARE:
		let prepResult = await this.prepareAnyScriptDeployment();
		if (!prepResult) {
			return;
		}

		let deployments = this._getContextInfoForDeployment(prepResult, DEPLOYMENT_TOKEN_TEMPLATE, DEPLOYMENT_BASIC_AUTH_TEMPLATE);
		await this.runAnyScriptDeployments(deployments);
	}

	async updateAnyScript(silenced = false) {
		let contexts = [];
		this.config.isDevPageSet() ? contexts.push('page') : null;
		this.config.isDevResourceSet() ? contexts.push('text') : null;

		let deployments = this._getContextInfoForDeployment(contexts, DEPLOYMENT_TOKEN_TEMPLATE, DEPLOYMENT_BASIC_AUTH_TEMPLATE);
		await this.runAnyScriptDeployments(deployments);
	}

	async getDevUrl() {
		const pageDetails = await this._getContextForGetUrl();

		if (pageDetails) {
			const url = this._getDevUrl(pageDetails.devPageContext, pageDetails.metadata);
			vscode.env.clipboard.writeText(url);
		}
	}

	/**
	 * Create New Dev Asset Block based on File.
	 * @param {string} filePath path of the ssjs file.
	 */
	async createNewBlock(filePath) {
		let asset = this.snippets.getReqForDevAsset(filePath);
		return await this.snippets.createSfmcSnippet(asset, false, filePath);
	}

	/**
	 * Update Dev Asset Block  based on File.
	 * @param {string} filePath path of the ssjs file.
	 */
	async updateCode(filePath) {
		// get metadata:
		let metaPath = this.snippets.getMetadataFileName(filePath);
		let meta = json.load(metaPath);
		// get templated file:
		let scriptText = template.runScriptFile(filePath, this.config, true);
		return await this.snippets.updateSfmcSnippet(meta.id, scriptText, false, filePath);
	}

	_getDevUrl(devPageContext, metadata) {
		let tokenConfig = this.config.getDevPageAuth(devPageContext);
		let id = metadata.id;
		let tkn;

		if (tokenConfig.useAuth && tokenConfig.authType == 'basic') {
			// TODO: this is not perfect, but good enough for now:
			vscode.window.showInformationMessage(`URL in clipboard. Authentication details - user: ${tokenConfig.username}, password: ${tokenConfig.password}`);
		} else if (tokenConfig.useAuth && tokenConfig.authType == 'token') {
			vscode.window.showInformationMessage(`URL in clipboard.`);
			tkn = tokenConfig.token;
		}

		let url = this.config.getDevPageInfo(devPageContext).devPageUrl || '';
		let u = tkn ? `${url}?token=${tkn}&asset-id=${id}` : `${url}?asset-id=${id}`;
		vscode.env.clipboard.writeText(u);
	}
}