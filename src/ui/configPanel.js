const vscode = require('vscode');
const { marked } = require('marked');

const Config = require('../config');
const ContextHolder = require('../config/contextHolder');
let file = require('../auxi/file');
let McClient = require('../sfmc/mcClient');
let ext = require('../extensionHandler');
let telemetry = require('../telemetry');
let stats = require('../auxi/stats');
let logger = require('../auxi/logger');
const Pathy = require('../auxi/pathy');

async function showConfigPanel() {
	const getView = getConfigPanelInfo;
	let panel = vscode.window.createWebviewPanel(
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
			logger.log(`BE: ${message.command} -`, message);
			switch (message.command) {
				case 'initialized':
					await handleInit(panel, getView);
					return;
				case 'reloadConfig':
					await reloadConfig(panel, message, getView);
					logger.log(`BE: reloadConfig`);
					return;
				case 'testConfigufation':
					testConfigurations(panel);
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
				case 'validateDevAssets':
					validateDevAssets(panel);
					return;
				case 'manualStepDone':
					setManualStepDone(message);
					return;
				case 'autoOpenChange':
					handleAutoOpenChange(message.value);
					return;
				case 'templatingInit':
					getTemplatingTags(panel, message);
					return;
				case 'setTemplatingTags':
					handleTemplatingTags(panel, message);
					return;
				case 'getStats':
					handleGetStats(panel);
					return;
				case 'loadChangelog':
					loadChangelog(panel);
					return;
			}
		},
		undefined,
		ContextHolder.getContext().subscriptions
	);

	panel.webview.html = getWebviewContent(panel.webview);

	panel.onDidDispose(() => {
		logger.warn('Config Panel disposed.');
		panel = null;
	});
}

async function handleInit(panel, getViewFunc) {
	let conf = await getViewFunc();
	postMessage(panel, {
		command: 'init',
		...conf
	});

	telemetry.log(`configPanelInitialized`, {
		allSet: conf.workspaceSet && conf.configFileValid && !!conf.sfmc && !!conf.cloudPageData
				&& !!conf.textResourceData && conf.anyScriptsDeployed && conf.anyScriptsDeployed,
		workspaceSet: conf.workspaceSet,
		configFileValid: conf.configFileValid,
		sfmcSet: !!conf.sfmc,
		cloudPageData: conf.cloudPageOk,
		textResourceData: conf.textResourceOk,
		anyScriptsDeployed: conf.anyScriptsDeployed,
		devRead: conf.anyScriptsDeployed
	});
}

async function reloadConfig(panel, message, getViewFunc) {
	if (!ext.config) {
		logger.error('Extension configuration not initialized - reloading config.');
		vscode.window.showErrorMessage('Extension configuration not initialized. Is the extension configured?');
		return;
	}
	ext.config.loadConfig();
	let conf = await getViewFunc();
	postMessage(panel, {
		command: 'init',
		...conf
	});
	getTemplatingTags(panel, message, true);
}

async function testConfigurations(panel) {
	async function updateStatus(isDone, messsage) {
		postMessage(panel, {
			command: 'updateTestingConfigurationStatus',
			running: true,
			status: messsage
		});
		// small delay, for better UX:
		if (isDone) {
			await new Promise(resolve => setTimeout(resolve, 5000));
			postMessage(panel, {
				command: 'updateTestingConfigurationStatus',
				running: false
			});
			return;
		}
		// small delay, for better UX:
		return new Promise(resolve => setTimeout(resolve, Math.random() * 700 + 700));
	}
	telemetry.log(`testConfigurations`, {});
	await updateStatus(false, `Testing...`);
	// Validate API Credentials:
	let credsRes = await ext.checkSfmcCredentials();
	postMessage(panel, {
		command: 'connectionValidated',
		ok: credsRes.ok,
		status: credsRes.message
	});

	if (!credsRes.ok) {
		await updateStatus(true, `API Credentials are invalid.`);
		return;
	}
	await updateStatus(false, `API Credentials validated. Checking other settings...`);

	// check if folder exists:
	let folderId = ext.config?.getAssetFolderId();
	let mc = ext.getMcClient();
	logger.log(`MC Client:`, mc);
	let folderResOk = await mc.getAssetFolderById(folderId)
			.then(async () => {
				await updateStatus(false, `Content Builder Folder exists. Checking Dev Assets...`);
				return true;
			})
			.catch(async err => {
				postMessage(panel, {
					command: 'folderCreated',
					ok: false,
					status: err.statusCode === 404 ?
							`Content Builder Folder does not exist.`
							: `Error: ${err.statusCode} - ${err.statusMessage}`
				});
				await updateStatus(true, `Content Builder Folder does not exist.`);
				return false;
			});
	if (!folderResOk) { return; }

	// run dev assets check:
	let assetsRes = await validateDevAssets(panel);
	if (!assetsRes.ok) {
		await updateStatus(true, `Dev Assets are not deployed correctly.`);
		return;
	}
	await updateStatus(false, `Dev Assets deployed correctly...`);
	await updateStatus(true, `Finished!`);
}

