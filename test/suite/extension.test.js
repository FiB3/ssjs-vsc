const assert = require('assert');

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const vscode = require('vscode');
// const myExtension = require('../extension');

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Extension should be available', () => {
		const extension = vscode.extensions.getExtension('FiB.ssjs-vsc');
		assert(extension);
});
});
