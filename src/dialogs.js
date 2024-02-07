const vscode = require('vscode');
const checks = require('./checks');

const DEV_FOLDER_PROMPT_TITLE = `Create Dev Assets Folder`;
const DEV_PAGE_PROMPT_TITLE = `Set up Dev Cloud Page`;

module.exports = {

	/**
	 * Ask user to confirm, that pre-install setup is done.
	 */
	async confirmPreInstallSetup() {
		let items = [
			`...run and finished 'SSJS: Create Config' command successfully.`,
			`...either a valid Cloud Page URL for Dev.`,
			`...or a valid Text Resource URL for my Dev (or both).`,
			`...a folder in Content Builder.`
		];
		const selected = await vscode.window.showQuickPick(items, {
			title: `Pre-Install Checklist`,
			prompt: `Confirm all that you have setup.`,
			placeHolder: 'I have...',
			canPickMany: true,
			ignoreFocusOut: true
		});

		console.log(`User confirmed options:`, selected);
		if (!Array.isArray(selected) || selected.length < 3) {
			vscode.window.showWarningMessage(`Finish steps to be able to continue. You can see all of them by running "SSJS: Show Setup Walkthrough" command (CTRL/CMD + SHIFT + P).`);
			return false;
		} else if (selected.length < items.length) {
			if (
				selected.includes(items[0])
					&& (selected.includes(items[1]) || selected.includes(items[2]))
					&& selected.includes(items[3])
			) {
				return true;
			}
			else {
				vscode.window.showWarningMessage(`You need to finish at least steps 1, 2 and/or 3 & 4. See walkthrough by running command: "SSJS: Show Setup Walkthrough".`);
				return false;
			}
		} else {
			return true;
		}
	},

	/**
	 * Ask user to pick a folder name for the Dev Folder.
	 * @returns {Promise<string|boolean>}
	 */
	async getDevFolderName() {
		const folderName = await vscode.window.showInputBox({
			title: DEV_FOLDER_PROMPT_TITLE,
			prompt: `Enter name for your new Dev Folder in Content Builder:`,
			placeHolder: "New Folder name - shouldn't exist within your Content Builder.",
			ignoreFocusOut: true
		});
		return folderName || false;
	},

	/**
	 * Ask user to pick parent folder's name for the Dev Folder.
	 * @returns {Promise<string|boolean>}
	 */
	async getDevFolderParentName() {
		const parentFolderName = await vscode.window.showInputBox({
			title: DEV_FOLDER_PROMPT_TITLE,
			prompt: `Enter Parent Folder Name for Dev Assets (in Content Builder):`,
			placeHolder: "Existing Folder name.",
			ignoreFocusOut: true
		});
		return parentFolderName || false;
	},

	/**
	 * Ask user to select the type of the Dev Page.
	 * @returns {Promise<array|boolean>} Selected authentication types in array: 'token' or 'basic'. False if none selected.
	 */
	async getDevPageOptions() {
		const cloudPageOptions = ['Both', 'Cloud Page', 'Text Resource'];
		const selected = await vscode.window.showQuickPick(cloudPageOptions, {
			title: DEV_PAGE_PROMPT_TITLE,
			prompt: `Select the type of authentication to use for the Cloud Page/Resource.`,
			placeHolder: 'Do I want to develop in Cloud Page and/or Text Resource?',
			ignoreFocusOut: true
		});

		if (!selected) { return false; }
		if (selected == 'Cloud Page') {
			return [ 'page' ];
		} else if (selected == 'Text Resource') {
			return [ 'text' ];
		}
		return [ 'page', 'text'];
	},

	/**
	 * Ask user for selection of the authentication type to use for the Dev Page.
	 * @returns {Promise<string|boolean>} Selected authentication type: 'token' or 'basic'. False if none selected.
	 */
	async getAuthOptions() {
		const authOptions = ['Token-Protected', 'Basic-Auth', 'None'];
		const selected = await vscode.window.showQuickPick(authOptions, {
			title: DEV_PAGE_PROMPT_TITLE,
			prompt: `Select the type of authentication to use for the Cloud Page/Resource.`,
			placeHolder: 'Select an option',
			ignoreFocusOut: true
		});

		if (!selected) { return false; }
		if (selected == 'Basic-Auth') {
			return 'basic';
		} else if (selected == 'None') {
			return 'none';
		}
		return 'token';
	},

	async getDevPageUrl(devPageContext = 'page') {
		let devPageContextName = this.getFriendlyDevContext(devPageContext);

		let cloudPageUrl = await vscode.window.showInputBox({
			title: `${devPageContextName} URL`,
			prompt: `Create a new ${devPageContextName} for Dev in SFMC and paste the URL here.`,
			placeHolder: `Dev ${devPageContextName} URL`,
			ignoreFocusOut: true,
			validateInput: (text) => {
				if (!checks.isUrl(text)) {
					return `Please, enter a valid URL with https protocol.`;
				}
				return null;
			}
		});
		return cloudPageUrl || false;
	},

	getFriendlyDevContext(devPageContext = 'page') {
		return devPageContext == 'page' ? 'Cloud Page' : 'Text Resource';
	}
}