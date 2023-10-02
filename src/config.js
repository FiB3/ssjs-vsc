const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

const jsonHandler = require('./auxi/json'); // TODO: change to `json` only
const folder = require('./auxi/folder');

const SETUP_TEMPLATE = './templates/setup.example.json';
const SETUP_FILE_NAME = '.vscode/ssjs-setup.json';

module.exports = class Config {

	constructor(context) {
		this.context = context;

		this.config = {};

		// this.runWatch();
	}

	getAnyMainPath() {
		
	}


	async getSfmcInstanceData() {
		const config = this.loadConfig();
	
		const subdomain = config['sfmc-domain'];
		const clientId = config['sfmc-client-id'];
		const mid = config['sfmc-mid'];
		let clientSecret = await context.secrets.get(`ssjs-vsc.${clientId}`);
		return {
			subdomain,
			clientId,
			mid,
			clientSecret
		};
	}

	async storeSfmcClientSecret(clientId, clientSecret) {
		await this.context.secrets.store(`ssjs-vsc.${clientId}`, clientSecret);
		console.log(`Credentials stored.`);
	}

	createConfigFile(subdomain, clientId, mid, publicDomain) {
		const templatePath = path.join(__dirname, SETUP_TEMPLATE);
	
		let configTemplate = jsonHandler.load(templatePath);
		console.log(configTemplate);
		configTemplate["sfmc-domain"] = subdomain;
		configTemplate["sfmc-client-id"] = clientId;
		configTemplate["sfmc-mid"] = mid;
		configTemplate["public-domain"] = publicDomain;
		// security:
		configTemplate["proxy-any-file"]["auth-username"] = "user";
		configTemplate["proxy-any-file"]["auth-password"] = generator.generate({ length: 16, numbers: true });
		configTemplate["proxy-any-file"]["dev-token"] = uuidv4();
		
		const setupFolder = path.join(this.getUserWorkspacePath(), SETUP_FOLDER_NAME);
		folder.create(setupFolder);
	
		jsonHandler.save(this.getUserConfigPath(), configTemplate);
		
		vscode.workspace.openTextDocument(this.getUserConfigPath());
	}

	updateConfigFile(subdomain, clientId, mid) {
		// get current setup:
		let configTemplate = jsonHandler.load(this.getUserConfigPath()); // TODO: handle non-existing file
		console.log(configTemplate);
		// update values:
		configTemplate["sfmc-domain"] = subdomain;
		configTemplate["sfmc-client-id"] = clientId;
		configTemplate["sfmc-mid"] = mid;
		// save:
		jsonHandler.save(this.getUserConfigPath(), configTemplate);
		
		vscode.workspace.openTextDocument(this.getUserConfigPath());
	}
	
	loadConfig() {
		const configPath = this.getUserConfigPath();
		const config = jsonHandler.load(configPath);
		// TODO: error if config is not yet deployed!
		if (config.error) {
			throw `No SSJS Setup File found. Use "create-config" command to create the ${SETUP_FILE_NAME} file.`;
		}
		config.projectPath = this.getUserWorkspacePath();
		this.config = config;

		return config;
	}
	
	getUserConfigPath() {
		let pth;
		try {
			pth = path.join(this.getUserWorkspacePath(), SETUP_FILE_NAME);
		} catch (err) {
			console.log(`PATH NOT SET! Data:`, this.getUserWorkspacePath(), SETUP_FILE_NAME);
		}
		return pth;
	}
	
	getUserWorkspacePath () {
		// TODO: improve with e.g.: workspace.workspaceFolders
		return vscode.workspace.rootPath;
	}

	runWatch() {
		// this.watcher = fs.watchFile(SETUP_FILE_NAME, (curr, prev) => {
		// 	console.log('Change:', curr, prev);
		// 	if (curr.mtime !== prev.mtime) {
		// 		// File has been modified
		// 		vscode.window.showInformationMessage(`File ${SETUP_FILE_NAME} has been modified.`);
		// 	}
		// });

		// https://code.visualstudio.com/api/references/vscode-api#FileSystemWatcher
		// this.watcher = vscode.workspace.createFileSystemWatcher(SETUP_FILE_NAME);
		// this.watcher.onDidChange(uri => { 
		// 	console.log('Change:', uri);
		// 	vscode.window.showInformationMessage(`File ${uri} has been modified.`);
		// });

		// let watcher;
		// watcher = fs.watchFile('.vscode/ssjs-setup.json', (curr, prev) => {
		// 	console.log('Change:', curr, prev);
		// 	if (curr.mtime !== prev.mtime) {
		// 		// File has been modified
		// 		vscode.window.showInformationMessage(`File ${SETUP_FILE_NAME} has been modified.`);
		// 	}
		// });
	}
}