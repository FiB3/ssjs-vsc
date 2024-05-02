const vscode = require('vscode');

const BaseCodeProvider = require('./baseCodeProvider');
// const Config = require('./config');
const dialogs = require('./ui/dialogs');
const checks = require('./checks');
const vsc = require('./vsc');
const telemetry = require('./telemetry');

const { template } = require('./template');
const json = require('./auxi/json');

const DEPLOYMENT_TOKEN_TEMPLATE = './templates/assetProvider/tokenDeployment.ssjs';
const DEPLOYMENT_BASIC_AUTH_TEMPLATE = './templates/assetProvider/formAuthDeployment.ssjs';

module.exports = class AssetCodeProvider extends BaseCodeProvider {

	constructor(config, statusBar) {
		super(config, statusBar);
		this.folderId;
		vscode.commands.executeCommand('setContext', 'ssjs-vsc.codeProvider', 'Asset');
	}

	async init(testConnection = false) {
		await super.init(true, testConnection);
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

				let savedDevContext = this.snippets.getDevContext(filePath);
				console.log('savedDevContext:', savedDevContext);
				if (!savedDevContext) {
					await this.getDevContextPreference(filePath);
				}

				telemetry.log('updateScript', { codeProvider: 'Asset', update: true });
			} else if (!autoUpload) {
				await this.createNewBlock(filePath);
				// find out the default dev context and save it:
				await this.getDevContextPreference(filePath);

				telemetry.log('uploadScript', { codeProvider: 'Asset', update: false });
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

		telemetry.log('deployAnyScript', { codeProvider: 'Asset', source: 'command' });
	}

	async deployAnyScriptUi(contexts) {
		let res = { ok: true, message: '' };
		let deployments = this._getContextInfoForDeployment(contexts, DEPLOYMENT_TOKEN_TEMPLATE, DEPLOYMENT_BASIC_AUTH_TEMPLATE);
		let results = await this.runAnyScriptDeployments(deployments, true);
		telemetry.log('deployAnyScript', { codeProvider: 'Asset', source: 'ui' });
		
		if (results) {
			results.forEach(result => {
					if (!result.ok) {
							res.ok = false;
							res.message += res.message ? ` Resource not deployed ${result.devPageContext}` : ' ' + result.message;
					}
			});
			if (!res.ok) {
					res.message = `Error: ` + res.message;
			} else {
				res.message = `All resources deployed.`;
			}
		}
		return res;
	}

	async updateAnyScript(silenced = false) {
		try {
			let contexts = [];
			this.config.isDevPageSet() ? contexts.push('page') : null;
			this.config.isDevResourceSet() ? contexts.push('text') : null;

			let deployments = this._getContextInfoForDeployment(contexts, DEPLOYMENT_TOKEN_TEMPLATE, DEPLOYMENT_BASIC_AUTH_TEMPLATE);
			await this.runAnyScriptDeployments(deployments, silenced);
		} catch (e) {
			telemetry.error('updateAnyScript', { error: e.message, codeProvider: 'Asset' });
		}
	}

	async getDevUrl() {
		try {
			const pageDetails = await this._getContextForGetUrl();
			console.log('pageDetails:', pageDetails);
			if (pageDetails) {
				const url = this._getDevUrl(pageDetails.devPageContext, pageDetails.metadata);
				this._getOpenUrlCommand(url, 'Asset', pageDetails);
			} else {
				vscode.window.showErrorMessage('File not deployed. Run `Upload Script to Dev` command first.');
			}
		} catch (e) {
			telemetry.error('getDevUrl', { error: e.message, codeProvider: 'Asset' });
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

	async getDevContextPreference(filePath) {
		const defaultDevContext = await dialogs.getDevContextPreference();
		if (defaultDevContext) {
			this.snippets.saveDevContext(filePath, defaultDevContext);
		}
	}

	_getDevUrl(devPageContext, metadata) {
		let tokenConfig = this.config.getDevPageAuth(devPageContext);
		let id = metadata.id;
		let tkn;
		let res = {
			msg: `URL ready.`,
			visible: false
		};

		console.log(`useAuth: ${tokenConfig.useAuth} && authType: ${tokenConfig.authType}.`, 'tokenConfig:', tokenConfig);
		if (tokenConfig.useAuth && tokenConfig.authType == 'basic') {
			// TODO: this is not perfect, but good enough for now:
			res.msg = `Authentication details - user: ${tokenConfig.username}, password: ${tokenConfig.password}`;
			res.visible = true;
			res.username = tokenConfig.username;
			res.password = tokenConfig.password;
		} else if (tokenConfig.useAuth && tokenConfig.authType == 'token') {
			console.log(`Chose token auth.`);
			tkn = tokenConfig.token;
		}

		let url = this.config.getDevPageInfo(devPageContext).devPageUrl || '';
		res.url = tkn ? `${url}?token=${tkn}&asset-id=${id}` : `${url}?asset-id=${id}`;
		return res;
	}
}