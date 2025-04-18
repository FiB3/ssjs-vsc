const assert = require('assert');
const { describe, it, before, after } = require('mocha');
const path = require('path');
const fs = require('fs');

// Set up VSCode mock before requiring any modules
const { setupVSCodeMock, vscode } = require('../mocks/vscode');
setupVSCodeMock({ env: 'Development' });

// Now we can require the module
const BaseConfig = require('../../src/config/baseConfig');
const ContextHolder = require('../../src/config/contextHolder');

describe('BaseConfig', function () {
	before(() => {
		// Create test workspace directory if it doesn't exist
		const testWorkspacePath = path.join(__dirname, 'test-workspace');
		if (!fs.existsSync(testWorkspacePath)) {
			fs.mkdirSync(testWorkspacePath, { recursive: true });
		}
		ContextHolder.init(new vscode.ExtensionContext());
	});

	after(() => {
		// Clean up test workspace
		const testWorkspacePath = path.join(__dirname, 'test-workspace');
		if (fs.existsSync(testWorkspacePath)) {
			fs.rmSync(testWorkspacePath, { recursive: true, force: true });
		}
	});

	describe('#getExtensionVersion()', function () {
		it('should return the version of the extension', function () {
			// Read version directly from package.json instead of using vscode APIs
			const packageJsonPath = path.join(__dirname, '../../package.json');
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
			const version = `${packageJson.version}`;
			
			const extensionVersion = BaseConfig.getExtensionVersion();
			assert.equal(typeof(extensionVersion), 'string', 'Extension version is not a string');
			assert.match(extensionVersion, /^v?\d+\.\d+\.\d+$/gi, 'Extension version does not match expected format'); // matches "v1.2.3" or "1.2.3"
			assert.equal(extensionVersion, version, 'Extension version does not match expected version');
		});
	});

	describe('#parseVersion()', function () {
		it('should parse version string to numeric value', function () {
			const numericVersion = BaseConfig.parseVersion('v1.2.3');
			assert.equal(typeof(numericVersion), 'number');
			assert.equal(numericVersion, 10203);
		});
	});
});