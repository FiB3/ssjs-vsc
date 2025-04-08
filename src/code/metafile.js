const vscode = require('vscode');
const path = require('path');

const Config = require('../config');
const file = require('../auxi/file');
const json = require('../auxi/json');
const Pathy = require('../auxi/pathy');
const logger = require('../auxi/logger');

class Metafile {
  /**
	 * Load metadata file for the asset.
	 * Returns the real/resolved metadata file, if current file is linked.
	 * @param {string} filePath path of the script file (not metadata file)
	 * @returns {object} metadata object, null if not found or invalid.
   * @throws {Error} if metadata file is not found or invalid.
	 */
	static load(filePath) {
		let metaPath = this.getFileName(filePath);

		let metadata = json.load(metaPath);
		logger.debug(`metadata-path: ${metaPath}, metadata:`, metadata);
		let islinkedMetadata = this.isLinked(metadata);
		if (islinkedMetadata === true) {
			let linkedScriptPath = this.getLinkedScriptPath(metadata);
			logger.debug(`Linked metadata found: ${linkedScriptPath}`);
			let linkedMetaPath = this.getFileName(linkedScriptPath);
			return json.load(linkedMetaPath);
		} else if (islinkedMetadata === null) {
			logger.debug(`Linked metadata, but file does not exist!`);
			vscode.window.showWarningMessage(`Linked metadata file does not exist!`);
			return null;
		}	else if (!this.isValid(metadata)) {
			logger.debug(`Invalid metadata found: ${metaPath}`);
			return null;
		}
		return metadata;
	}

  /**
   * Upsert metadata file for the asset.
   * Does not follow the linked metadata path!
   * @param {string} filePath path of the script file (not metadata file)
   * @param {object} data data from asset creation/update request.
   */
  static upsert(filePath, data) {
    // if data is from request, convert:
    let dt = data.body ? data.body : data;

    // Get the metadata file path
    const metaPath = this.getFileName(filePath);

    if (Metafile.exists(filePath)) {
      // load, merge, save
      let meta = json.load(metaPath);
      dt = {
        ...meta,
        ...dt
      };
    }
    json.save(metaPath, dt);
  }

	/**
	 * Delete metadata file for the asset.
	 * @param {*} filePath 
	 */
	static delete(filePath) {
		file.delete(metaFile);
	}

  /**
	 * Checks if assets exists based on asset-metadata file existence.
	 * @param {string} filePath 
	 * @returns {boolean}
	 */
	static exists(filePath) {
		const p = this.getFileName(filePath);
		logger.log(`assetExists:`, p, '. exists?', file.exists(p));
		return file.exists(p);
	}

  /**
	 * Is metadata valid?
	 * @param {object} content file content as object
	 * @returns {boolean} true if metadata is valid, false if not.
	 */
	static isValid(data) {
    if (!data) {
      return false;
    }
    
    const hasRegularMetadata = Boolean(data.id && data.name);
    const hasLinkedMetadata = Boolean(data.linkedPath);
    const hasServerMetadata = Boolean(data.provideAs);
    const hasNoError = data.error === undefined;

    return (hasRegularMetadata || hasLinkedMetadata || hasServerMetadata) && hasNoError;
	}

	/**
	 * Save metadata for file in different folder.
	 * @param {string} filePath file of current script.
	 * @param {string} linkedPath file of linked script.
	 */
	static saveLinkedMetadata(filePath, linkedPath) {
		let dt = {
			linkedPath: linkedPath
		};
		const metadataPath = Metafile.getFileName(filePath);
		logger.debug(`linked-metadata-path: ${metadataPath}`);
		json.save(metadataPath, dt);
	}

  /**
	 * Check if the file has linked metadata.
	 * @param {object} content file content
	 * @returns {boolean|null} true if linked metadata exists,
	 * false if does not exist, null if linked file does not exist.
	 */
	static isLinked(content) {
		if (!content?.linkedPath) {
			return false
		}
		let fPath = this.getLinkedScriptPath(content);
		logger.debug(`Metafile.isLinked:`, fPath, ', exists:',file.exists(fPath));
		return content.linkedPath && content.linkedPath.length > 0 && file.exists(fPath)
				? true : false;
	}

  /**
	 * Get name of metadata file for the given script file.
	 * ./script.ssjs => ./.script.ssjs-ssjs-vsc.json
	 * Does return the direct metadata path, linked or not.
	 * @param {string} filePath absolute path of the given script file
	 * @returns {string} path of the metadata file. 
	 */
	static getFileName(filePath) {
		return Pathy.join(path.dirname(filePath), `.${this.getBlockName(filePath)}.json`);
	}

  /**
	 * Get linked script path from metadata.
	 * NOTE: use .getMetadataFileName() to get metadata file path from script file path.
	 * @param {*} content 
	 * @returns 
	 */
	static getLinkedScriptPath(content) {
		return Pathy.joinToRoot(content.linkedPath);
	}

	static getBlockName(filePath) {
		let fName = path.basename(filePath);
		return `${fName}-ssjs-vsc`;
	}

	/**
	 * Get name of deployment file for the given script file - for manual deployment.
	 * @param {string} devPathContext 
	 * @returns {string} path of the deployment file within VSCode workspace.
	 */
	static getDeploymentFileName(devPathContext = 'page') {
		return `./.vscode/deploy.me.${devPathContext}.ssjs`;
	}

	/**
	 * Get name of dev asset file for the given script file - automatic deployment.
	 * @param {string} devPathContext 
	 * @returns {string} path of the deployment file within VSCode workspace.
	 */
	static getDevAssetFileName(devPathContext = 'page') {
		return `./.vscode/devAsset.${devPathContext}.ssjs`;
	}
}

module.exports = Metafile;
