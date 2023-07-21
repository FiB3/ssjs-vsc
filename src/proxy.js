var fs = require('fs');
var path = require('path');
var express = require('express');
// const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require("morgan");
const Mustache = require('mustache');
// const { exit } = require('process');

// TODO: replace with auxi.file
// const textFile = require('./txtHandler');
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

    const API_SERVICE_URL = "https://mcq-xxxx.pub.sfmc-content.com";
    const OAUTH_TOKEN = '';

    let app = express();
    app.use(morgan('dev'));


    if (configObj['proxy-any-file']?.enabled) {
      const tkn = configObj['proxy-any-file']['dev-token'];
      console.log(`Any-proxy URL: ${configObj['proxy-any-file']['main-path']}, TOKEN: '${tkn}'`);

      app.use(configObj['proxy-any-file']['main-path'], (req, res, next) => {
        // tkn
        if (req.query?.token === tkn) {
          if (req.query?.path) {
            let pth = getTemplatePath(req.query.path);
            let html = templateOneFile(pth);
            if (!pth) {
              console.error('Any-proxy path invalid:', req.query?.path);
              res.status(404).send('Path not valid.');
            } else {
              // res.send(200, html);
              res.status(200).send(html);
            }
          } else {
            console.error('Any-proxy path not set:', req.query?.path);
            res.status(404).send('Path not set.');
          }
        } else {
          console.info('TKN:', req.query);
          console.error('Any-proxy token not valid');
          res.status(401).send('Not Authrorised');
        }
      });
    } else {
      console.error(`Any-proxy not set.`);
    }


    // // Proxy endpoints:
    // if (configObj['proxy-endpoints']) {
    //   configObj['proxy-endpoints'].forEach((endpoint) => {
    //     if (!endpoint.path) {
    //       throw "'path' not defined for endpoint!"
    //     }
    //     console.log(`PATH: "${endpoint.path}" =>`);
  
    //     app.use(endpoint.path, createProxyMiddleware({
    //       target: endpoint.targetOverride || API_SERVICE_URL,
    //       changeOrigin: true,
    //       headers: {
    //         'Authorization': `Bearer ${OAUTH_TOKEN}`
    //       },
    //       pathRewrite: (path, req) => {
    //         console.log(`rewrite path: ${path}.`);
    //         const nPath = path.replace(endpoint.path, endpoint.pathRewrite);
    //         return nPath;
    //       },
    //     })
    //     )
    //   });
    // } else {
    //   console.log(`No Endpoints to proxy.`);
    // }

    // app.use(templateFiles, express.static(config.publicPath));

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

function getTemplatePath (pth) {
  const p = path.join(config.publicPath, pth);

  if (fs.existsSync(p) && p.startsWith(config.publicPath)) {
    return p;
  } else {
    return false;
  } 
}

function templateOneFile(pth) {
  const htmlTemplate = textFile.load(pth);

  const view = {
    ...config.devTokens,
    VERSION: config.automateVersion ? getSsjsVersion() : config.devTokens.VERSION
  };
    
  var html = Mustache.render(htmlTemplate, view);
  return html;
}

function templateFiles(req, res, next) {
  const htmlTemplate = textFile.load(path.join(config.publicPath, req.path));

  

  if (config.filesToTemplate.includes(req.path)) {

    const view = {
      ...config.devTokens,
      VERSION: config.automateVersion ? getSsjsVersion() : config.devTokens.VERSION
    };
    
    var html = Mustache.render(htmlTemplate, view);
    res.send(200, html);
  } else {
    next();
  }  
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
  
  config.automateVersion = configObj['automate-version'] === true;
}

function getSsjsVersion() {
  return 'V.' + moment().format('DD:MM:YYYY-HH:m:s');
}