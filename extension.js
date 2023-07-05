// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');

const { app } = require('./src/proxy');
const jsonHandler = require('./src/jsonHandler');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Congratulations, your extension "ssjs-vsc" is now active!');
	// Start server:
	let serverStart = vscode.commands.registerCommand('ssjs-vsc.start', startServer);
	// Stop server:
	let serverStop = vscode.commands.registerCommand('ssjs-vsc.stop', stopServer);

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
}

const startServer = function () {
	// TODO: get settings file from project folder:
	const projectFolderPath = vscode.workspace.rootPath; // TODO: improve with e.g.: workspace.workspaceFolders
	const setupFile = 'setup.json'; // TODO: get from setup, maybe put to .vscode folder?

	const configPath = path.join(projectFolderPath, setupFile);
	const config = jsonHandler.load(configPath);
	config.projectPath = projectFolderPath;

	console.log(`Project folder path: ${configPath}.`);

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

module.exports = {
	activate,
	deactivate
}
