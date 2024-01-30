const vscode = require('vscode');
var path = require('path');

const Config = require('./config');
const mcClient = require('./sfmc/mcClient');
const SnippetHandler = require('./sfmc/snippetHandler');
const { template } = require('./template');
const checks = require('./checks');

const DEPLOYMENT_TEMPLATE = './templates/deployment.ssjs';
const DEPLOYMENT_PATH = './.vscode/deployment.ssjs';
const SNIPPET_PATH = './.vscode/deploymentSnippet.ssjs';

const USABLE_EXT = [ `.ssjs`, `.html`, `.amp` ];

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

		// get Cloud Page URL from user and store to ssjs-setup.json:
		let cloudPageUrl = await vscode.window.showInputBox({
			title: "Cloud Page URL",
			prompt: `Create a new Cloud Page/Code Resource for Dev in SFMC and paste the URL here.`,
			placeHolder: "Dev Cloud Page/Resource URL",
			ignoreFocusOut: true,
			validateInput: (text) => {
				if (!checks.isUrl(text)) {
					return 'Please, enter the URL of the Dev Cloud Page.';
				}
				return null;
			}
		});
		if (!cloudPageUrl) {
			// TODO: maybe allow empty input when already set to keep old value
			return false;
		}
		this.config.setDevPageInfo(cloudPageUrl);

		// If Folder not found, create:
		if (!await this.snippets.checkAssetFolder()) {
			return false;
		}

		// TODO: Ask user for selection of the deployment asset to use:
		const options = ['Token-Protected', 'Basic-Auth'];

		const selectedOption = await vscode.window.showQuickPick(options, {
			title: `Cloud Page Authentication Type`,
			prompt: `Select the type of authentication to use for the Cloud Page/Resource.`,
			placeHolder: 'Select an option',
			ignoreFocusOut: true
		});

		if (selectedOption) {
			return selectedOption;
		}
		return false;
	}

	/**
	 * Handles actual deployment of Any Scripts to SFMC, except building data (view) for the template. 
	 */
	async runAnyScriptDeployment(assetFile, view, cloudPageFile = DEPLOYMENT_TEMPLATE) {
		const packageData = this.config.getPackageJsonData();
		// PREPARE ASSET FILE:
		const snippetTemplatePath = path.join(this.config.sourcePath, assetFile);
		// BUILD ASSET TEMPLATE - build view separately, extract rest to super
		const snippetScript = template.runFile(snippetTemplatePath, {
			"page": packageData['homepage'],
			"version": `v${packageData['version']}`,
			...view
		});
		
		// deploy asset to SFMC:
		let runCloudPage = false;
		let devAssetId = this.config.getDevPageInfo()?.devSnippetId;
		let assetId;
		if (devAssetId) {
			// update existing asset:
			console.log(`UPDATE DEV asset: ${devAssetId}`);
			assetId = await this.updateSnippetBlock(devAssetId, snippetScript);
			// TODO: ask if to re-deploy the Cloud Page (NO as default)
		} else {
			// create new asset:
			console.log(`CREATE DEV asset`);
			assetId = await this.createSnippetBlock(snippetScript);
			console.log(`Asset ID:`, assetId);
			if (assetId) {
				this.config.setDevPageInfo(undefined, assetId);
				runCloudPage = true;
			} else {
				vscode.window.showWarningMessage(`Installation could not have been finished!`);
			}
		}

		if (runCloudPage) {
			// TODO: ask for page context:
			let devPageContext = 'cloud-page'; // 'cloud-page' / 'text-resource'

			// BUILD ASSET TEMPLATE
			const cpTemplatePath = path.join(this.config.sourcePath, cloudPageFile);
			const deploymentScript = template.runFile(cpTemplatePath, {
				"page": packageData['homepage'],
				"version": `v${packageData['version']}`,
				"devBlockID": assetId,
				"devPageContext": devPageContext
			});
			// CREATE FILE:
			this.snippets.saveScriptText(DEPLOYMENT_PATH, deploymentScript, true);
			vscode.window.showInformationMessage(`Installation almost complete - please follow steps from this file to finish.`);
		}
	}

	buildScriptText(isDev) {
		const activeTextEditor = vscode.window.activeTextEditor;

		if (activeTextEditor) {
			// Get the URI (Uniform Resource Identifier) of the currently open file
			const fileUri = activeTextEditor.document.uri;
			// Convert the URI to a file path
			const filePath = fileUri.fsPath;

			// TODO: replace with Config.isFileTypeAllowed(filePath)
			if (!USABLE_EXT.includes(path.extname(filePath))) {
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
	 * @param {string} assetName
	 * @returns {number|false} assetId
	 */
	async createSnippetBlock(scriptText, assetName) {
		let asset = this.snippets.getReqData(scriptText, assetName);
		// create the asset:
		let assetId = 0;
		await this.mc._post(`/asset/v1/assets/`, asset)
				.then((data) => {					
					let snippetPath = this.snippets.saveScriptText(SNIPPET_PATH, scriptText);
					this.snippets.saveMetadata(snippetPath, data);
					vscode.window.showInformationMessage(`Dev Asset Installed.`);
					assetId = data.body.id;
				})
				.catch((err) => {
					console.error('Create Dev Asset ERR:', err);
					asset.content = '<<script>>';
					console.debug('Dev Asset data:', asset);
					// TODO: show error message:
					let m = this.mc.parseRestError(err);
					vscode.window.showErrorMessage(`Error on Installing Dev Asset! \n${m}`);
					assetId = false;
				});
		return assetId;
	}
	
	/**
	 * Update Dev Asset Block  based on File.
	 * @param {number} devAssetId ID of an existing dev-code-snippet asset
	 * @param {string} scriptText
	 * @returns {number|false} assetId
	 */
	async updateSnippetBlock(devAssetId, scriptText) {
		let asset = {
			content: scriptText
		};
		let assetId = 0;
		await this.mc._patch(`/asset/v1/assets/${devAssetId}`, asset)
				.then((data) => {
					let snippetPath = this.snippets.saveScriptText(SNIPPET_PATH, scriptText);
					this.snippets.saveMetadata(snippetPath, data);
					vscode.window.showInformationMessage(`Dev Asset Updated.`);
					assetId = data.body.id;
				})
				.catch((err) => {
					console.error('Update Dev Asset ERR:', err);
					asset.content = '<<script>>';
					console.debug('Dev Asset data:', asset);
					// TODO: show error message:
					let m = this.mc.parseRestError(err);
					vscode.window.showErrorMessage(`Error on Updating Dev Asset! \n${m}`);
					assetId = false;
				});
		return assetId;
	}

	_checkCommand() {
		if (Config.isNoneProvider()) {
			vscode.window.showWarningMessage(`Code Providers switched off!`);
		} else {
			vscode.window.showWarningMessage(`Command not supported with ${Config.getCodeProvider()} Provider.`);
		}
	}
}