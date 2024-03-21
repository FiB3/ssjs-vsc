const vscode = require('vscode');
const Config = require('../config');

function showConfigPanel(context, view) {
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

module.exports = {
	showConfigPanel
};