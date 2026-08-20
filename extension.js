const vscode = require('vscode');

const Config = require('./src/config');
const ContextHolder = require('./src/config/contextHolder');
const logger = require('./src/auxi/logger');
const telemetry = require('./src/telemetry');
const stats = require('./src/auxi/stats');
const Pathy = require('./src/auxi/pathy');
const file = require('./src/auxi/file');
const jsonHandler = require('./src/auxi/json');
const { mergePrettierConfig } = require('./src/auxi/prettierConfig');

const dialogs = require('./src/ui/dialogs');
const { showConfigPanel } = require('./src/ui/configPanel');

let ext = require('./src/extensionHandler');

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	ContextHolder.init(context);

	logger.setup(ContextHolder.isProduction() ? 'INFO' : 'DEBUG');
	logger.info(`ssjs-vsc @ ${Config.getExtensionVersion()} is starting!`);
	
	ext.init();
	telemetry.init();
	stats.init();

	// Hand language intelligence to the SFMC Language Service: treat .ssjs files as
	// script-wrapped SFMC content when they wrap code in <script runat="server">.
	await setSfmcSsjsFileMode();
	// Clear stale editor.defaultFormatter values that pointed at our removed formatter.
	await cleanStaleFormatterSettings();
	// Preserve migrating users' historic UPPERCASE AMPscript keyword look via Prettier config.
	await amendPrettierConfig();

	registerCommands([
		{ name: 'ssjs-vsc.upload-to-prod', callback: async () => await ext.provider.uploadToProduction() },
		{ name: 'ssjs-vsc.upload-script', callback: async () => await ext.uploadScript() },
		{ name: 'ssjs-vsc.get-standalone-script', callback: async () => await ext.provider.getStandaloneScript() },
		{ name: 'ssjs-vsc.change-script-options', callback: async () => await ext.provider.changeScriptMetadata() },
		{ name: 'ssjs-vsc.update-any-path', callback: async () => await ext.provider.updateAnyScript() },
		{ name: 'ssjs-vsc.get-url', callback: async () => await ext.provider.getDevUrl(true) },
		{ name: 'ssjs-vsc.copy-code', callback: async () => await ext.provider.copyCode() },
		{ name: 'ssjs-vsc.run', callback: async () => await ext.provider.getDevUrl() },
		{ name: 'ssjs-vsc.show-config', callback: async () => await showConfigPanel() },
		{ name: 'ssjs-vsc.check-any-path', callback: async () => await checkDeployedDevAssets()	},
		{ name: 'ssjs-vsc.start', callback: async () => await ext.provider.startServer() },
		{ name: 'ssjs-vsc.stop', callback: async () => await ext.provider.stopServer() },
		{ name: 'ssjs-vsc.get-live-preview-url', callback: async () => await ext.provider.getLivePreviewUrl() },
		{ name: 'ssjs-vsc.show-walkthrough', callback: showWalkthrough },
		{ name: 'ssjs-vsc.delete-asset', callback: async () => await ext.provider.deleteAsset() },
		{ name: 'ssjs-vsc.fetch-asset', callback: async () => await ext.provider.fetchAsset() },
		{ name: 'ssjs-vsc.fetch-all-blocks', callback: async () => await ext.provider.fetchAllBlocks() }
	]);

	let workspaceOk = await ext.workspaceOk();
	logger.debug(`Workspace is ok: ${workspaceOk}.`);
	if (!workspaceOk) {
		await launchConfigPanel();
		return;
	}
	// IF WORKSPACE EXISTS:
	let configOk = await ext.loadConfiguration();
	if (!configOk) {
		await launchConfigPanel();
	}
	
	await ext.pickCodeProvider(true, true);
	if (configOk) {
		const tokensRotated = await ext.rotateDevPageTokens();
		if (tokensRotated) {
			vscode.window.showInformationMessage(`Dev Page tokens were rotated.`);
			return;
		}
		await ext.checkDevPageVersion();
		telemetry.log(`extensionActivated`, { codeProvider: Config.getCodeProvider(), allSet: true });
	}
	ext.config.allowExperimental();

	watchForConfigurationChanges();
	registerFileActions();
}

async function launchConfigPanel() {
	if (Config.showPanelAutomatically()) {
		await showConfigPanel();
	}
}

async function checkDeployedDevAssets() { 
	let r = await ext.checkDeployedDevAssets();
	if (r.ok) {
		vscode.window.showInformationMessage(r.message);
	} else {
		vscode.window.showErrorMessage(r.message);
	}
}

function watchForConfigurationChanges() {
	vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('ssjs-vsc.editor.codeProvider')) {
			ext.pickCodeProvider();
			telemetry.log(`changeCodeProvider`, { codeProvider: Config.getCodeProvider() });
		} else if (event.affectsConfiguration('ssjs-vsc.editor.additionalFileTypes')) {
			Config.updateAllowedFileTypesInVsCodeContext();		
		}	
	});
}

