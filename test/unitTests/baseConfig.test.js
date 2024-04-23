const assert = require('assert');
const { describe, it } = require('mocha');

const BaseConfig = require('../../src/config/baseConfig'); // adjust the path to your baseConfig.js file

describe('BaseConfig', function () {
	describe('#getExtensionVersion()', function () {
		it('should return the version of the extension', function () {
			const version = BaseConfig.getExtensionVersion();
			assert.equal(typeof(version), 'string');
			assert.match(version, /^v?\d+\.\d+\.\d+$/); // matches "v1.2.3" or "1.2.3"
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