async function validateApiCredentials(panel, sfmc) {
	let { subdomain, clientId, clientSecret, mid } = sfmc;
	subdomain = McClient.extractSubdomain(subdomain);
	if (!subdomain || !clientId || !clientSecret) {
		postMessage(panel, {
			command: 'connectionValidated',
			ok: false,
			status: `Please, fill all fields: Subdomain, Client ID & Secret.`
		});
		return;
	}

	let r = await ext.handleNewSfmcCreds({ subdomain, clientId, clientSecret, mid }, false, false);
	logger.log('BE: validateApiCredentials (2):', r);

	postMessage(panel, {
			command: 'connectionValidated',
			ok: r.ok,
			status: r.message
	});
}

async function handleAssetFolders(panel, message) {
	let r = await ext.createContentBuilderFolder(message.parentName, message.newName);
	postMessage(panel, {
		command: 'folderCreated',
		ok: r.ok,
		status: r.message
	});
}

async function handleAnyScript(panel, message) {
	if (!Array.isArray(message.pagesData) || message.pagesData?.length === 0) {
		postMessage(panel, {
			command: 'anyScriptsSet',
			ok: false,
			status: `No data provided.`
		});
		return;
	}
	ext.setDevPageData(message.pagesData);
	let res = await ext.createDevAssets(message.pagesData);
	postMessage(panel, {
		command: 'anyScriptsSet',
		ok: res.ok,
		status: res.message
	});
}

function handleCopyResourceCode(panel, message) {
	if (Pathy.getWorkspacePath()) {
		let p = Pathy.joinToRoot(`./.vscode/deploy.me.${message.devPageContext}.ssjs`);
		let code = file.load(p);
		vscode.env.clipboard.writeText(code);
		// Notification:
		vscode.window.showInformationMessage(`Code copied to clipboard.`);
	} else {
		vscode.window.showErrorMessage(`Please, set workspace & complete all previous steps before this one.`);
	}
}

async function validateDevAssets(panel) {
	let res = { ok: false, message: `Error: No response from your deployed Dev Assets - check if both are deployed correctly.` };
	await ext.checkDeployedDevAssets().then(r => {
		res = r;
	});

	postMessage(panel, {
		command: 'devAssetsValidated',
		ok: res.ok,
		status: res.message
	});
	ext.config?.setManualConfigSteps(res.ok);
	return res;
}

function setManualStepDone(message) {
	// TODO: legacy function, including event
	ext.config?.setManualConfigSteps(message.anyScriptsDeployed, message.devRead);
	telemetry.log(`manualStepDone`, { anyScriptsDeployed: message.anyScriptsDeployed, devRead: message.devRead });
}

function handleAutoOpenChange(newValue) {
	Config.changeShowPanelAutomatically(newValue);
}

function handleGetStats(panel) {
	let statsData = {
		apiCalls: stats.getApiCalls(),
		createdDate: stats.getCreatedDate()
	};
	postMessage(panel, {
		command: 'stats',
		data: statsData
	});
}

