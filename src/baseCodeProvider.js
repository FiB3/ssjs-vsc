const vscode = require('vscode');
var path = require('path');

const Config = require('./config');
const mcClient = require('./sfmc/mcClient');
const SnippetHandler = require('./snippetHandler');
const { template } = require('./template');
const json = require('./auxi/json');

const vsc = require('./vsc.js');
const dialogs = require('./dialogs');
const checks = require('./checks');
const DEPLOYMENT_TEMPLATE = './templates/deployment.ssjs';

module.exports = class BaseCodeProvider {

	constructor(config, statusBar) {
		this.config = config;
		this.statusBar = statusBar;
		this.mc = null;
		this.snippets = new SnippetHandler(this.config);
	}

	async init(initMcClient = false, testConnection = false) {
		this.statusBar.setEnabled();
		if (initMcClient) {
			let c = await this.config.getSfmcInstanceData();
			if (!c) {
				vscode.window.showWarningMessage(`We could not obtain your API Client Secret. If you have set your credentials already, try updating VSCode and the extension. You can also try disable and enable the extension.`);
			}
			this.mc = new mcClient(c.subdomain, c.clientId, c.clientSecret, c.mid);
			this.snippets.attachMc(this.mc);
			// TODO: validate token:
			if (testConnection === true) {
				this.mc.validateApiKeys()
						.then((data) => {
							console.log(`API Keys OK.`);
							if (!this.config.getSfmcUserId()) {
								this.config.setSfmcUserId(data.body?.user?.id);
							}
						})
						.catch((err) => {
							console.error('TEST SFMC-Connection ERR:', err);
							let m = this.mc.parseRestError(err);
							vscode.window.showErrorMessage(`SFMC API Credentials issue: \n${m}`);
						});
			}
		}
	}

	async deactivate() {
	}

	async deployAnyScript() {
		this._checkCommand();
	}

	async uploadToProduction() {
		// base provider will only be able to build to clipboard
		// other providers will need to have more checks.
		let scriptText = this.buildScriptText(false);
		if (scriptText) {
			vscode.env.clipboard.writeText(scriptText);
		} else {
			// script was not uploaded:
			vscode.window.showWarningMessage(`Script cannot be built for Production! Maybe it's the file format?`);
		}
	}

	async uploadScript(autoUpload) {
		if (!autoUpload) {
			this._checkCommand();
		}
	}

	async startServer() {
		this._checkCommand();
	}

	async stopServer() {
		this._checkCommand();
	}

	async getDevUrl() {
		this._checkCommand();
	}

	/**
	 * Handles preparation of Any Scripts to SFMC, like creating Asset Folder, storing Cloud Page URL etc.
	 */
	async prepareAnyScriptDeployment() {
		// TODO: Check if ssjs-setup.json exists:

		// TODO: Check setup version:
		
		// Confirm that everything is set by user:
		if (!this.config.isSetupValid()) {
			const confirmed = await dialogs.confirmPreInstallSetup();
			if (!confirmed) {
				return false;
			}
		}

		// Check Asset Folder existence:
		if (!await this.snippets.checkAssetFolder()) {
			return false;
		}

		// Ask for Dev Page Type:
		const devPageContexts = await dialogs.getDevPageOptions();
		if (!devPageContexts) { 
			return false;
		}

		for (let pageContext of devPageContexts) {
			console.log(`Dev Page Context:`, pageContext);
			// Ask for Cloud Page URL from user and store to ssjs-setup.json:
			let cloudPageUrl = await dialogs.getDevPageUrl(pageContext);
			if (!cloudPageUrl) {
				// TODO: maybe allow empty input when already set to keep old value
				return false;
			}

			// Ask for selection of the deployment asset to use:
			let authOption = await dialogs.getAuthOptions();
			if (!authOption) {
				return false;
			}
			// save combination of options:
			this.config.setDevPageInfo(pageContext, authOption, cloudPageUrl);
			// TODO: add options to set own basic auth creds & skip when already filled:
			this.config.generateDevTokens(pageContext);
		}
		return devPageContexts;
	}

	/**
	 * Runs deployments for all Any Scripts based on parameters.
	 * @param {Array<>} pagesData
	 */
	async runAnyScriptDeployments(pagesData, silenced = false) {
		const packageData = this.config.getPackageJsonData();

		for (let pageData of pagesData) {
			let devPageContext = pageData.devPageContext;
			let assetFile = pageData.assetFile;
			let cloudPageFile = pageData.cloudPageFile;

			let view = pageData.viewSpecifics ? pageData.viewSpecifics : {};
			view = {
				"page": packageData['homepage'],
				"version": `v${packageData['version']}`,
				"devPageContext": devPageContext,
				"pageContextReadable": dialogs.getFriendlyDevContext(devPageContext),
				...this.config.getDevPageAuth(devPageContext),
				...view
			}
			console.log(`View:`, view);
			console.log(`Tokens:`, this.config.getDevPageAuth(devPageContext));

			await this.runAnyScriptDeployment(devPageContext, assetFile, view, cloudPageFile);
			console.log(`${devPageContext} asset deployed`);
		}
	}

	/**
	 * Handles actual deployment of Any Scripts to SFMC, except building data (view) for the template. 
	 */
	async runAnyScriptDeployment(devPageContext, assetFile, view = {}, cloudPageFile = DEPLOYMENT_TEMPLATE, silenced = false) {
		// PREPARE ASSET FILE:
		const snippetTemplatePath = path.join(this.config.sourcePath, assetFile);
		// BUILD ASSET TEMPLATE - build view separately, extract rest to super
		const snippetScript = template.runFile(snippetTemplatePath, view);
		
		// deploy asset to SFMC:
		let runCloudPage = false;
		let devAssetId = this.config.getDevPageInfo(devPageContext)?.devSnippetId;
		let assetId;
		if (devAssetId) {
			// update existing asset:
			console.log(`UPDATE DEV asset: ${devAssetId}`);
			assetId = await this.updateSnippetBlock(devAssetId, snippetScript, devPageContext);
			// TODO: ask if to re-deploy the Cloud Page (NO as default)
			runCloudPage = await dialogs.yesNoConfirm(`Update deployment files?`, `Do you want to generate new deployment files for ${view['pageContextReadable']}?`);
		} else {
			// create new asset:
			console.log(`CREATE DEV asset`);
			assetId = await this.createSnippetBlock(snippetScript, devPageContext);
			console.log(`Asset ID:`, assetId);
			if (assetId) {
				this.config.setDevPageInfo(devPageContext, undefined, undefined, assetId);
				runCloudPage = true;
			} else {
				vscode.window.showWarningMessage(`Installation for: "${dialogs.getFriendlyDevContext(devPageContext)}" could not have been finished!`);
			}
		}

		if (runCloudPage) {
			console.log(`Create Cloud Page for: ${devPageContext}`);
			// BUILD ASSET TEMPLATE
			const cpTemplatePath = path.join(this.config.sourcePath, cloudPageFile);
			const deploymentScript = template.runFile(cpTemplatePath, {
				"page": view['homepage'],
				"version": view['version'],
				"userID": this.config.getSfmcUserId() || 'anonymous',
				"devBlockID": assetId,
				"devPageContext": devPageContext,
				"pageContextReadable": view['pageContextReadable']
			});
			// CREATE FILE:
			this.snippets.saveScriptText(this.snippets.getDeploymentFileName(devPageContext), deploymentScript, true);
			vscode.window.showInformationMessage(`Installation for: "${dialogs.getFriendlyDevContext(devPageContext)}" almost complete - please follow steps from this file to finish.`);
		}
	}

	buildScriptText(isDev) {
		const activeTextEditor = vscode.window.activeTextEditor;

		if (activeTextEditor) {
			// Get the URI (Uniform Resource Identifier) of the currently open file
			const fileUri = activeTextEditor.document.uri;
			// Convert the URI to a file path
			const filePath = fileUri.fsPath;
			
			if (!checks.isFileSupported(filePath)) {
				return false;
			}
			let fileText = template.runScriptFile(filePath, this.config, isDev);
			return fileText;

		} else {
			console.log('No file is currently open.');
			// vscode.window.showErrorMessage('No file is currently open.');
			return false;
		}
	}

	/**
	 * Create New Dev Asset Block based on File.
	 * @param {string} scriptText
	 * @param {string} devPageContext
	 * @returns {number|false} assetId
	 */
	async createSnippetBlock(scriptText, devPageContext) {
		let asset = this.snippets.getReqForDeploymentAsset(scriptText, devPageContext);
		let snippetPath = this.snippets.saveScriptText(this.snippets.getDevAssetFileName(devPageContext), scriptText);
		return await this.snippets.createSfmcSnippet(asset, devPageContext, snippetPath);
	}
	
	/**
	 * Update Dev Asset Block  based on File.
	 * @param {number} devAssetId ID of an existing dev-code-snippet asset
	 * @param {string} scriptText
	 * @returns {number|false} assetId
	 */
	async updateSnippetBlock(devAssetId, scriptText, devPageContext) {
		let snippetPath = this.snippets.saveScriptText(this.snippets.getDevAssetFileName(devPageContext), scriptText);
		return await this.snippets.updateSfmcSnippet(devAssetId, scriptText, devPageContext, snippetPath);
	}

	/**
	 * Validates if the current file is supported for deployment and returns the Dev Page Contexts.
	 * @returns {Object|false} Object with filePath, asset metadata and devPageContext. False if something is wrong.
	 */
	async _getContextForGetUrl() {
		// TODO: pick asset also based on asset file
		const filePath = vsc.getActiveEditor();
		if (filePath && checks.isFileSupported(filePath)) {
			let metadata = json.load(this.snippets.getMetadataFileName(filePath));

			let devPageContext;
			if (this.config.isDevPageSet() && this.config.isDevResourceSet()) {
				devPageContext = await dialogs.pickDevPageContext();
			} else if (this.config.isDevPageSet()) {
				devPageContext = 'page';
			} else if (this.config.isDevResourceSet()) {
				devPageContext = 'text';
			} else {
				vscode.window.showErrorMessage('No Dev Page or Resource is set.');
				return false;
			}
			return {
				filePath,
				metadata,
				devPageContext
			};
		}
		return false;
	}

	/**
	 * Build data for AnyScript deployment (for this.runAnyScriptDeployments())
	 * @param {Array} contexts 
	 * @param {String} tokenTemplatePath 
	 * @param {String} basicAuthTemplatePath 
	 * @param {String} webAppTemplatePath for future use
	 * @returns {Array<Object>}
	 */
	_getContextInfoForDeployment(contexts = ['page', 'text'], tokenTemplatePath, basicAuthTemplatePath, webAppTemplatePath) {
		console.log(`Deploy any script prep:`, contexts, '.');
		let deployments = [];
		for (let devPageContext of contexts) {
			let authType = this.config.getDevPageAuthType(devPageContext);
			let assetFile = '';
			if (authType == 'basic') {
				assetFile = basicAuthTemplatePath;
			} else {
				assetFile = tokenTemplatePath;
			}
			deployments.push({
				devPageContext,
				assetFile
			});
		}
		return deployments;
	}

	_checkCommand() {
		if (Config.isNoneProvider()) {
			vscode.window.showWarningMessage(`Code Providers switched off!`);
		} else {
			vscode.window.showWarningMessage(`Command not supported with ${Config.getCodeProvider()} Provider.`);
		}
	}
}