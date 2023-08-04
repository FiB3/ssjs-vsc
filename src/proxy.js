var fs = require('fs');
var path = require('path');
var express = require('express');
const morgan = require("morgan");
const Mustache = require('mustache');

const textFile = require('./auxi/file');
const moment = require('moment');

// no HTML escaping:
Mustache.escape = function(text) {return text;};

let config;
let server;

let anyPathToken;

exports.app = {
  running: false,

  host: 'http://127.0.0.1',
  port: 4000,

  build: function(configObj) {
    // SETUP:
    parseConfig(configObj);

    // this.host = configObj.domain || this.host;
    this.port = configObj.port || this.port;

    let app = express();
    app.use(morgan('dev'));

    if (configObj['proxy-any-file']?.enabled) {
      anyPathToken = configObj['proxy-any-file']['dev-token'];
      console.log(`Any-proxy URL: ${configObj['proxy-any-file']['main-path']}, TOKEN: '${anyPathToken}'`);

      app.use(configObj['proxy-any-file']['main-path'], anyPathSecurity, (req, res, next) => {
        if (req.query?.path) {
          let pth = getTemplatePath(req.query.path);
          let html = templateOneFile(pth);
          if (!pth) {
            console.error('Any-proxy path invalid:', req.query?.path);
            res.status(404).send('Path not valid.');
          } else {
            res.status(200).send(html);
          }
        } else {
          console.error('Any-proxy path not set:', req.query?.path);
          res.status(404).send('Path not set.');
        }
      });
    } else {
      console.error(`Any-proxy not set.`);
    }

    server = app.listen(this.port, () => {
      console.log(`Server listening on: localhost:${this.port}`);
      console.log(`Proxied to: ${this.host}`);
      console.log(`=====================================`);
      this.running = true;
    });
  },

  close: function() {
    console.log('Closing...');
    server.close(() => {
      console.log('Closed out remaining connections');
      this.running = false;
    });
  }
};

/**
 * Handle authentication of any path.
 * @param {object} req 
 * @param {object} res 
 * @param {function} next called in case request passes validation.
 */
function anyPathSecurity (req, res, next) {
  if (req.query?.token === anyPathToken) {
    next();
  } else {
    console.error('Any-proxy token not valid');
    console.info('TKN:', req.query);
    res.status(401).send('Not Authrorised');
  }
}

function getTemplatePath (pth) {
  const p = path.join(config.publicPath, pth);

  if (fs.existsSync(p) && p.startsWith(config.publicPath)) {
    return p;
  } else {
    return false;
  } 
}

/**
 * Get Templated file.
 * @param {string} pth path to the file
 * @param {boolean} isDev true: for testing / false: for deployment
 * @returns 
 */
function templateOneFile(pth, isDev) {
  const htmlTemplate = textFile.load(pth);

  const view = {
    ...config.devTokens
    // , VERSION: getSsjsVersion(config.devTokens.VERSION)
  };
    
  var html = Mustache.render(htmlTemplate, view);
  return html;
}

function parseConfig(configObj) {
  config = {};
  let publicPath = configObj['dev-folder-path'] ? configObj['dev-folder-path'] : './';

  config.publicPath = publicPath.startsWith('\/')
      ? publicPath
      : path.join(configObj.projectPath, publicPath);

  let filesToTemplate = Array.isArray(configObj['files-to-template'])
        ? configObj['files-to-template']
        : [];
  filesToTemplate.forEach(function(part, index) {
    this[index] = this[index].startsWith('/') ? this[index] : '/' + this[index];
  }, filesToTemplate);
  config.filesToTemplate = filesToTemplate;
  
  config.devTokens = Object.keys(configObj['dev-tokens'])
      ? configObj['dev-tokens']
      : {};
  
  // TODO: not finished yet
  config.prodTokens = Object.keys(configObj['prod-tokens'])
      ? configObj['prod-tokens']
      : {};
}

function getSsjsVersion() {
  // TODO: needs to be improved
  // when deploying - set date, when previewing set timestamp??
  return config.automateVersion
      ? 'V.' + moment().format('DD:MM:YYYY-HH:m:s')
      : '';
}