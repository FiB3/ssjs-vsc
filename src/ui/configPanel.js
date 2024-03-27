const vscode = require('vscode');
let path = require('path');

const Config = require('../config');
let file = require('../auxi/file');
let McClient = require('../sfmc/mcClient');
let ext = require('../extensionHandler');

const telemetry = require('../telemetry');
const SnippetHandler = require('../snippetHandler');

async function showConfigPanel(context) {
	const getView = getConfigPanelInfo;
	const panel = vscode.window.createWebviewPanel(
		'setup', // Identifies the type of the webview. Used internally
		'SSJS Manager', // Title of the panel displayed to the user
		vscode.ViewColumn.One, // Editor column to show the new webview panel in.
		{
			enableScripts: true,
			retainContextWhenHidden: true
		} // Webview options
	);

	panel.webview.onDidReceiveMessage(
		async message => {
			console.log(`BE: ${message.command} -`, message);
			switch (message.command) {
				case 'initialized':
					panel.webview.postMessage({
						command: 'init',
						...await getView()
					});
					return;
				case 'validateConnection':
					validateApiCredentials(panel, message);
					return;
				case 'createFolder':
					handleAssetFolders(panel, message);
					return;
				case 'setAnyScript':
					handleAnyScript(panel, message);
					return;
				case 'copyResourceCode':
					handleCopyResourceCode(panel, message);
					return;
				case 'manualStepDone':
					setManualStepDone(message);
					return;
				case 'autoOpenChange':
					handleAutoOpenChange(message.value);
					return;
			}
		},
		undefined,
		context.subscriptions
	);

	panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);
}

async function validateApiCredentials(panel, sfmc) {
	let { subdomain, clientId, clientSecret, mid } = sfmc;
	subdomain = McClient.extractSubdomain(subdomain);
	if (!subdomain || !clientId || !clientSecret) {
		panel.webview.postMessage({
			command: 'connectionValidated',
			ok: false,
			status: `Please, fill all fields: Subdomain, Client ID & Secret.`
		});
		return;
	}

	let r = await ext.handleNewSfmcCreds({ subdomain, clientId, clientSecret, mid }, false, 'ui', false);
	console.log('BE: validateApiCredentials (2):', r);

	panel.webview.postMessage({
		command: 'connectionValidated',
		ok: r.ok,
		status: r.message
	});
}

async function handleAssetFolders(panel, message) {
	let r = await ext.createContentBuilderFolder(message.parentName, message.newName);
	panel.webview.postMessage({
		command: 'folderCreated',
		ok: r.ok,
		status: r.message
	});
}

async function handleAnyScript(panel, message) {
	ext.setDevPageData(message.pagesData);

	let res = await ext.createDevAssets(message.pagesData);
	panel.webview.postMessage({
		command: 'anyScriptsSet',
		ok: res.ok,
		status: res.message
	});
}

function handleCopyResourceCode(panel, message) {
	let p = path.join(Config.getUserWorkspacePath(), `./.vscode/deploy.me.${message.devPageContext}.ssjs`);
	let code = file.load(p);
	vscode.env.clipboard.writeText(code);
	// Notification:
	vscode.window.showInformationMessage(`Code copied to clipboard.`);
}

function setManualStepDone(message) {
	ext.config?.setManualConfigSteps(message.anyScriptsDeployed, message.devRead);
}

function handleAutoOpenChange(newValue) {
	Config.changeShowPanelAutomatically(newValue);
}

function getWebviewContent(webview, extensionUri) {
	const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'configView', 'dist', 'main.js'));
	const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'configView', 'dist', 'main.css'));
	
	let html = `
		<!DOCTYPE html>
		<html lang="en">
		<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet">
		</head>
		<body>
				<div id="app"></div>
				<script src="${scriptUri}"></script>
		</body>
		</html>`;
	// let html = file.load(indexPath);
	return html;
}

/**
 * Get the information needed to show the config panel.
 * @returns {Promise<{workspaceSet: boolean, configFileExists: boolean, showChangelog: boolean}>}
 */
async function getConfigPanelInfo() {
	let configViewData = ext.config?.getManualConfigSteps();

	return {
		showPanelAutomatically: Config.showPanelAutomatically(),
		workspaceSet: Config.isWorkspaceSet(),
		codeProvider: Config.getCodeProvider(),
		configFileExists: Config.configFileExists(),
		configFileValid: ext.config?.isSetupValid() || false,
		sfmc: await ext.config?.getSfmcInstanceData() || false,
		folder: ext.config?.getAssetFolder() || { id: false, folderPath: `Not set.` },
		cloudPageData: ext.config?.getDevPageInfo('page'),
		textResourceData: ext.config?.getDevPageInfo('text'),
		anyScriptsDeployed: configViewData?.anyScriptsDeployed,
		devRead: configViewData?.devRead,
		showChangelog: false
	};
}

async function isConfigPanelNeeded() {
	const panelInfo = await getConfigPanelInfo();

	console.log(`Launch Config Panel? automatically: ${panelInfo.showPanelAutomatically} && Workspace Set: ${panelInfo.workspaceSet} && Config File Does not Exists: ${!panelInfo.configFileExists}.`);
	return panelInfo.showPanelAutomatically
			&& (!panelInfo.workspaceSet || !panelInfo.configFileExists || panelInfo.showChangelog);
}

module.exports = {
	showConfigPanel,
	isConfigPanelNeeded
};