const express = require('express');
const morgan = require('morgan');
const { template } = require('./template');
const logger = require('./auxi/logger');
const path = require('path');
const Pathy = require('./auxi/pathy');
const fs = require('fs');
const Config = require('./config');
const serverStatus = require('./ui/serverStatusBar');
const telemetry = require('./telemetry');

const CONTENT_TYPES = {
	'.html': 'text/html',
	'.js': 'application/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.txt': 'text/plain',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon'
};


class LivePreview {
	constructor(config) {
		this.config = config;
		this.running = false;
		this.server = null;
		this.app = null;
	}

	start() {
		// Load config
		this.config.loadConfig();

		// Setup Express
		this.app = express();
		this.app.use(morgan('dev'));

		// Setup main route - now using path parameter
		logger.log(`Live Preview Server starting...`);
		this.app.use('/*',
			this._authenticate.bind(this), 
			this._checkResourcePath.bind(this),
			(req, res) => {
				let pth = req.resourcePath; // Set by _checkResourcePath
				if (pth) {
					const ext = path.extname(pth).toLowerCase();
					const contentType = CONTENT_TYPES[ext] || 'text/plain';

					if (contentType.startsWith('image/')) {
						const imageBuffer = fs.readFileSync(pth);
						res.setHeader('Content-Type', contentType);
						telemetry.log('livePreviewRequest', { type: 'image', extension: ext });
						res.status(200).send(imageBuffer);
					} else {
						let html = template.runScriptFile(pth, this.config, true);
						res.setHeader('Content-Type', contentType);
						telemetry.log('livePreviewRequest', { type: 'text', extension: ext });
						res.status(200).send(html);
					}
					
				} else {
					throw ("Resource path not set!");
				}
			}
		);

		// Start server
		this.port = this.config.getHostPort();
		this.server = this.app.listen(this.port, () => {
			logger.log(`===== Live Preview Server listening on: localhost:${this.port} =====`);
			this.running = true;
			serverStatus.show(this.port);
		});
	}

	stop() {
		if (this.server) {
			logger.log('Closing Live Preview Server...');
			this.server.close(() => {
				logger.log('Closed out remaining connections');
				this.running = false;
				serverStatus.hide();
			});
		}
	}

	_authenticate(req, res, next) {
		let passOk = false;
		try {
			const { authEnabled, authUser, authPassword } = this.config.getServerInfo();
			if (!authEnabled) {
				passOk = true;
			} else {
				const authHeader = req.headers?.['ssjs-authorization'];

				if (authHeader && authHeader.split(' ')) {
					const encodedCredentials = authHeader.split(' ')[1];
					const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');
					const [username, password] = decodedCredentials.split(':');
					passOk = username === authUser && password === authPassword;
				}
			}
		} catch (err) {
			logger.error(err);
		}

		if (passOk) {
			next();
		} else {
			logger.error('Basic AUTH not valid!');
			this._send401Response(res, 'Not Authorised.');
		}
	}

	_checkResourcePath(req, res, next) {
		function checkExtname(p) {
			let extname = Pathy.extname(p);
			return CONTENT_TYPES[extname] !== undefined;
		}
		let requestPath = req.originalUrl;
		const publicPath = this.config.getPublicPath();

		logger.log('CHECK RESOURCE PATH:', requestPath, ' => ', publicPath);
		requestPath = requestPath.split('?')[0];

		let fullPath = Pathy.join(publicPath, requestPath);

		if (fs.existsSync(fullPath) && fullPath.startsWith(publicPath)) {
			if (checkExtname(fullPath)) {
				logger.log('Resource path OK:', fullPath);
				req.resourcePath = fullPath; // Store the validated path
				next();
			} else {
				logger.error('File type not allowed:', fullPath);
				this._send401Response(res, 'File type not allowed.', false);
			}
		} else {
			logger.error('Invalid resource path:', fullPath);
			this._send404Response(res, requestPath, 'Path not valid.');
		}
	}

	_send401Response(res, message, sendJson = true) {
		this._sendErrorResponse(res, 401, { message }, sendJson);
	}

	_send404Response(res, pth, message, sendJson = true) {
		this._sendErrorResponse(res, 404, { message, path: pth }, sendJson);
	}

	_sendErrorResponse(res, httpStatus, renderView, sendJson) {
		if (sendJson !== false) {
			res.status(httpStatus).send({
				httpStatus: httpStatus,
				...renderView
			});
		} else {
			const pth = Pathy.joinToSource(`templates/${httpStatus}.html`);
			let html = template.runFile(pth);
			res.status(httpStatus).send(html);
		}
	}
}

module.exports = LivePreview; 