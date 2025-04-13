const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { describe, it, before, after } = require('mocha');

// Set up VSCode mock before requiring any modules
const { setupVSCodeMock, vscode } = require('../mocks/vscode');
setupVSCodeMock({ env: 'Development' });

// Now we can require the module
const Pathy = require('../../src/auxi/pathy');
const ContextHolder = require('../../src/config/contextHolder');

describe('Pathy', () => {
	mockContext = new vscode.ExtensionContext();
	ContextHolder.init(mockContext);
	const testDir = path.join(__dirname, 'test-files');
	const testFilePath = path.join(testDir, 'test.txt');
	const mockWorkspacePath = path.join(__dirname, 'test-workspace');

	before(() => {
		// Create test directories if they don't exist
		if (!fs.existsSync(testDir)) {
			fs.mkdirSync(testDir, { recursive: true });
		}
		if (!fs.existsSync(mockWorkspacePath)) {
			fs.mkdirSync(mockWorkspacePath, { recursive: true });
		}
		// Create a test file
		fs.writeFileSync(testFilePath, 'test content');
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

		// Clean up test workspace
		if (fs.existsSync(mockWorkspacePath)) {
			fs.rmSync(mockWorkspacePath, { recursive: true, force: true });
		}
	});

	describe('getWorkspacePath', () => {
		it('should return workspace path when workspace is open', () => {
			const result = Pathy.getWorkspacePath();
			assert.strictEqual(result, mockWorkspacePath);
		});

		it('should return false when no workspace is open', () => {
			// Temporarily mock no workspace
			const originalWorkspaceFolders = vscode.workspace.workspaceFolders;
			vscode.workspace.workspaceFolders = [];

			const result = Pathy.getWorkspacePath();
			assert.strictEqual(result, false);

			// Restore original workspace
			vscode.workspace.workspaceFolders = originalWorkspaceFolders;
		});
	});

	describe('join', () => {
		it('should join string paths correctly', () => {
			const result = Pathy.join('path', 'to', 'file');
			assert.strictEqual(result, path.join(mockWorkspacePath, 'path', 'to', 'file'));
		});

		it('should handle VSCode URI objects', () => {
			const uri = vscode.Uri.file('/base/path');
			const result = Pathy.join(uri, 'to', 'file');
			assert.strictEqual(result, '/base/path/to/file');
		});

		it('should handle absolute paths', () => {
			const result = Pathy.join('/absolute/path', 'to', 'file');
			assert.strictEqual(result, '/absolute/path/to/file');
		});

		it('should throw error for invalid first argument', () => {
			assert.throws(() => {
				Pathy.join(123, 'path', 'file');
			}, Error);
		});

		it('should handle single argument', () => {
			const result = Pathy.join('path');
			assert.strictEqual(result, path.join(mockWorkspacePath, 'path'));
		});

		it('should handle no arguments', () => {
			assert.throws(() => {
				Pathy.join();
			}, Error);
		});
	});

	describe('joinToRoot', () => {
		it('should join paths to workspace root', () => {
			const result = Pathy.joinToRoot('path', 'to', 'file');
			assert.strictEqual(result, path.join(mockWorkspacePath, 'path', 'to', 'file'));
		});

		it('should handle single argument', () => {
			const result = Pathy.joinToRoot('path');
			assert.strictEqual(result, path.join(mockWorkspacePath, 'path'));
		});

		it('should handle no arguments', () => {
			const result = Pathy.joinToRoot();
			assert.strictEqual(result, mockWorkspacePath);
		});
	});

	describe('exists', () => {
		it('should return true for existing file', () => {
			assert.strictEqual(Pathy.exists(testFilePath), true);
		});

		it('should return true for existing directory', () => {
			assert.strictEqual(Pathy.exists(testDir), true);
		});

		it('should return false for non-existent path', () => {
			assert.strictEqual(Pathy.exists(path.join(testDir, 'non-existent.txt')), false);
		});

		it('should handle invalid path', () => {
			assert.strictEqual(Pathy.exists(null), false);
		});
	});

	describe('getExtensionSourceFolder', () => {
		it('should return extension source folder path', () => {
			const result = Pathy.getExtensionSourceFolder();
			assert.strictEqual(result, path.resolve(__dirname, '../..'));
		});
	});

	describe('getPackageJson', () => {
		it('should return package.json path', () => {
			const result = Pathy.getPackageJson();
			assert.strictEqual(result, path.join(Pathy.getExtensionSourceFolder(), 'package.json'));
		});
	});
}); 