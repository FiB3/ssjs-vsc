const { suite, test } = require('mocha');
const assert = require('assert');
const vscode = require('vscode');

suite('Extension Test Suite', () => {
  test('Extension should be available', () => {
    const extension = vscode.extensions.getExtension('FiB.ssjs-vsc');
    assert.ok(extension, 'Extension should be present');
  });
});