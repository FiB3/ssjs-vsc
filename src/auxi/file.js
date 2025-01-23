const fs = require('fs');

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
   * Load JS object from text file.
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
  }
}