const assert = require('assert');
const { describe, it } = require('mocha');

// Pure transform - no VS Code / fs dependency, so no mock is required.
const { mergePrettierConfig } = require('../../src/auxi/prettierConfig');

describe('mergePrettierConfig', () => {
	it('adds ampscriptKeywordCase:"upper" to an empty config (changed:true)', () => {
		const { config, changed } = mergePrettierConfig({});
		assert.deepStrictEqual(config, { ampscriptKeywordCase: 'upper' });
		assert.strictEqual(changed, true);
	});

	it('treats a nullish input as empty and adds the option', () => {
		const { config, changed } = mergePrettierConfig(undefined);
		assert.deepStrictEqual(config, { ampscriptKeywordCase: 'upper' });
		assert.strictEqual(changed, true);
	});

	it('is a no-op when ampscriptKeywordCase is already "upper"', () => {
		const input = { ampscriptKeywordCase: 'upper' };
		const { config, changed } = mergePrettierConfig(input);
		assert.deepStrictEqual(config, { ampscriptKeywordCase: 'upper' });
		assert.strictEqual(changed, false);
	});

	it('never overrides an explicit "lower" value (left as lower, changed:false)', () => {
		const input = { ampscriptKeywordCase: 'lower' };
		const { config, changed } = mergePrettierConfig(input);
		assert.strictEqual(config.ampscriptKeywordCase, 'lower');
		assert.strictEqual(changed, false);
	});

	it('never overrides an explicit "preserve" value', () => {
		const input = { ampscriptKeywordCase: 'preserve' };
		const { config, changed } = mergePrettierConfig(input);
		assert.strictEqual(config.ampscriptKeywordCase, 'preserve');
		assert.strictEqual(changed, false);
	});

	it('preserves unrelated options and only adds the case key', () => {
		const input = { singleQuote: true, tabWidth: 4 };
		const { config, changed } = mergePrettierConfig(input);
		assert.deepStrictEqual(config, {
			singleQuote: true,
			tabWidth: 4,
			ampscriptKeywordCase: 'upper'
		});
		assert.strictEqual(changed, true);
	});

	it('does not add or touch a plugins entry (SFMC LS injects the plugin itself)', () => {
		const input = { plugins: ['prettier-plugin-sql'] };
		const { config, changed } = mergePrettierConfig(input);
		assert.deepStrictEqual(config.plugins, ['prettier-plugin-sql']);
		assert.strictEqual(config.ampscriptKeywordCase, 'upper');
		assert.strictEqual(changed, true);
	});

	it('does not mutate the input object', () => {
		const input = { singleQuote: true };
		mergePrettierConfig(input);
		assert.deepStrictEqual(input, { singleQuote: true });
	});
});
