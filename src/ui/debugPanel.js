const vscode = require('vscode');
let path = require('path');
let file = require('../auxi/file');
let { template } = require('../template');
const Config = require('../config');

let panel;
let disposed = false;

/*
	BUG: rejected promise not handled within 1 second: Error: Webview is disposed
	steps to reproduce:
	0. loadScript is used
	1. open debug panel
	2. close debug panel
	3. open debug panel again

	ALSO: loadScript does not seem to trigger the iframe reload
*/

async function runDebug(pageData) {
	if (!panel) {
		console.log('Creating new Debug panel...');
		showDebug(pageData);
	} else {
		console.log('Refreshing Debug panel...', panel);
		loadScript(pageData);
	}
}

async function showDebug(pageData) {
	panel = vscode.window.createWebviewPanel(
		'debug', // Identifies the type of the webview. Used internally
		'SFMC Preview', // Title of the panel displayed to the user
		vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
		{
			enableScripts: true,
			retainContextWhenHidden: true
		}
	);
	disposed = false;

	panel.webview.html = getWebviewContent(pageData.url);
	panel.onDidDispose(() => {
		disposed = true;
		panel = undefined;
	});
}

function loadScript(pageData) {
	console.log('Loading script...', pageData);
	panel.webview.postMessage({
		command: 'loadScript',
		...pageData
	});
}

function refreshDebug() {
	panel.webview.postMessage({ command: 'refresh' });
}

function getWebviewContent(devUrl) {
	let p = path.join(Config.getExtensionSourceFolder(), 'templates/debugPanel.html');
	let html = template.runFile(p, { devUrl });
	return html;
}

module.exports = {
	runDebug
};