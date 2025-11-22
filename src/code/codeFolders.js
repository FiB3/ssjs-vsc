const logger = require('../auxi/logger');
const json = require('../auxi/json');
const folder = require('../auxi/folder');
const Pathy = require('../auxi/pathy');
const ContextHolder = require('../config/contextHolder');

/**
 * Handler for folders containing code from SFMC.
 * Made to handle based on a specific object type (e.g. Content Blocks, Scripts...).
 * Fetches folders from SFMC, builds or updates local folder structure.
 */
module.exports = class CodeFolders {

	/**
	 * 
	 * @param {string} objectType `asset` for Content Builder, `script` for SSJS scripts (future)
	 * @param {McClient} mcClient SFMC client instance
	 */
	constructor(objectType, mcClient) {
		this.objectType = objectType;
		this.mcClient = mcClient;

		this._setApiNames();
		this.folders = json.load(this._getFoldersFilePath());
	}

	/**
	 * Creates/Updates local folder structure based on (current) SFMC folders.
	 * @returns 
	 */
	async upsertFolders() {
		this.folders = [];
		try {
			this.folders = await this.fetchAll();
		} catch (error) {
			logger.error(`Error fetching folders: ${error}`);
			return false;
		}

		if (!Array.isArray(this.folders) || this.folders.length === 0) {
			logger.error(`No folders found`);
			vscode.window.showWarningMessage(`No folders found`);
			return false;
		}

		// builde the folder structure:
		this.folders.forEach(folderObj => {
			let folderPath = this.findFolderPath(this.folders, folderObj[this.ID_KEY]);
			let folderFullPath = Pathy.joinToRoot(folderPath);
			logger.log(`Folder: ${folderObj[this.NAME_KEY]} => ${folderFullPath}`);
			folder.create(folderFullPath, true);
		});
	}

	/**
	 * Create folder path for a given folder ID.
	 * @param {array} folders Array of folders.
	 * @param {*} folderId 
	 */
	findFolderPath(folders, folderId) {
		let path = [];
		let currentFolder = folders.find(folderObj => folderObj[this.ID_KEY] === folderId);
		while (currentFolder) {
			path.unshift(currentFolder[this.NAME_KEY]);
			currentFolder = folders.find(folderObj => folderObj[this.ID_KEY] === currentFolder[this.PARENT_ID_KEY]);
		}
		return path.join('/');
	}

	/**
	 * Fetch all folders from SFMC and store to local file.
	 * @returns {array} Array of folders.
	 */
	async fetchAll() {
		let folders = [];
		if (this.objectType === 'asset') {
			folders = await this.mcClient.getAssetFolders();
		} else {
			logger.error(`Unsupported object type: ${this.objectType}`);
			return false;
		}

		// TODO: store to ./.vscode/
		json.save(this._getFoldersFilePath(), folders);
		return folders;
	}

	// Set key names used in API response / folder json file.
	_setApiNames() {
		if (this.objectType === 'asset') {
			this.ID_KEY = 'id';
			this.NAME_KEY = 'name';
			this.PARENT_ID_KEY = 'parentId';
			this.PARENT_NAME_KEY = 'parentName';
		} else {
			logger.error(`Unsupported object type: ${this.objectType}`);
		}
	}

	_getFoldersFilePath() {
		return Pathy.joinToRoot(`.vscode/${this.objectType}Folders.json`);
	}
}