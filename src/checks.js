const vscode = require('vscode');

const BEAUTY_AMP_ID = 'FiB.beautyAmp';

module.exports = {
	beautyAmpEnabled: () => {
		const extension = vscode.extensions.getExtension(BEAUTY_AMP_ID);
		if (extension) {
			console.log(`Extension ${BEAUTY_AMP_ID} IS installed and enabled.`);
			// console.log(`IsActive()`, extension.isActive, '.');
			return true;
		} else {
			console.log(`Extension ${BEAUTY_AMP_ID} IS NOT installed nor enabled.`);
			return false;
		}
	}
}