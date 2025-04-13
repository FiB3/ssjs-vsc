const assert = require('assert');
const { describe, it, before, after, beforeEach } = require('mocha');
const path = require('path');
const fs = require('fs');

// Set up VSCode mock before requiring any modules
const { setupVSCodeMock, vscode } = require('../mocks/vscode');
setupVSCodeMock({ env: 'Development' });

// Now we can require the module
const SourceCode = require('../../src/code/sourceCode');

describe('SourceCode', function () {
    const testWorkspacePath = path.join(__dirname, 'test-workspace');
    const testFilePath = 'test.js';
    const testContent = 'console.log("test");';

    before(() => {
        // Create test workspace directory
        if (!fs.existsSync(testWorkspacePath)) {
            fs.mkdirSync(testWorkspacePath, { recursive: true });
        }
    });

    after(() => {
        // Clean up test workspace directory
        if (fs.existsSync(testWorkspacePath)) {
            fs.rmSync(testWorkspacePath, { recursive: true, force: true });
        }
    });

    beforeEach(() => {
        // Clean up any test files before each test
        const fullPath = path.join(testWorkspacePath, testFilePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    });

    describe('#save()', function () {
        it('should save content to a file', function () {
            const savedPath = SourceCode.save(testFilePath, testContent);
            const fullPath = path.join(testWorkspacePath, testFilePath);
            
            assert.strictEqual(savedPath, fullPath, 'Returned path should match expected path');
            assert(fs.existsSync(fullPath), 'File should exist');
            assert.strictEqual(fs.readFileSync(fullPath, 'utf8'), testContent, 'File content should match');
        });

        it('should handle absolute paths', function () {
            const absolutePath = path.join(testWorkspacePath, 'absolute.js');
            const savedPath = SourceCode.save(absolutePath, testContent);
            
            assert.strictEqual(savedPath, absolutePath, 'Returned path should match absolute path');
            assert(fs.existsSync(absolutePath), 'File should exist');
            assert.strictEqual(fs.readFileSync(absolutePath, 'utf8'), testContent, 'File content should match');
        });
    });

    describe('#load()', function () {
        it('should load content from a file', function () {
            // Create test file
            const fullPath = path.join(testWorkspacePath, testFilePath);
            fs.writeFileSync(fullPath, testContent);

            const loadedContent = SourceCode.load(testFilePath);
            assert.strictEqual(loadedContent, testContent, 'Loaded content should match');
        });

        it('should handle absolute paths', function () {
            const absolutePath = path.join(testWorkspacePath, 'absolute.js');
            fs.writeFileSync(absolutePath, testContent);

            const loadedContent = SourceCode.load(absolutePath);
            assert.strictEqual(loadedContent, testContent, 'Loaded content should match');
        });

        it('should handle VSCode Uri input', function () {
            const fullPath = path.join(testWorkspacePath, testFilePath);
            fs.writeFileSync(fullPath, testContent);

            const uri = vscode.Uri.file(fullPath);
            const loadedContent = SourceCode.load(uri);
            assert.strictEqual(loadedContent, testContent, 'Loaded content should match');
        });
    });
}); 