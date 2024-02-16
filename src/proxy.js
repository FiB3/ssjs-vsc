const fs = require('fs');
const path = require('path');
const express = require('express');
const morgan = require("morgan");
const moment = require('moment');

const { template } = require('./template');
const Config = require('./config');
const textFile = require('./auxi/file');

let config;
let server;

exports.app = {
  running: false,

  host: 'http://localhost',
  port: 4000,

  build: function(configRef) {
    config = configRef;

    // SETUP:
    config.loadConfig();

    this.port = config.getHostPort();

    let app = express();
    app.use(morgan('dev'));

		console.log(`Any-proxy URL: ${config.getAnyMainPath()}`);
		app.use(config.getAnyMainPath(), checkPathSecurity, checkResourcePath, (req, res, next) => {
			let pth = req.query?.path;
			if (pth) {
				let html = template.runScriptFile(pth, config, isDev = true);
				res.status(200).send(html);
			} else {
				throw("checkResourcePath() not used!")
			}
		});

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
 * Generate Basic Auth Header.
 * @param {*} username 
 * @param {*} password 
 * @returns {string} Basic Auth Header - 'Basic <encodedCredentials>'
 */
exports.generateBasicAuthHeader = function(username, password) {
	const credentials = `${username}:${password}`;
	const encodedCredentials = Buffer.from(credentials, 'utf-8').toString('base64');
	return `Basic ${encodedCredentials}`;
}

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
      const [username, password] = decodedCredentials.split(':');
      const { anyUser, anyPassword } = config.getServerProviderBasicAuth();
      
      passOk = username === anyUser && password === anyPassword;
    }
  } catch (err) {
    console.error(err);
  }

  if (passOk) {
		next();
  } else {
    console.error('Basic AUTH not valid!');
    send401Response(res, 'Not Authorised by Path.');
  }
}

function checkResourcePath(req, res, next) {
  let queryPath = req.query?.path;
  let publicPath = config.getPublicPath();
  if (queryPath) {
    let p;
    if(path.isAbsolute(queryPath)) {
      p = queryPath;
    } else {
      p = path.join(publicPath, req.query.path);
    }

    if (fs.existsSync(p) && p.startsWith(publicPath)) {
      if (Config.isFileTypeAllowed(p)) {
        // path OK:
        console.log('checkResourcePath: OK');
        req.query.path = p;
        next();
      } else {
        console.error('Any-proxy path invalid (2):', p);
        send401Response(res, 'File type not allowed.');
      }
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

function send401Response(res, message, sendJson=true) {
  sendErrorResponse(res, 401, {
    message
  }, sendJson);
}

function send404Response(res, pth, message, sendJson=true) {
  sendErrorResponse(res, 404, {
    message,
    path: pth,
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