// Flat config (ESLint 9+) — faithful port of the former .eslintrc.json.
// Reproduces the same env (node + commonjs + es6 + mocha), parserOptions
// (ecmaVersion 2020, jsx) and the seven "warn" rules, plus the former
// .eslintignore entry (configView). Intentionally minimal: no new rules and
// no reformatting of the codebase.
'use strict';

module.exports = [
	{
		ignores: ['configView/**', 'node_modules/**'],
	},
	{
		files: ['**/*.js'],
		languageOptions: {
			// 'latest' rather than the former 2020 so the parser accepts the
			// ES2022 static class fields already present in the codebase (e.g.
			// src/code/codeFolders.js). The old .eslintrc.json never actually
			// ran (`eslint .` was broken), so this parse gap was latent.
			ecmaVersion: 'latest',
			sourceType: 'commonjs',
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
			globals: {
				// Node.js (env.node) + CommonJS (env.commonjs)
				require: 'readonly',
				module: 'writable',
				exports: 'writable',
				process: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly',
				console: 'readonly',
				Buffer: 'readonly',
				global: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				setInterval: 'readonly',
				clearInterval: 'readonly',
				setImmediate: 'readonly',
				clearImmediate: 'readonly',
				URL: 'readonly',
				URLSearchParams: 'readonly',
				TextEncoder: 'readonly',
				TextDecoder: 'readonly',
				// Mocha (env.mocha)
				describe: 'readonly',
				it: 'readonly',
				before: 'readonly',
				after: 'readonly',
				beforeEach: 'readonly',
				afterEach: 'readonly',
			},
		},
		rules: {
			'no-const-assign': 'warn',
			'no-this-before-super': 'warn',
			'no-undef': 'warn',
			'no-unreachable': 'warn',
			'no-unused-vars': 'warn',
			'constructor-super': 'warn',
			'valid-typeof': 'warn',
		},
	},
];
