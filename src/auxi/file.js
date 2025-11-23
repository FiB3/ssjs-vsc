const fs = require('fs');
const path = require('path');

module.exports = {

  /**
   * Save JS object to `json` file.
   * @param {string} fileName
   * @param {string} text 
   * @return true | error text
   */
  save: function(fileName, text) {
    fs.writeFileSync(fileName, text, function(err) {
      if(err) {
          return err;
      }
      return true;
    });
  },

  /**
   * Load content of the text file.
   * @param {string} fileName
   * @returns string | string with error
   */
  load: function(fileName) {
    try {
      const data = fs.readFileSync(fileName, 'utf8');
      return data;
    } catch (err) {
      return `Error while reading file: ${fileName}: ${err}`;
    }
  },

	/**
	 * Delete file.
	 * @param {string} fileName
	 * @returns {boolean|string} - true if deleted, error text otherwise.
	 */
	delete: function(fileName) {
		try {
			fs.unlinkSync(fileName);
			return true;
		} catch (err) {
			return `Error while deleting file: ${fileName}: ${err}`;
		}
	},

  exists: function(fileName) {
    try {
      const stats = fs.statSync(fileName);
      return stats.isFile();
    } catch (err) {
      return false;
    }
  },

  /**
 * Recursively list all files in the given folder.
 * @param {string} folderPath
 * @returns {array} list of folder paths from the initial folder path
 */
  listAll: function(folderPath) {
    const stats = fs.statSync(folderPath);;
    if (!stats.isDirectory()) {
      return [];
    }

    const files = [];
    const items = fs.readdirSync(folderPath);
    
    for (const item of items) {
      const itemPath = path.join(folderPath, item);
      if (fs.statSync(itemPath).isFile()) {
        // Add the current file path
        files.push(itemPath);
      } else if (fs.statSync(itemPath).isDirectory()) {
        // Recursively get subfolders
        const subfolderfiles = this.listAll(itemPath);
        files.push(...subfolderfiles);
      }
    }
    return files;
  }
};