const path = require('path');
const fs = require('fs');
const vscode = require('vscode');

/**
 * Pathy class to handle path operations.
 */
class Pathy {

  // TODO: TEST
  // TODO: replace the Config.getUserWorkspacePath()
  /**
	 * Get the path to the workspace.
	 * @returns {string} Path to the workspace, or false if not set.
	 */
  static getWorkspacePath() {
    const [workspaceFolder] = vscode.workspace.workspaceFolders || [];
    if (!workspaceFolder) {
        return false;
    }
    // console.log('Pathy.getWorkspacePath():', workspaceFolder);
    return workspaceFolder.uri.fsPath;
  }

  // TODO: TEST
  // TODO: replace path.join
  /**
   * Join paths. Works with string paths and VSCode URIs.
   * @param  {string|vscode.Uri} args - String paths or VSCode URIs to join.
   * Only first argument is required and is converted to absolute path (from workspace root).
   * @returns {string} joined path.
   */
  static join(...args) {
    // console.log('pathy.join:', args, '=>', args[0]);
    let firstArg = args[0];
    if (typeof firstArg !== 'string' && !firstArg?.fsPath) {
      throw new Error(`First argument must be a string or a VSCode URI, not: ${typeof firstArg} /`, firstArg);
    } else if (firstArg?.fsPath) {
      firstArg = firstArg.fsPath;
    }
    // Convert relative path to absolute
    if (!path.isAbsolute(firstArg)) {
      firstArg = this.joinToRoot(firstArg);
    }
    args[0] = firstArg;
    
    return path.join(...args);
  }

  // TODO: TEST
  // TODO: replace other similar methods with this one
  static joinToRoot(...args) {
    return Pathy.join(Pathy.getWorkspacePath(), ...args);
  }

  /**
   * Check if a file or directory exists at the given path
   * @param {string} filePath - Path to check
   * @returns {boolean} True if file/directory exists, false otherwise
   */
  static exists(filePath) {
    try {
      return fs.statSync(filePath).isFile() || fs.statSync(filePath).isDirectory();
    } catch (err) {
      return false;
    }
  }

  // TODO: TEST
  // TODO: replace the Config.getExtensionSourceFolder()
  /**
	 * Get the main (root) folder of the extension - where the package.json/extension.js is.
	 * @note this depends on location of this script!
	 * @returns {string} Path to the main folder of the extension.
	 */
  static getExtensionSourceFolder() {
    return path.join(__dirname, '../..');
  }

  static getPackageJson() {
    return path.join(this.getExtensionSourceFolder(), 'package.json');
  }
}

module.exports = Pathy;