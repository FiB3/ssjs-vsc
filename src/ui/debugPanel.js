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
let panelState = {
	disposed: false,
	devPageContext: undefined,
	column: vscode.ViewColumn.Two,
	set: (disposed, devPageContext) => {
		panelState.disposed = disposed;
		panelState.devPageContext = devPageContext;
	},
	isNewDevPageContext: (newDevPageContext) =>
		panelState.devPageContext !== newDevPageContext
};

const PANEL_PATH = 'templates/debugPanel.html';
const TEXT_PANEL_PATH = 'templates/debugTextPanel.html';

/**
 * Run Debug panel for both text and page context.
 * @param {*} context 
 * @param {*} pageData 
 */
async function runDebug(context, pageData, devPageContext = 'page') {
	if (!!panelState.devPageContext && panelState.isNewDevPageContext(devPageContext)) {
		logger.log('New devPageContext:', devPageContext, panelState.devPageContext);
		panel.dispose();
		panelState.set(true, devPageContext);
	}

	if (!panel) {
		logger.log('Creating new Debug panel...');
		showDebug(context, pageData, devPageContext);
	} else {
		logger.log(`Refreshing Debug panel... context: ${devPageContext}, isTextContext: ${isTextPageContext(devPageContext)}. Panel:`, panel);
		ensureVisible();
		triggerRefreshActions();
		if (isTextPageContext(devPageContext)) {
			logger.log('Loading script output (1)...');
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
		panelState.column, // Editor column to show the new webview panel in.
		{
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'node_modules'))],
		}
	);
	panelState.set(false, devPageContext);

	panel.webview.onDidReceiveMessage(
		async message => {
			switch (message.command) {
				case 'debugInitiated':
					logger.log('Debug initiated:', message, ', devPageContext:', devPageContext);
					if (isTextPageContext(devPageContext)) {
						logger.log('Loading script output (2)...');
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
		panelState.set(true, undefined);
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
	const colorTheme = vscode.window.activeColorTheme;
	let defaultTheme = colorTheme.kind === vscode.ColorThemeKind.Light ? 'vs-light' : 'vs-dark';
	logger.log('defaultTheme:', defaultTheme, colorTheme.kind);
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
	}
	
	let html = template.runFile(p, { devUrl, monacoPath, monacoBasePath, defaultTheme, cspSource: panel.webview.cspSource });
	return html;
}

async function loadScriptOutput(pageData, method = 'GET', options = { params: {}, body: {}, headers: {} }) {
	let url = `${pageData.cleanUrl || pageData.url}?${new URLSearchParams(options.params).toString()}`;
	let headersToUse = {
		...options.headers
	}
	if (pageData.tkn) headersToUse.Cookie = `ssjs-token=${md5(pageData.tkn)}`;
	if (pageData.username && pageData.password) headersToUse.Cookie = `ssjs-basic-auth=${md5(`${pageData.username}:${pageData.password}`)}`;

	let t0 = new Date();
	let result;
	try {
		result = await axios({
			method,
			url,
			responseType: 'text',
			headers: headersToUse,
			withCredentials: true
		});
	} catch (e) {
		logger.warn('loadScriptOutput:', e);
		result = e.response;
	}
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

function ensureVisible() {
	if (panel && !panel.visible) {
		panel.reveal();
	}
}

function triggerRefreshActions() {
	panel.webview.postMessage({
		command: 'refreshActions'
	});
}

function isTextPageContext(devPageContext) {
	return devPageContext === 'text';
}

module.exports = {
	runDebug	
};