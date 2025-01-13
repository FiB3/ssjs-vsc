const vscode = require('vscode');
let path = require('path');
let md5 = require('md5');
let axios = require('axios');

let file = require('../auxi/file');
let { template } = require('../template');
const Config = require('../config');
const logger = require('../auxi/logger');
const { time } = require('console');

let panel;
let disposed = false;

const PANEL_PATH = 'templates/debugPanel.html';
const TEXT_PANEL_PATH = 'templates/debugTextPanel.html';

/**
 * Run Debug panel for both text and page context.
 * @param {*} context 
 * @param {*} pageData 
 */
async function runDebug(context, pageData, devPageContext = 'page') {
	if (!panel) {
		logger.log('Creating new Debug panel...');
		showDebug(context, pageData, devPageContext);
	} else {
		logger.log('Refreshing Debug panel...', panel);
		if (isTextPageContext(devPageContext)) {
			loadScriptOutput(pageData);
		} else {
			loadScript(pageData);
		}			
	}
}

async function showDebug(context, pageData, devPageContext) {
	panel = vscode.window.createWebviewPanel(
		'debug', // Identifies the type of the webview. Used internally
		'SFMC Preview', // Title of the panel displayed to the user
		vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
		{
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'node_modules'))],
		}
	);
	disposed = false;

	panel.webview.onDidReceiveMessage(
		async message => {
			switch (message.command) {
				case 'debugInitiated':
					logger.log('Debug initiated:', message);
					if (isTextPageContext(devPageContext)) {
						loadScriptOutput(pageData);
					} else {
						loadScript(pageData);
					}	
					return;
			}
		},
		undefined,
		context.subscriptions
	);

	panel.webview.html = getWebviewContent(context, pageData.url, devPageContext);
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

function getWebviewContent(context, devUrl, devPageContext) {
	let templatePath = isTextPageContext(devPageContext) ? TEXT_PANEL_PATH : PANEL_PATH;

	let p = path.join(Config.getExtensionSourceFolder(), templatePath);
	
	let monacoPath = ``;
	let monacoBasePath = false;
	if (isTextPageContext(devPageContext)) {
		// load from node_modules:
		let scriptPathOnDisk = vscode.Uri.file(
			path.join(context.extensionPath, 'node_modules', 'monaco-editor', 'min', 'vs', 'loader.js')
		);
		monacoPath = panel.webview.asWebviewUri(scriptPathOnDisk);
		scriptPathOnDisk = vscode.Uri.file(
			path.join(context.extensionPath, 'node_modules', 'monaco-editor', 'min', 'vs')
		);
		monacoBasePath = panel.webview.asWebviewUri(scriptPathOnDisk);

		logger.log('scriptPathOnDisk:', scriptPathOnDisk);
		logger.log('monacoPath:', monacoPath);
	}
	let html = template.runFile(p, { devUrl, monacoPath, monacoBasePath });
	return html;
}

async function loadScriptOutput(pageData, method = 'GET', options = { params: {}, body: {}, headers: {} }) {
	let url = `${pageData.url}?${new URLSearchParams(options.params).toString()}`;
	// TODO: add headers for both authorization principles:
	let headersToUse = {
		// Authorization: `Bearer ${pageData.token}`,
		...options.headers
	};
	let t0 = new Date();

	let result = await axios({
		method,
		url,
		responseType: 'text',
	});
	let t1 = new Date();
	logger.log('loadScriptOutput:', result);

	panel.webview.postMessage({
		command: 'loadScript',
		status: result.status,
		headers: result.headers,
		time: t1 - t0,
		data: result.data
	});
}

function isTextPageContext(devPageContext) {
	return devPageContext === 'text';
}

module.exports = {
	runDebug	
};