function registerCommands(commands) {
	commands.forEach(({ name, callback }) => {
		const command = vscode.commands.registerCommand(name, callback);
		ContextHolder.getContext().subscriptions.push(command);
	});
}

async function registerFileActions() {
	const onSaveFile = vscode.workspace.onDidSaveTextDocument(async (textDocument) => {
		let filePath = textDocument.uri.fsPath;

		// Trigger reload for live preview if server is running
		if (ext.provider.server?.running) {
			ext.provider.server.notifyClientsToReload();
		}

		if (!Config.isWorkspaceSet()) {
			vscode.window.showWarningMessage(`It seems you are not using workspaces! To use full potential of this extension, please, open a folder and run command: "SSJS: Show Setup Walkthrough".`);
			ext.deactivateProviders({});
			telemetry.log(`noWorkspace`);
			return;
		}
		
		if (Config.isConfigFile(filePath)) {
			ext.config.loadConfig();
			ext.config.allowExperimental();
		} else if (Config.isFileInWorkspace(filePath)) {
			if (Config.isAutoSaveEnabled()) {
				await ext.uploadScript(true);
			}
		} else {
			if (!filePath.endsWith('settings.json')) {
				logger.info(`registerFileActions() called for: ${filePath}, autosave: ${Config.isAutoSaveEnabled()} && within Workspace: ${Config.isFileInWorkspace(filePath)}.`);
			}
		}
	});
	ContextHolder.getContext().subscriptions.push(onSaveFile);
}

/**
 * Force the SFMC Language Service to treat every .ssjs file as SFMC content so its
 * region-based SSJS intelligence lints the embedded code. SSJS Manager's .ssjs files
 * are always script-wrapped HTML, so 'sfmc' (force-all, no per-file content scan) is
 * correct. Only writes when a workspace is open and the mode is not already 'sfmc'.
 */
async function setSfmcSsjsFileMode() {
	if (!vscode.workspace.workspaceFolders?.length) {
		return;
	}
	const sfmcCfg = vscode.workspace.getConfiguration('sfmcLanguageServer');
	if (sfmcCfg.get('ssjsFileMode') !== 'sfmc') {
		await sfmcCfg.update('ssjsFileMode', 'sfmc', vscode.ConfigurationTarget.Workspace);
	}
}

/**
 * Remove stale editor.defaultFormatter settings left behind by the removed
 * SSJS Manager formatter. Runs once on activation, only writing when a value is
 * actually present in Workspace/WorkspaceFolder scope (idempotent).
 */
async function cleanStaleFormatterSettings() {
	if (!vscode.workspace.workspaceFolders?.length) {
		return;
	}
	// The capital '[AMPscript]' language id no longer exists, so any defaultFormatter under it is dead config.
	await clearDefaultFormatter('AMPscript');
	// For our live ids, only clear when the value points at the removed SSJS Manager formatter.
	await clearDefaultFormatter('ampscript', 'FiB.ssjs-vsc');
	await clearDefaultFormatter('ssjs', 'FiB.ssjs-vsc');
}

/**
 * Clear editor.defaultFormatter for a language id from Workspace/WorkspaceFolder scope.
 * @param {string} languageId - the language id whose override is inspected.
 * @param {string} [onlyIfValue] - when set, only clear if the current scope value equals this.
 */
async function clearDefaultFormatter(languageId, onlyIfValue) {
	const cfg = vscode.workspace.getConfiguration('editor', { languageId });
	const info = cfg.inspect('defaultFormatter');
	if (!info) {
		return;
	}
	// Workspace scope.
	if (info.workspaceValue !== undefined && (onlyIfValue === undefined || info.workspaceValue === onlyIfValue)) {
		try {
			await cfg.update('defaultFormatter', undefined, vscode.ConfigurationTarget.Workspace, true);
		} catch (err) {
			logger.debug(`clearDefaultFormatter Workspace [${languageId}]: ${err?.message}`);
		}
	}
	// WorkspaceFolder scope (throws in single-folder windows).
	if (info.workspaceFolderValue !== undefined && (onlyIfValue === undefined || info.workspaceFolderValue === onlyIfValue)) {
		try {
			await cfg.update('defaultFormatter', undefined, vscode.ConfigurationTarget.WorkspaceFolder, true);
		} catch (err) {
			logger.debug(`clearDefaultFormatter WorkspaceFolder [${languageId}]: ${err?.message}`);
		}
	}
}

/**
 * One-time key in workspaceState gating the manual-edit hint for non-editable configs.
 */
const PRETTIER_AMEND_HINT_KEY = 'ssjs-vsc.prettierAmendHintShown';

/**
 * JSON-editable prettier config file names, checked in priority order.
 */
const JSON_PRETTIER_FILES = ['.prettierrc.json'];

/**
 * Non-editable prettier config file names (JS/YAML/TOML) - hint only, never written.
 */
