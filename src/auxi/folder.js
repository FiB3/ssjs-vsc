const fs = require('fs');
const path = require('path');

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
		console.error(`Error while deleting directory '${directoryPath}': ${err}`);
	}
}

module.exports = {
	exists,
	create,
	clear,
	remove
};