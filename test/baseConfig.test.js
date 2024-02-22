const assert = require('chai').assert;
const BaseConfig = require('../path/to/baseConfig'); // adjust the path to your baseConfig.js file

describe('BaseConfig', function() {
    describe('#getExtensionVersion()', function() {
        it('should return the version of the extension', function() {
            const version = BaseConfig.getExtensionVersion();
            assert.isString(version);
            assert.match(version, /^v?\d+\.\d+\.\d+$/); // matches "v1.2.3" or "1.2.3"
        });
    });

    describe('#parseVersion()', function() {
        it('should parse version string to numeric value', function() {
            const numericVersion = BaseConfig.parseVersion('v1.2.3');
            assert.isNumber(numericVersion);
            assert.equal(numericVersion, 10203);
        });
    });
});