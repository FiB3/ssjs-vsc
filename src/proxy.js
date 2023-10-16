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
      console.log(`Any-proxy URL: ${configObj['proxy-any-file']['main-path']}, TOKEN: '${config.anyPathToken}'`);

      app.use(configObj['proxy-any-file']['main-path'], checkPathSecurity, checkResourcePath, (req, res, next) => {
        let pth = req.query?.path;
        if (pth) {
          let html = templateOneFile(pth);
          res.status(200).send(html);
        } else {
          throw("checkResourcePath() not used!")
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
function checkPathSecurity(req, res, next) {
  // TODO: error handling!
  let passOk = false;
  try {
    const authHeader = req.headers?.['ssjs-authorization'];
    if (authHeader && authHeader.split(' ')) {
      const encodedCredentials = authHeader.split(' ')[1];
      const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');
      var [username, password] = decodedCredentials.split(':');
  
      passOk = username === config.authUser && password === config.authPassword;
    }
  } catch (err) {
    console.error(err);
  }

  if (passOk) {
    // check if token is also used:
    if (config.useToken !== false) {
      if (req.query?.token === config.anyPathToken) {
        next();
      } else {
        console.error('Any-proxy token not valid');
        console.info('TKN:', req.query);
        send401Response(res, 'Not Authorised by token.');
      }
    } else {
      next();
    }
  } else {
    console.error('Basic AUTH not valid!');
    send401Response(res, 'Not Authorised by Path.');
  }
}

function checkResourcePath(req, res, next) {
  let queryPath = req.query?.path;
  if (queryPath) {
    let p;
    if(path.isAbsolute(queryPath)) {
      p = queryPath;
    } else {
      p = path.join(config.publicPath, req.query.path);
    }

    if (fs.existsSync(p) && p.startsWith(config.publicPath)) {
      // path OK:
      console.log('checkResourcePath: OK');
      req.query.path = p;
      next();
    } else {
      // TODO: Path NOK
      console.error('Any-proxy path invalid (1):', p);
      send404Response(res, queryPath, 'Path not valid.');
    }
  } else {
    console.error('Any-proxy path not set...');
    send404Response(res, 'none', 'Path not set.');
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
  // TODO: ensure this is either set or set for current path?
  console.log('PARSE CONFIG:',  publicPath.startsWith('\/'), '?', publicPath, ',', configObj.projectPath, ',', publicPath);
  config.publicPath = publicPath.startsWith('\/')
      ? publicPath
      : path.join(configObj.projectPath, publicPath);
  console.log(`PUBLIC PATH: "${config.publicPath}".`);

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
  config.useToken = configObj['proxy-any-file']['use-token'];
  config.anyPathToken = configObj['proxy-any-file']['dev-token'];
  config.authUser = configObj['proxy-any-file']['auth-username'];
  config.authPassword = configObj['proxy-any-file']['auth-password'];



  config.prodTokens = Object.keys(configObj['prod-tokens'])
      ? configObj['prod-tokens']
      : {};
  
  config.devTokens = Object.keys(configObj['dev-tokens'])
      ? configObj['dev-tokens']
      : {};
  config.devTokens = Object.keys(configObj['dev-tokens'])
      ? configObj['dev-tokens']
      : {};
}

function getSsjsVersion() {
  // TODO: needs to be improved
  // when deploying - set date, when previewing set timestamp??
  return config.automateVersion
      ? 'V.' + moment().format('DD:MM:YYYY-HH:m:s')
      : '';
}

function send401Response(res, message, sendJson=true) {
  sendErrorResponse(res, 401, {
    message
  }, sendJson);
}

function send404Response(res, pth, message, sendJson=true) {
  sendErrorResponse(res, 404, {
    message,
    pth
  }, sendJson);
}

/**
 * Send Error Response - JSON or Page.
 * @param {Object} res Response Object
 * @param {Number} httpStatus Error HTML status to render
 * @param {Object} renderView Mustache View
 * @param {Boolean=true} sendJson true for JSON, false for  HTML
 */
function sendErrorResponse(res, httpStatus, renderView, sendJson) {
  // console.log(`===== ${httpStatus} =====`);
  if (sendJson !== false) {
    // TODO: JSON reply
    res.status(httpStatus).send({
      httpStatus: httpStatus,
      ...renderView
    });
  } else {
    const pth = path.join(__dirname, `../templates/${httpStatus}.html`);
    const htmlTemplate = textFile.load(pth);
    var html = Mustache.render(htmlTemplate, renderView);
    res.status(httpStatus).send(html);
  }
}