function getWebviewContent(webview) {
	const scriptUri = webview.asWebviewUri(vscode.Uri.file(Pathy.joinToSource('configView', 'dist', 'main.js')));
	const styleUri = webview.asWebviewUri(vscode.Uri.file(Pathy.joinToSource('configView', 'dist', 'main.css')));
	
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

	const configValid = ext.config?.isSetupValid() || false;
	logger.log(`Config Valid:`, configValid);
	const sfmc = await ext.config?.getSfmcInstanceData() || false;
	// logger.log(`SFMC Data:`, sfmc);

	return {
		showPanelAutomatically: Config.showPanelAutomatically(),
		workspaceSet: Config.isWorkspaceSet(),
		codeProvider: Config.getCodeProvider(),
		configFileExists: Config.configFileExists(),
		configFileValid: configValid,
		sfmc: sfmc,
		folder: ext.config?.getAssetFolder() || { id: false, folderPath: `Not set.` },
		folderNames: ext.config?.getAssetFolderNames(),
		cloudPageData: ext.config?.getDevPageInfo('page'),
		cloudPageOk: ext.config?.isDevPageSet(),
		textResourceData: ext.config?.getDevPageInfo('text'),
		textResourceOk: ext.config?.isDevResourceSet(),
		anyScriptsDeployed: configViewData?.anyScriptsDeployed,
		devRead: configViewData?.devRead,
		showChangelog: false
	};
}

async function isConfigPanelNeeded() {
	const panelInfo = {
		showPanelAutomatically: Config.showPanelAutomatically(),
		workspaceSet: Config.isWorkspaceSet(),
		configFileValid: ext.config.isSetupValid() || false,
		showChangelog: false
	};

	logger.log(`Launch Config Panel? automatically: ${panelInfo.showPanelAutomatically} && Workspace Set: ${panelInfo.workspaceSet} && Config File Valid: ${panelInfo.configFileValid}.`);
	return panelInfo.showPanelAutomatically
			&& (!panelInfo.workspaceSet || !panelInfo.configFileValid || panelInfo.showChangelog);
}

function getTemplatingTags(panel, message, reloaded = false) {
	// get tags:
	let prodTags = ext.config?.getTemplatingView('prod');
	let devTags = ext.config?.getTemplatingView('dev');
	let livePreviewTags = ext.config?.getTemplatingView('live-preview');
	let tags = [];

	let allKeys = new Set([
		...Object.keys(prodTags || {}),
		...Object.keys(devTags || {}),
		...Object.keys(livePreviewTags || {})
	]);

	for (let key of allKeys) {
		tags.push({
			key: key,
			prod: prodTags?.[key],
			dev: devTags?.[key],
			preview: livePreviewTags?.[key]
		});
	}
	logger.log(`getTemplatingTags():`, tags);

	postMessage(panel, {
		command: 'templatingInitialized',
		configurable: Config.isWorkspaceSet(),
		tags,
		saved: reloaded
	});
}

function handleTemplatingTags(panel, message) {
	// set tags:
	let prodTokens = {};
	let devTokens = {};
	let livePreviewTokens = {};

	message.tags.forEach(tag => {
		prodTokens[tag.key] = tag.prod;
		devTokens[tag.key] = tag.dev;
		livePreviewTokens[tag.key] = tag.preview;
	});
	ext.config?.setTemplatingView(prodTokens, devTokens, livePreviewTokens, true);

	telemetry.log(`templatingTagsSet`, {}, { count: message.tags?.length || -1 });
	// trigger templating tags update: (via init)
	getTemplatingTags(panel, message, true);
}

function loadChangelog(panel) {
	let changelog = file.load(Pathy.joinToSource(`./CHANGELOG.md`));
	let html = marked.parse(changelog);

	postMessage(panel, {
		command: 'changelogLoaded',
		changelog: html
	});

	telemetry.log(`changelogLoaded`, {});
}

function postMessage(targetPanel, message) {
	if (targetPanel && targetPanel.webview) {
		targetPanel.webview.postMessage(message);
	} else {
		logger.warn('postMessage: config panel is undefined/disposed.');
	}
}

module.exports = {
	showConfigPanel,
	isConfigPanelNeeded
};