const vscode = require('vscode');

const LanguageFormatter = require("./src/languageFormatters");
const Config = require('./src/config');
const ContextHolder = require('./src/config/contextHolder');
const logger = require('./src/auxi/logger');
const telemetry = require('./src/telemetry');
const stats = require('./src/auxi/stats');

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

	registerFormatters();

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
		{ name: 'ssjs-vsc.lint-current-file', callback: async () => await ext.lintCurrentFile('command') }
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
		await ext.checkDevPageVersion();
		await ext.rotateDevPageTokens();
		telemetry.log(`extensionActivated`, { codeProvider: Config.getCodeProvider(), allSet: true });
	}

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
		} else if (Config.isFileInWorkspace(filePath)) {
			let lintResult = 0; // 0 means no problems or not linted
			if (Config.isLintOnSaveEnabled()) {
				lintResult = await ext.lintCurrentFile('auto-save', true);
			}

			if (Config.isAutoSaveEnabled() && (lintResult < 1 || !Config.isLintOnSaveStrict())) {
				await ext.uploadScript(true);
			} else if (Config.isAutoSaveEnabled()) {
				logger.info(`registerFileActions() called for: ${filePath}, lintResult: ${lintResult}.`);
				vscode.window.showWarningMessage(`Cannot auto-save file with linting errors. Please, fix the errors first.`);
			}
		} else {
			if (!filePath.endsWith('settings.json')) {
				logger.info(`registerFileActions() called for: ${filePath}, autosave: ${Config.isAutoSaveEnabled()} && within Workspace: ${Config.isFileInWorkspace(filePath)}.`);
			}
		}
	});
	ContextHolder.getContext().subscriptions.push(onSaveFile);
}

function registerFormatters() {
	const formatters = new LanguageFormatter();
	const formatterRegistrations = vscode.languages.registerDocumentFormattingEditProvider(
			formatters.getSelectors(),
			formatters
	);
	vscode.Disposable.from(formatterRegistrations);
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