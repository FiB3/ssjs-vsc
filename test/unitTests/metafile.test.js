const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { describe, it, before, after } = require('mocha');
const Metafile = require('../../src/code/metafile');
const logger = require('../../src/auxi/logger');

describe('Metafile', () => {
    const testDir = path.join(__dirname, 'test-files');
    const testFilePath = path.join(testDir, 'test.ssjs');
    const testMetadataPath = path.join(testDir, '.test.ssjs-ssjs-vsc.json');

    logger.setup('INFO', false);

    before(() => {
        // Create test directory if it doesn't exist
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
    });

    after(() => {
        // Clean up test files
        if (fs.existsSync(testDir)) {
            // Remove all files in the directory
            const files = fs.readdirSync(testDir);
            files.forEach(file => {
                const filePath = path.join(testDir, file);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
            // Then remove the directory
            fs.rmdirSync(testDir);
        }
    });

    describe('getFileName', () => {
        it('should return correct metadata file path', () => {
            const expectedPath = path.join(path.dirname(testFilePath), '.test.ssjs-ssjs-vsc.json');
            assert.strictEqual(Metafile.getFileName(testFilePath), expectedPath);
        });
    });

    describe('getBlockName', () => {
        it('should return correct block name', () => {
            assert.strictEqual(Metafile.getBlockName(testFilePath), 'test.ssjs-ssjs-vsc');
        });
    });

    describe('isValid', () => {
        it('should validate regular metadata correctly', () => {
            const validMetadata = { id: '123', name: 'test' };
            const invalidMetadata = { id: '123' };
            assert.strictEqual(Metafile.isValid(validMetadata), true, 'Valid metadata should be valid');
            assert.strictEqual(Metafile.isValid(invalidMetadata), false, 'Invalid metadata should be invalid');
        });

        it('should validate linked metadata correctly', () => {
            const validLinkedMetadata = { linkedPath: 'path/to/file.ssjs' };
            const invalidLinkedMetadata = { linkedPath: '' };
            assert.strictEqual(Metafile.isValid(validLinkedMetadata), true, 'Valid linked metadata should be valid');
            assert.strictEqual(Metafile.isValid(invalidLinkedMetadata), false, 'Invalid linked metadata should be invalid');
        });

        it('should validate asset server metadata correctly', () => {
            const validServerMetadata = { provideAs: 'server' };
            const invalidServerMetadata = { provideAs: '' };
            assert.strictEqual(Metafile.isValid(validServerMetadata), true, 'Valid server metadata should be valid');
            assert.strictEqual(Metafile.isValid(invalidServerMetadata), false, 'Invalid server metadata should be invalid');
        });

        it('should return false for metadata with error', () => {
            const errorMetadata = { id: '123', name: 'test', error: true };
            assert.strictEqual(Metafile.isValid(errorMetadata), false, 'Metadata with error should be invalid');
        });
    });

    describe('isLinked', () => {
        it('should return false for non-linked metadata', () => {
            const nonLinkedMetadata = { id: '123', name: 'test' };
            assert.strictEqual(Metafile.isLinked(nonLinkedMetadata), false, 'Non-linked metadata should be invalid');
        });

        it('should return false for metadata without linkedPath', () => {
            const metadataWithoutPath = { id: '123', name: 'test', linkedPath: null };
            assert.strictEqual(Metafile.isLinked(metadataWithoutPath), false, 'Metadata without linkedPath should be invalid');
        });

        it('should return false for metadata with empty linkedPath', () => {
            const metadataWithEmptyPath = { id: '123', name: 'test', linkedPath: '' };
            assert.strictEqual(Metafile.isLinked(metadataWithEmptyPath), false, 'Metadata with empty linkedPath should be invalid');
        });
    });

    describe('exists', () => {
        it('should return false for non-existent file', () => {
            assert.strictEqual(Metafile.exists(testFilePath), false, 'Non-existent file should be invalid');
        });

        it('should return true for existing file', () => {
            // Create a test metadata file
            fs.writeFileSync(testMetadataPath, JSON.stringify({ id: '123', name: 'test' }));
            assert.strictEqual(Metafile.exists(testFilePath), true, 'Existing file should be valid');
        });
    });

    describe('upsert', () => {
        it('should create new metadata file if it does not exist', () => {
            const newData = { id: '123', name: 'test' };
            Metafile.upsert(testFilePath, newData);
            assert.strictEqual(Metafile.exists(testFilePath), true, 'New file should be valid');
            
            const savedData = JSON.parse(fs.readFileSync(testMetadataPath, 'utf8'));
            assert.deepStrictEqual(savedData, newData, 'New file should be valid');
        });

        it('should update existing metadata file', () => {
            const initialData = { id: '123', name: 'test' };
            const updateData = { id: '123', name: 'updated' };
            
            // Create initial metadata
            fs.writeFileSync(testMetadataPath, JSON.stringify(initialData));
            
            // Update metadata
            Metafile.upsert(testFilePath, updateData);
            
            const savedData = JSON.parse(fs.readFileSync(testMetadataPath, 'utf8'));
            assert.deepStrictEqual(savedData, updateData, 'Updated file should be valid');
        });

        it('should handle data from request body', () => {
            const requestData = { body: { id: '123', name: 'test' } };
            Metafile.upsert(testFilePath, requestData);
            
            const savedData = JSON.parse(fs.readFileSync(testMetadataPath, 'utf8'));
            assert.deepStrictEqual(savedData, requestData.body, 'Request data should be valid');
        });
    });

    describe('getDeploymentFileName', () => {
        it('should return correct deployment file path for page context', () => {
            assert.strictEqual(Metafile.getDeploymentFileName('page'), './.vscode/deploy.me.page.ssjs');
        });

        it('should return correct deployment file path for text context', () => {
            assert.strictEqual(Metafile.getDeploymentFileName('text'), './.vscode/deploy.me.text.ssjs');
        });
    });

    describe('getDevAssetFileName', () => {
        it('should return correct dev asset file path for page context', () => {
            assert.strictEqual(Metafile.getDevAssetFileName('page'), './.vscode/devAsset.page.ssjs');
        });

        it('should return correct dev asset file path for text context', () => {
            assert.strictEqual(Metafile.getDevAssetFileName('text'), './.vscode/devAsset.text.ssjs');
        });
    });
}); 