const vscode = require('vscode');
const telemetry = require('./telemetry');

const BEAUTY_AMP_ID = 'FiB.beautyAmp';

module.exports = {

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