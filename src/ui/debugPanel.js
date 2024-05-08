const vscode = require('vscode');
let path = require('path');
let md5 = require('md5');

let file = require('../auxi/file');
let { template } = require('../template');
const Config = require('../config');

let panel;
let disposed = false;

async function runDebug(context, pageData) {
	if (!panel) {
		console.log('Creating new Debug panel...');
		showDebug(context, pageData);
	} else {
		console.log('Refreshing Debug panel...', panel);
		loadScript(pageData);
	}
}

async function showDebug(context, pageData) {
	panel = vscode.window.createWebviewPanel(
		'debug', // Identifies the type of the webview. Used internally
		'SFMC Preview', // Title of the panel displayed to the user
		vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
		{
			enableScripts: true,
			retainContextWhenHidden: true,
		}
	);
	disposed = false;

	panel.webview.onDidReceiveMessage(
		async message => {
			switch (message.command) {
				case 'debugInitiated':
					console.log('Debug initiated:', message);
					loadScript(pageData);
					return;
			}
		},
		undefined,
		context.subscriptions
	);

	panel.webview.html = getWebviewContent(pageData.url);
	panel.onDidDispose(() => {
		disposed = true;
		panel = undefined;
	});
}

function loadScript(pageData) {
	panel.webview.postMessage({
		command: 'loadScript',
		...pageData,
		hash: md5(`${pageData.username}:${pageData.password}`)
	});
}

function refreshDebug() {
	panel.webview.postMessage({ command: 'refresh' });
}

function getWebviewContent(devUrl) {
	let p = path.join(Config.getExtensionSourceFolder(), 'templates/debugPanel.html');
	let html = template.runFile(p, { devUrl, cspSource: panel.webview.cspSource });
	return html;
}

module.exports = {
	runDebug
};