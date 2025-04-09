const vscode = require('vscode');

const BaseCodeProvider = require('./baseCodeProvider');
const Config = require('./config');
const Metafile = require('./code/metafile');
const dialogs = require('./ui/dialogs');
const vsc = require('./vsc');
const telemetry = require('./telemetry');
const logger = require('./auxi/logger');
const LivePreview = require('./livePreview');

const { template } = require('./template');
const json = require('./auxi/json');

const DEPLOYMENT_TOKEN_TEMPLATE = './templates/assetProvider/tokenDeployment.ssjs';
const DEPLOYMENT_BASIC_AUTH_TEMPLATE = './templates/assetProvider/formAuthDeployment.ssjs';

module.exports = class AssetCodeProvider extends BaseCodeProvider {

	constructor(config, statusBar, context) {
		super(config, statusBar, context);
		this.folderId;
		this.server = null;
		vscode.commands.executeCommand('setContext', 'ssjs-vsc.codeProvider', 'Asset');
	}

	async init(testConnection = false) {
		await super.init(true, testConnection);
	}

	async uploadScript(autoUpload, fileOverride = false) {
		const filePath = fileOverride || vsc.getActiveEditor();
		logger.debug(`uploadScript() called for: ${filePath}, autoUpload: ${autoUpload}.`);

		// file type check:
		if (!Config.isFileTypeAllowed(filePath, !autoUpload)) {
			return;
		}
		// if not existing, run dialog:
		if (!await this.snippets.checkAssetFolder()) {
			return;
		}

		if (Metafile.exists(filePath)) {
			let assetId = await this.updateCode(filePath);
			// continue only if updated successfully:
			if (assetId) {
				let savedDevContext = this.snippets.getDevContext(filePath);
				logger.debug('savedDevContext:', savedDevContext);
				if (!savedDevContext) {
					await this.getDevContextPreference(filePath);
				}

				telemetry.log('updateScript', { codeProvider: 'Asset', update: true });
			}
		} else if (!autoUpload) {
			let assetId = await this.createNewBlock(filePath);
			// continue if block created successfully:
			if (typeof assetId === 'number' && assetId > 0) {
				// find out the default dev context and save it:
				await this.getDevContextPreference(filePath);

				telemetry.log('uploadScript', { codeProvider: 'Asset', update: false });
			} else if (assetId === -2) {
				// TODO: offer to overwrite the existing file
				logger.debug('File already exists.');
			}
		} else {
			if (Config.isDefaultFileTypeAllowed(filePath)) {
				vscode.window.showInformationMessage(`Run 'SSJS: Upload Script' command to deploy any script for the first time.`);
			}
		}
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

	async getDevUrl(copyOnly = false) {
		logger.debug('getDevUrl() called.');
		try {
			const pageDetails = await this._getContextForGetUrl();
			logger.debug('pageDetails:', pageDetails);
			if (pageDetails) {
				const url = this._getDevUrl(pageDetails.devPageContext, pageDetails.metadata);
				this._getOpenUrlCommand(url, 'Asset', pageDetails, copyOnly);
			} else {
				vscode.window.showErrorMessage('File not deployed. Run `Upload Script to Dev` command first.');
			}
		} catch (e) {
			telemetry.error('getDevUrl', { error: e.message, codeProvider: 'Asset' });
		}
	}

	async getStandaloneScript() {
		logger.debug('getStandaloneScript() called.');
		try {
			const pageDetails = await this._getContextForGetUrl();
			logger.debug('pageDetails:', pageDetails);

			if (pageDetails && pageDetails.metadata.id) {
				const assetId = pageDetails.metadata.id;
				const scriptText = `%%=TreatAsContent(ContentBlockById(${assetId}))=%%`;
				vscode.env.clipboard.writeText(scriptText);
				vscode.window.showInformationMessage('Standalone script copied to clipboard: ' + scriptText);
			} else {
				vscode.window.showErrorMessage('Script not deployed. Run `Upload Script to Dev` command first.');
			}
		} catch (e) {
			telemetry.error('getStandaloneScript', { error: e.message, codeProvider: 'Asset' });
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
		let meta = Metafile.load(filePath);
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
		let res = {
			msg: `URL ready.`,
			visible: false
		};

		logger.debug(`useAuth: ${tokenConfig.useAuth} && authType: ${tokenConfig.authType}.`, 'tokenConfig:', tokenConfig);
		if (tokenConfig.useAuth && tokenConfig.authType == 'basic') {
			// TODO: this is not perfect, but good enough for now:
			res.msg = `Authentication details - user: ${tokenConfig.username}, password: ${tokenConfig.password}`;
			res.visible = true;
			res.username = tokenConfig.username;
			res.password = tokenConfig.password;
		} else if (tokenConfig.useAuth && tokenConfig.authType == 'token') {
			logger.debug(`Chose token auth.`);
			res.tkn = tokenConfig.token;
		}

		let url = this.config.getDevPageInfo(devPageContext).devPageUrl || '';
		res.url = res.tkn ? `${url}?token=${res.tkn}&asset-id=${id}` : `${url}?asset-id=${id}`;
		res.cleanUrl = `${url}?asset-id=${id}`;
		return res;
	}

	async startServer() {
		if (this.server && this.server.running) {
			logger.warn('Live Preview server is already running');
			return;
		}

		try {
			this.server = new LivePreview(this.config);
			await this.server.start();
			telemetry.log('livePreviewStart');
		} catch (error) {
			logger.error('Failed to start Live Preview server:', error);
			telemetry.error('livePreviewError', { on: 'start', error: error.message });
			throw error;
		}
	}

	async stopServer() {
		if (!this.server || !this.server.running) {
			logger.warn('Live Preview server is not running');
			return;
		}

		try {
			await this.server.stop();
			this.server = null;
			logger.log('Live Preview server stopped successfully');
			telemetry.log('livePreviewStop');
		} catch (error) {
			logger.error('Failed to stop Live Preview server:', error);
			telemetry.error('livePreviewError', { on: 'stop', error: error.message });
			throw error;
		}
	}

	async getLivePreviewUrl() {
		if (!this.server || !this.server.running) {
			let runStart = await dialogs.yesNoConfirm('Live Preview server is not running. Start it now?');
			if (!runStart) {
				vscode.window.showWarningMessage('Live Preview server is not running. Please, start it manually.');
				return;
			}
			await this.startServer();
		}

		const filePath = vsc.getActiveEditor();
		if (!filePath) {
			logger.warn('No file is currently open');
			return;
		}
		const url = this.server.getLivePreviewUrl(filePath);

		if (Config.isOpeningUrl() || Config.isPreviewUrl()) {
			logger.log('Opening URL:', url);
			vsc.openInBrowser(vscode.Uri.parse(url));
		} else { // (Config.isCopyingUrl())
			logger.log('Copying URL:', url);
			vsc.copyToClipboard(url);
			vscode.window.showInformationMessage('Live Preview URL copied to clipboard: ' + url);
		}
		// TODO: open in vscode panel for preview panel	
	}
}