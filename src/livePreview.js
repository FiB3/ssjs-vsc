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
const WebSocket = require('ws');

const CONTENT_TYPES_TEMPLATABLE = {
	// Templates:
	'.html': 'text/html',
	'.htm': 'text/html',
	
	'.js': 'application/javascript',
	'.css': 'text/css',

	// Text:
	'.json': 'application/json',
	'.txt': 'text/plain',

	// SSJS:
	'.ssjs': 'text/plain',
	'.ampscript': 'text/plain',
	'.amp': 'text/plain'
};

const CONTENT_TYPES_TO_SEND = {
	// Images
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',

	// Documents
	'.pdf': 'application/pdf',
	'.txt': 'text/plain',

	// Videos
	'.mp4': 'video/mp4',
	'.webm': 'video/webm',
	'.mp3': 'audio/mpeg',
	'.wav': 'audio/wav',
	'.ogg': 'audio/ogg',

	// Fonts
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
	'.eot': 'application/vnd.ms-fontobject',
	'.otf': 'font/otf'
};


class LivePreview {
	constructor(config) {
		this.config = config;
		this.running = false;
		this.server = null;
		this.app = null;
		this.wss = null;
	}

	async start() {
		return new Promise((resolve, reject) => {
			try {
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
					this._sendResource.bind(this)
				);

				// Start server
				this.port = this.config.getHostPort();
				this.server = this.app.listen(this.port, () => {
					// Setup WebSocket server
					if (Config.reloadLivePreviewOnSave()) {
						this.wss = new WebSocket.Server({ server: this.server });
					}
					
					logger.log(`===== Live Preview Server listening on: localhost:${this.port} =====`);
					this.running = true;
					serverStatus.show(this.port);
					resolve();
				})
				.on('error', (error) => {
					logger.error('Failed to start Live Preview server:', error);
					if (error.code === 'EADDRINUSE') {
						reject({ message: 'Port ' + this.port + ' is already in use. Please, try another one.' });
					} else {
						reject(error);
					}
				});

			} catch (error) {
				logger.error('Failed to start Live Preview server:', error);
				reject(error);
			}
		});
	}

	async stop() {
    return new Promise((resolve, reject) => {
			if (!this.server) {
				resolve();
				return;
			}

			// Close WebSocket server if it exists
			if (this.wss) {
				this.wss.close();
				this.wss = null;
			}

			this.server.close((error) => {
				if (error) {
					reject(error);
					return;
				}
				logger.log('Closed out remaining connections');
				this.running = false;
				serverStatus.hide();
				resolve();
			});
    });
	}

	_sendResource(req, res) {
		let pth = req.resourcePath; // Set by _checkResourcePath
		if (pth) {
			const ext = path.extname(pth).toLowerCase();
			const contentType = CONTENT_TYPES_TEMPLATABLE[ext] || CONTENT_TYPES_TO_SEND[ext] || 'text/plain';

			if (CONTENT_TYPES_TEMPLATABLE[ext]) {
				let html = template.runScriptFile(pth, this.config, 'live-preview');
				res.setHeader('Content-Type', CONTENT_TYPES_TEMPLATABLE[ext]);
				telemetry.log('livePreviewRequest', { type: 'text', extension: ext });

				if (ext === '.html' && Config.reloadLivePreviewOnSave()) {
					const wsClientScript = `
						<script>
							const ws = new WebSocket('ws://localhost:${this.config.getHostPort()}');
							ws.onmessage = function(event) {
								if (event.data === 'reload') {
									window.location.reload();
								}
							};
						</script>
					`;
					html = html.replace('</body>', `${wsClientScript}</body>`);
				}

				res.status(200).send(html);
			} else if (CONTENT_TYPES_TO_SEND[ext]) {
				const imageBuffer = fs.readFileSync(pth);
				res.setHeader('Content-Type', CONTENT_TYPES_TO_SEND[ext]);
				res.status(200).send(imageBuffer);
			} else {
				res.status(415).send({
					httpStatus: 415,
					message: 'Content type not supported.'
				});
			}
		} else {
			throw ("Resource path not set!");
		}
	}

	getLivePreviewUrl(filePath) {
		const publicPath = this.config.getPublicPath();
		const relativePath = path.relative(publicPath, filePath);
		// relativePath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
		return `${this.config.getServerInfo().serverUrl}/${relativePath}`;
	}

	// Method to notify clients to reload
	notifyClientsToReload() {
		if (this.wss) {
			this.wss.clients.forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					client.send('reload');
				}
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
			return CONTENT_TYPES_TEMPLATABLE[extname] !== undefined || CONTENT_TYPES_TO_SEND[extname] !== undefined;
		}
		let requestPath = req.originalUrl;
		const publicPath = this.config.getPublicPath();

		logger.log('CHECK RESOURCE PATH:', requestPath, ' => ', publicPath);
		requestPath = requestPath.split('?')[0];

		let fullPath = Pathy.join(publicPath, requestPath);

		if (fs.existsSync(fullPath) && fullPath.startsWith(publicPath)) {
			if (!fullPath.split('/').includes('.vscode') && checkExtname(fullPath)) {
				logger.log('Resource path OK:', fullPath);
				req.resourcePath = fullPath; // Store the validated path
				next();
			} else {
				logger.error('File type not allowed:', fullPath);
				this._send401Response(res, 'File type not allowed.', true);
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