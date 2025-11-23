const fs = require('fs');
const path = require('path');
const logger = require('./logger');

function exists(folderPath) {
	try {
		const stats = fs.statSync(folderPath);
		return stats.isDirectory();
	} catch (err) {
		return false;
	}
}

function create(folderPath, recursive = false) {
	if (exists(folderPath)) {
		return;
	}

	const parentFolderPath = path.dirname(folderPath);

	if (recursive && !exists(parentFolderPath)) {
		create(parentFolderPath, true);
	}

	fs.mkdirSync(folderPath);
}

function clear(folderPath, removeSubfolders = true) {
	if (!exists(folderPath)) {
		return;
	}

	const items = fs.readdirSync(folderPath);

	for (const item of items) {
		const itemPath = path.join(folderPath, item);

		if (exists(itemPath)) {
			if (removeSubfolders) {
				clear(itemPath, true);
				fs.rmdirSync(itemPath);
			} else {
				clear(itemPath, false);
			}
		} else {
			fs.unlinkSync(itemPath);
		}
	}
}

function remove(directoryPath) {
	try {
		fs.rmSync(directoryPath, {
			recursive: true
		});
	} catch (err) {
		logger.error(`Error while deleting directory '${directoryPath}': ${err}`);
	}
}

/**
 * Recursively list all folders (folders only) in the given folder.
 * @param {string} folderPath
 * @returns {array} list of folder paths from the initial folder path
 */
function listAll(folderPath) {
	if (!exists(folderPath)) {
		return [];
	}

	const folders = [];
	const items = fs.readdirSync(folderPath);
	
	for (const item of items) {
		const itemPath = path.join(folderPath, item);
		if (exists(itemPath)) {
			// Add the current folder path
			folders.push(itemPath);
			// Recursively get subfolders
			const subfolders = listAll(itemPath);
			folders.push(...subfolders);
		}
	}
	
	return folders;
}

module.exports = {
	exists,
	create,
	clear,
	remove,
	listAll
};