const vscode = require('vscode');

const logger = require('../auxi/logger');
const file = require('../auxi/file');
const json = require('../auxi/json');
const folder = require('../auxi/folder');
const Pathy = require('../auxi/pathy');
const Metafile = require('./metafile');
const ContextHolder = require('../config/contextHolder');

/**
 * Handler for folders containing code from SFMC.
 * Made to handle based on a specific object type (e.g. Content Blocks, Scripts...).
 * Fetches folders from SFMC, builds or updates local folder structure.
 */
module.exports = class CodeFolders {

	static BASE_FOLDER_NAME = '_sfmc';

	/**
	 * 
	 * @param {string} objectType `asset` for Content Builder, `script` for SSJS scripts (future), `cloudPage` for Cloud Pages (future)
	 * @param {McClient} mcClient SFMC client instance
	 */
	constructor(objectType, mcClient) {
		this.objectType = objectType;
		this.mcClient = mcClient;

		this._setApiNames();
		this.folders = json.load(this._getFoldersFilePath());

		// check, that the base folder exists:
		if (!folder.exists(Pathy.joinToRoot(CodeFolders.BASE_FOLDER_NAME))) {
			folder.create(Pathy.joinToRoot(CodeFolders.BASE_FOLDER_NAME));
		}
	}

	/**
	 * Creates/Updates local folder structure based on (current) SFMC folders.
	 * @returns {array} array of folder paths
	 */
	async upsertFolders() {
		this.folders = [];
		this.folderPaths = [];
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

		// build the folder structure:
		this.folders.forEach(folderObj => {
			let folderPath = this.findFolderPath(folderObj[this.ID_KEY]);
			let folderFullPath = Pathy.joinToRoot(folderPath);
			logger.log(`Folder: ${folderObj[this.NAME_KEY]} => ${folderFullPath}`);
			folder.create(folderFullPath, true);
			this.folderPaths.push(folderFullPath);
		});
		return this.folderPaths;
	}

	/**
	 * Create folder path for a given folder ID, including the base folder name - relative from workspace root.
	 * @param {number} folderId 
	 * @param {boolean} withBaseFolder - include the base folder name in the path
	 * @returns {string|false} Folder path, or false if folder not found.
	 */
	findFolderPath(folderId) {
		let path = [];
		let currentFolder = this.folders.find(folderObj => folderObj[this.ID_KEY] === folderId);
		while (currentFolder) {
			path.unshift(currentFolder[this.NAME_KEY]);
			currentFolder = this.folders.find(folderObj => folderObj[this.ID_KEY] === currentFolder[this.PARENT_ID_KEY]);
		}

		path = path.length > 0 ? Pathy.joinSimple([CodeFolders.BASE_FOLDER_NAME, ...path]) : false;
		return path;
	}

	/**
	 * Find the folder ID for a given folder path.
	 * @param {string} folderPath - Path to the folder.
	 * @returns {number|false} Folder ID, or false if folder not found.
	 */
	findFolderId(folderPath) {
		let relativePath = Pathy.getRelativePathToRoot(folderPath);
		let parts = Pathy.split(Pathy.getFolder(relativePath));
		if (parts.length < 1 || parts[0] !== CodeFolders.BASE_FOLDER_NAME) {
			return false;
		}
		parts.shift();
		let folderId = false;

		// find the folder ID by traversing the folder structure (from root to the target folder):
		let parentFolderId = 0;
		for (let i = 0; i < parts.length; i++) {
			let currentFolder = this.folders[i];
			let sfmcFolder = this.folders.find(folderObj => folderObj[this.NAME_KEY] === parts[i] && folderObj[this.PARENT_ID_KEY] === parentFolderId);
			if (!sfmcFolder) {
				return false;
			}
			folderId = sfmcFolder[this.ID_KEY];
			parentFolderId = folderId;
		}
		return folderId;
	}

	/**
	 * Fetch all folders from SFMC and store to local file.
	 * @returns {array} Array of folders.
	 */
	async fetchAll() {
		let folders = [];
		if (this.objectType === 'asset') {
			try {
				folders = await this.mcClient.getAssetFolders();
				logger.log('folders:', folders);
			} catch (err) {
				logger.error('Error fetching folders:', err);
				const errorMessage = this.mcClient.parseRestError(err);
				vscode.window.showErrorMessage(`Error fetching folders from SFMC: ${err?.statusCode ?? ''} ${errorMessage}`);
				return false;
			}
		} else {
			logger.error(`Unsupported object type: ${this.objectType}`);
			return false;
		}

		// store to ./.vscode/ folder
		json.save(this._getFoldersFilePath(), folders);
		return folders;
	}

	/**
	 * Save current folder structure and files to local file.
	 * Does not include the metadata files.
	 * @param {boolean} excludeSuffix - exclude the suffix from the file paths
	 * @returns {object} snapshot: { folders: array of folder paths, files: array of file paths }
	 */
	snapshot(excludeSuffix = false) {
		let baseFolder = this._getBaseFolder();
		let folders = [baseFolder, ...folder.listAll(baseFolder)];
		let files = folder.exists(baseFolder) ? file.listAll(baseFolder) : [];
		// remove the metadata files:
		files = files.filter(file => !Metafile.isMetafile(file));
		if (excludeSuffix) {
			files = files.map((file) => {
				return Pathy.removeSuffix(file);
			});
		}

		return {
			folders: folders,
			files: files
		};
	}

	/**
	 * Compare two snapshots and return the changes.
	 * @param {object} initialSnapshot - snapshot done by .snapshot() method.
	 * @param {object} newSnapshot - snapshot done by .snapshot() method.
	 * @returns {object} changes: { deletedFolders: array of folder paths, deletedFiles: array of file paths }
	 */
	compareSnapshots(initialSnapshot, newSnapshot) {
		let changes = {
			deletedFolders: [],
			deletedFiles: []
		};

		// compare the folders:
		initialSnapshot.folders.forEach(folder => {
			if (!newSnapshot.folders.includes(folder)) {
				changes.deletedFolders.push(folder);
			}
		});

		// compare the files:
		initialSnapshot.files.forEach(file => {
			if (!newSnapshot.files.includes(file)) {
				changes.deletedFiles.push(file);
			}
		});

		return changes;
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

	_getBaseFolder() {
		let folderName = this.objectType === 'asset' ? 'Content Builder' : 'TODO:!'
		return Pathy.joinToRoot(CodeFolders.BASE_FOLDER_NAME, folderName);
	}

	/**
	 * Check if the file path is in the base folder.
	 * @param {string} filePath - Path to the file.
	 * @returns {boolean} True if the file path is in the base folder, false otherwise.
	 */
	static isInBaseSfmcFolder(filePath) {
		return Pathy.hasDirectSubfolder(filePath, CodeFolders.BASE_FOLDER_NAME);
	}

	/**
	 * Get the object type from the file path.
	 * @param {string} filePath - Path to the file.
	 * @returns {string|false} Object type, or false if not found.
	 */
	static getObjectTypeFromPath(filePath) {
		let relativePath = Pathy.getRelativePathToRoot(filePath);
		let parts = Pathy.split(relativePath);
		if (parts.length < 1 || parts[0] !== CodeFolders.BASE_FOLDER_NAME) {
			return false;
		}

		if (parts[1] === 'Content Builder') {
			return 'asset';
		} else if (parts[1] === 'Cloud Pages') { // TODO: check later
			return 'cloudPage';
		} else if (parts[1] === 'Scripts') { // TODO: check later
			return 'script';
		}
		return false;
	}
}