const NON_EDITABLE_PRETTIER_FILES = [
	'.prettierrc.js', '.prettierrc.cjs', '.prettierrc.mjs',
	'prettier.config.js', 'prettier.config.cjs', 'prettier.config.mjs',
	'.prettierrc.yaml', '.prettierrc.yml', '.prettierrc.toml'
];

/**
 * Preserve the user's historic UPPERCASE AMPscript keyword look by ensuring the
 * workspace Prettier config carries `ampscriptKeywordCase: "upper"`. The SFMC
 * Language Service always injects its bundled `prettier-plugin-sfmc` and merges
 * this option on top, so only the option (not a `plugins` entry) is needed.
 *
 * Only acts for users who were on uppercase: the raw persisted (now-undeclared)
 * `ssjs-vsc.language.ampscript.capitalizeKeywords` setting must not be `false`.
 * JSON configs are edited/created silently; JS/YAML configs get a one-time hint.
 * Idempotent: never overrides an explicit `ampscriptKeywordCase` and re-runs cleanly.
 */
async function amendPrettierConfig() {
	if (!vscode.workspace.workspaceFolders?.length) {
		return;
	}
	// Decide upper vs. no-op from the raw persisted (now-undeclared) setting.
	const cap = vscode.workspace.getConfiguration('ssjs-vsc.language.ampscript').get('capitalizeKeywords');
	if (cap === false) {
		// User opted out of uppercase; our lowercase default already matches.
		return;
	}
	try {
		// Detect existing config (first hit wins): JSON-editable, then non-editable, then none.
		// .prettierrc may hold JSON or YAML - only editable when it parses as JSON.
		const rcPath = Pathy.joinToRoot('.prettierrc');
		if (file.exists(rcPath)) {
			const parsed = jsonHandler.load(rcPath);
			if (parsed && parsed.error) {
				// .prettierrc is YAML (or unreadable) - treat as non-editable.
				await showPrettierAmendHint();
				return;
			}
			amendJsonPrettierFile(rcPath, parsed);
			return;
		}
		for (const name of JSON_PRETTIER_FILES) {
			const p = Pathy.joinToRoot(name);
			if (file.exists(p)) {
				const parsed = jsonHandler.load(p);
				if (parsed && parsed.error) {
					await showPrettierAmendHint();
					return;
				}
				amendJsonPrettierFile(p, parsed);
				return;
			}
		}
		// package.json with a `prettier` key.
		const pkgPath = Pathy.joinToRoot('package.json');
		if (file.exists(pkgPath)) {
			const pkg = jsonHandler.load(pkgPath);
			if (pkg && pkg.error) {
				await showPrettierAmendHint();
				return;
			}
			if (pkg && Object.prototype.hasOwnProperty.call(pkg, 'prettier') && typeof pkg.prettier === 'object') {
				const { config, changed } = mergePrettierConfig(pkg.prettier);
				if (changed) {
					pkg.prettier = config;
					jsonHandler.save(pkgPath, pkg);
				}
				return;
			}
		}
		// Non-editable configs: hint only.
		for (const name of NON_EDITABLE_PRETTIER_FILES) {
			if (file.exists(Pathy.joinToRoot(name))) {
				await showPrettierAmendHint();
				return;
			}
		}
		// None found: create a JSON .prettierrc at root.
		jsonHandler.save(rcPath, { ampscriptKeywordCase: 'upper' });
	} catch (err) {
		logger.debug(`amendPrettierConfig(): ${err?.message}`);
	}
}

/**
 * Merge `ampscriptKeywordCase: "upper"` into a parsed JSON prettier config and
 * save it back only when something changed.
 * @param {string} absPath - absolute path to the JSON config file.
 * @param {object} parsed - parsed config object.
 */
function amendJsonPrettierFile(absPath, parsed) {
	const { config, changed } = mergePrettierConfig(parsed);
	if (changed) {
		jsonHandler.save(absPath, config);
	}
}

/**
 * Show a one-time info hint telling the user to add the option manually to a
 * non-editable (JS/YAML/TOML) Prettier config. Gated so it shows at most once
 * per workspace.
 */
async function showPrettierAmendHint() {
	const state = ContextHolder.getContext()?.workspaceState;
	if (state?.get?.(PRETTIER_AMEND_HINT_KEY)) {
		return;
	}
	await state?.update?.(PRETTIER_AMEND_HINT_KEY, true);
	vscode.window.showInformationMessage(
		`SSJS Manager: to keep AMPscript keywords uppercase, add "ampscriptKeywordCase": "upper" to your Prettier config.`
	);
}

function showWalkthrough() {
	telemetry.log('showWalkthrough');
	vscode.commands.executeCommand('workbench.action.openWalkthrough', { category: 'FiB.ssjs-vsc#setup-ssjs-manager' }, false);
}

// This method is called when your extension is deactivated
function deactivate() {
	logger.debug(`Deactivating extension!`);
	ext.provider.deactivate();
	telemetry.dispose();
}

module.exports = {
	activate,
	deactivate
}