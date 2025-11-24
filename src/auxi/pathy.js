const path = require('path');
const fs = require('fs');
const vscode = require('vscode');
const ContextHolder = require('../config/contextHolder');
/**
 * Pathy class to handle path operations.
 */
class Pathy {
  /**
	 * Get the path to the workspace.
	 * @returns {string} Path to the workspace, or false if not set.
	 */
  static getWorkspacePath() {
    const [workspaceFolder] = vscode.workspace.workspaceFolders || [];
    if (!workspaceFolder) {
        return false;
    }
    return workspaceFolder.uri.fsPath;
  }

  /**
   * Join paths. Works with string paths and VSCode URIs.
   * @param  {string|vscode.Uri} args - String paths or VSCode URIs to join.
   * Only first argument is required and is converted to absolute path (from workspace root).
   * @returns {string} joined path.
   */
  static join(...args) {
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

  /**
   * Join an array of path parts into a single path.
   * @param {string[]} pathArray - Array of path parts.
   * @returns {string} joined path.
   */
  static joinSimple(pathArray) {
    return pathArray.join(path.sep);
  }

  /**
   * Join to workspace root.
   * @param  {string|vscode.Uri} args - String paths or VSCode URIs to join.
   * Only first argument is required and is converted to absolute path (from workspace root).
   * @returns {string} joined path.
   */
  static joinToRoot(...args) {
    return Pathy.join(Pathy.getWorkspacePath(), ...args);
  }

  /**
   * Join to extension source folder.
   * @param  {string|vscode.Uri} args - String paths or VSCode URIs to join.
   * Only first argument is required and is converted to absolute path (from workspace root).
   * @returns {string} joined path.
   */
  static joinToSource(...args) {
    return Pathy.join(Pathy.getExtensionSourceFolder(), ...args);
  }

  /**
   * Split the file path into parts.
   * @param {string} filePath - Path to the file.
   * @returns {string[]} Array of parts.
   */
  static split(filePath) {
    return filePath.split(path.sep);
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

  /**
	 * Get the main (root) folder of the extension - where the package.json/extension.js is.
	 * @note this depends on location of this script!
	 * @returns {string} Path to the main folder of the extension.
	 */
  static getExtensionSourceFolder() {
    return ContextHolder.getContext().extensionUri.fsPath;
  }

  static getPackageJson() {
    return path.join(this.getExtensionSourceFolder(), 'package.json');
  }

  /**
   * Get the folder from a file path.
   * @param {string} filePath - Path to the file.
   * @returns {string} Folder of the file.
   */
  static getFolder(filePath) {
    return path.dirname(filePath);
  }

  /**
   * Get the extension of a file.
   * @param {string} filePath - Path to the file.
   * @returns {string} Extension of the file.
   */
  static extname(filePath) {
    return path.extname(filePath);
  }

  /**
   * Remove the suffix from the file path.
   * @param {string} filePath - Path to the file.
   * @returns {string} File path without the suffix.
   */
  static removeSuffix(filePath) {
    let extname = this.extname(filePath);
    if (extname) {
      let splitPath = filePath.split(extname);
      splitPath.pop();
      return splitPath.join(extname);
    }
    return filePath;
  }

  /**
   * Get the relative path from absolute path - relative to the workspace root.
   * @param {string} filePath - Path to the file
   * @returns {string} Relative path from the workspace root.
   */
  static getRelativePathToRoot(filePath) {
    if (path.isAbsolute(filePath)) {
      return path.relative(this.getWorkspacePath(), filePath);
    }
    return filePath;
  }

  /**
   * Check if the file path has an immediate root subfolder.
   * @param {string} filePath - Path to the file.
   * @param {string} subfolder - Subfolder to check.
   * @returns {boolean} True if the file path has the subfolder, false otherwise.
   */
  static hasDirectSubfolder(filePath, subfolder) {
    let filePathFromRoot = path.relative(this.getWorkspacePath(), filePath);

    let parts = filePathFromRoot.split(path.sep);
    return parts[0] === subfolder;
  }
}

module.exports = Pathy;