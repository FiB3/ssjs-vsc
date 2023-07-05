const fs = require('fs');

module.exports = {

  save: function(fileName, content) {
    fs.writeFile(fileName, content, function(err) {
      if(err) {
				console.log(err);
				return err;
      }
      console.log(`The file "${fileName}" was saved!`);
    });
	},

  load: function(fileName) {
    try {
      const data = fs.readFileSync(fileName, 'utf8');
      return data;
    } catch (err) {
      return `Error on reading file: ${fileName}: ${err}`;
    }
  }
}