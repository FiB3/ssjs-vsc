const fs = require('fs');

module.exports = {

  /**
   * Save JS object to `json` file.
   * @param {string} fileName
   * @param {*} json 
   * @return true | error text
   */
  save: function(fileName, json) {
    fs.writeFile(fileName, JSON.stringify(json, null, 2), function(err) {
      if(err) {
        return err;
      }
      return true;
    });
  },

  /**
   * Load JS object from `json` file.
   * @param {string} fileName
   * @returns JS object | string with error
   */
  load: function(fileName) {
    // console.log(fileName);
    try {
      const data = fs.readFileSync(fileName, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.log(err);
      return `Error while reading file: ${fileName}: ${err}`;
    }
  }
}