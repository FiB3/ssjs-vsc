class Logger {
	constructor(logLevel, loggerOn, logger) {
		this.setup(logLevel, loggerOn, logger);

		this.levels = {
			DEBUG: 0,
			INFO: 1,
			WARN: 2,
			ERROR: 3
		};
	}

	setup(logLevel = 'INFO', loggerOn = true, logger = console) {
		this.logLevel = logLevel;
		this.loggerOn = loggerOn;
		this.logger = logger;
	}

	error(...message) {
		this._log('ERROR', ...message);
	}

	warn(...message) {
		this._log('WARN', ...message);
	}

	log(...message) {
		this._log('INFO', ...message);
	}

	info(...message) {
		this._log('INFO', ...message);
	}

	debug(...message) {
		this._log('DEBUG', ...message);
	}

	_log(level, ...message) {
		if (!this.loggerOn) {
			return;
		}
		if (this.getLevel(level) < this.getLevel(this.logLevel)) {
			return;
		}
		if (level === 'ERROR') {
			this.logger.error(...message);
		} else if (level === 'WARN') {
			this.logger.warn(...message);
		} else if (level === 'INFO') {
			this.logger.log(...message);
		}	else if (level === 'DEBUG') {
			this.logger.debug(...message);
		} else {
			this.logger.log(...message);
		}
	}

	getLevel(level) {
		return this.levels[level];
	}
}

module.exports = new Logger();