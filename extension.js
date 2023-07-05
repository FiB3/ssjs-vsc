// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const { app } = require('./src/proxy');
const jsonHandler = require('./src/auxi/json');
const file = require('./src/auxi/file');
const folder = require('./src/auxi/folder');


const SETUP_TEMPLATE = './templates/setup.example.json';
const SETUP_FOLDER_NAME = '.vscode';
const SETUP_FILE_NAME = 'setup.json';
/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Congratulations, your extension "ssjs-vsc" is now active!');
	// Start server:
	let serverStart = vscode.commands.registerCommand('ssjs-vsc.start', startServer);
	// Stop server:
	let serverStop = vscode.commands.registerCommand('ssjs-vsc.stop', stopServer);
	
	// Create setup file:
	let createSetup = vscode.commands.registerCommand('ssjs-vsc.create-config', createConfig);

	// let disposable2 = vscode.commands.registerCommand('ssjs-vsc.set-config', () => {
	// 	const projectFolderPath = vscode.workspace.rootPath;
	// 	console.log(`Project folder path: ${projectFolderPath}`);

    //     // const workspaceFolders = vscode.workspace.workspaceFolders;
	// 	// console.log('Workspace:', workspaceFolders);

    //     // if (workspaceFolders) {
    //     //     const folder = vscode.window.showWorkspaceFolderPick();

    //     //     if (folder) {
    //     //         const config = vscode.workspace.getConfiguration('', folder.uri);
    //     //         config.update('myExtension.setting', 'myValue', vscode.ConfigurationTarget.WorkspaceFolder);
    //     //     }
    //     // }
	// 	// vscode.window.showInformationMessage('Hello World from SSJS 2!!');
    // });

	context.subscriptions.push(serverStart);
	context.subscriptions.push(serverStop);
	context.subscriptions.push(createSetup);
}

const createConfig = function () {
	// TODO: create a setup file from a ./files
	// maybe use some confirming dialog??
	const configPath = getUserWorkspacePath();
	const templatePath = path.join(__dirname, SETUP_TEMPLATE);

	let configTemplate = file.load(templatePath);
	
	const setupFolder = path.join(getUserWorkspacePath(), SETUP_FOLDER_NAME);
	folder.create(setupFolder);

	file.save(getUserConfigPath(), configTemplate);
}

const startServer = function () {
	const configPath = getUserConfigPath();
	const config = jsonHandler.load(configPath);
	// TODO: error if config is not yet deployed!
	config.projectPath = getUserWorkspacePath();

	console.log(`Project folder path: ${config.projectPath}.`);

	// The code you place here will be executed every time your command is executed
	if (!app.running) {
		app.build(config);
		// Display a message box to the user
		vscode.window.showInformationMessage(`SSJS Server started on: ${app.host}:${app.port}`);
	} else {
		vscode.window.showInformationMessage(`SSJS Server already running: ${app.host}:${app.port}`);
	}
};

const stopServer = function () {
	console.log(`Attempting to stop the SSJS Server.`);
	if (app.running) {
		app.close();
		vscode.window.showInformationMessage(`SSJS Server stopped.`);
	} else {
		vscode.window.showInformationMessage(`SSJS Server not active.`);
	}
};

// This method is called when your extension is deactivated
function deactivate() {
	console.log(`Deactivating extension!`);
	stopServer();
}

const getUserConfigPath = function () {
	const pth = path.join(getUserWorkspacePath(), SETUP_FOLDER_NAME, SETUP_FILE_NAME);
	return pth;
}

const getUserWorkspacePath = function () {
	// TODO: improve with e.g.: workspace.workspaceFolders
	return vscode.workspace.rootPath;
}

module.exports = {
	activate,
	deactivate
}
