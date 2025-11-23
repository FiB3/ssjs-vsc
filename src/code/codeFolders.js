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
	 * @param {string} objectType `asset` for Content Builder, `script` for SSJS scripts (future)
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

		path = path.length > 0 ? [CodeFolders.BASE_FOLDER_NAME, ...path].join('/') : false;
		return path;
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
}