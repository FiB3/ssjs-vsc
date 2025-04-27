const Linter = require("./lint");

// TODO: make it work in `<script>` tags
const ssjsConfig = {
	// ...ssjs.configs.recommended,
	// ...overrideConfig,
	// files: ['**/*.ssjs']
	env: {
		es6: false,
		node: false
	},
	parserOptions: {
		ecmaVersion: 3,
		sourceType: "script",
		globals: {
			
		},
	},
	rules: {
		"comma-dangle": [
			"error",
			"never"
		],
		"new-cap": "off",
		"no-console": "off",
		"no-extend-native": "off",
		"no-new": "error",
		"no-prototype-builtins": "off",
		"no-throw-literal": "off",
		"no-use-before-define": [
			"error",
			{
				"variables": true,
				"functions": false,
				"classes": false
			}
		],
		"no-var": "off"
	}
};

module.exports = new Linter("ssjs", [".ssjs"], ssjsConfig);