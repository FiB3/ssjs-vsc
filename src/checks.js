const vscode = require('vscode');
const path = require('path');
const telemetry = require('./telemetry');

const BEAUTY_AMP_ID = 'FiB.beautyAmp';
const USABLE_EXT = [ `.ssjs`, `.html`, `.amp` ];

module.exports = {

	/**
	 * Check if the file is supported for deployment.
	 * @param {string} filePath
	 * @param {boolean} showWarning shows warning message if file is not supported
	 * @returns {boolean} true if file is supported, false otherwise.
	 */
	isFileSupported: (filePath, showWarning = true) => {
		if (USABLE_EXT.includes(path.extname(filePath))) {
			return true;
		}
		if (showWarning) {
			vscode.window.showWarningMessage(`File *${path.extname(filePath)} is not supported!`);
		}
		return false;
	},

	beautyAmpEnabled: () => {
		const extension = vscode.extensions.getExtension(BEAUTY_AMP_ID);
		telemetry.log(`BeautyAmpCheck`, { isActive: extension ? true : false });
		if (extension) {
			return true;
		} else {
			return false;
		}
	},

	isUrl(str) {
		const urlPattern = /^(https?:\/\/)([\w.-]+)\.([a-z]{2,})(\/\S*)?$/i;
		return urlPattern.test(str);
	}
}