const vscode = require('vscode');
const Config = require('../config');

const telemetry = require('../telemetry');

async function showConfigPanel(context) {
	const view = await getConfigPanelInfo();
	const panel = vscode.window.createWebviewPanel(
		'setup', // Identifies the type of the webview. Used internally
		'SSJS Manager', // Title of the panel displayed to the user
		vscode.ViewColumn.One, // Editor column to show the new webview panel in.
		{
			enableScripts: true,
			retainContextWhenHidden: true
		} // Webview options. More on these later.
	);

	panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'initialized':
						panel.webview.postMessage({
							command: 'init',
							workspaceSet: view.workspaceSet,
							configFileExists: view.configFileExists,
							showChangelog: view.showChangelog,
							showPanelAutomatically: Config.showPanelAutomatically()
						});

						return;
					case 'validateConnection':
						validateApiCredentials(panel, message);
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

function validateApiCredentials(panel, sfmc) {
	console.log('BE: validateApiCredentials', sfmc);

	panel.webview.postMessage({
		command: 'connectionValidated',
		ok: false,
		status: 'Not implemented yet.'
	});
}

function handleAutoOpenChange(newValue) {
	Config.changeShowPanelAutomatically(newValue);
}

function getWebviewContent(webview, extensionUri) {
	// const indexPath = path.join(Config.getExtensionSourceFolder(), PANEL_INDEX_HTML);
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
	const showPanelAutomatically = Config.showPanelAutomatically();
	const workspaceSet = Config.isWorkspaceSet();
	const configFileExists = Config.configFileExists();
	const showChangelog = false; // for future use

	return {
		showPanelAutomatically,
		workspaceSet,
		configFileExists,
		showChangelog
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