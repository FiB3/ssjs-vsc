/**
 * Pure transform to preserve SSJS Manager's historic UPPERCASE AMPscript keyword
 * look in a workspace Prettier config.
 *
 * The SFMC Language Service (`joernberkefeld.sfmc-language`) always injects its
 * bundled `prettier-plugin-sfmc` and reads a workspace Prettier config, merging
 * options such as `ampscriptKeywordCase` on top of its own plugin list. It
 * explicitly drops any user-provided `plugins` entry, so the workspace config
 * only needs `ampscriptKeywordCase` set - it must NOT (and need not) list the
 * plugin. See vscode-sfmc-language `client/src/formatter.ts` `resolveOptions()`.
 */

/**
 * Merge `ampscriptKeywordCase: "upper"` into an existing prettier config object.
 * Pure: no I/O. Returns `{ config, changed }`.
 * - Sets `ampscriptKeywordCase: 'upper'` ONLY if the key is absent (never
 *   overrides an explicit user value such as `'lower'` or `'preserve'`).
 * - Does not touch `plugins`: the SFMC Language Service ignores a workspace
 *   `plugins` entry and always injects its own bundled plugin.
 * @param {object} input - parsed prettier config (or the nested `prettier`
 * object from package.json).
 * @returns {{ config: object, changed: boolean }}
 */
function mergePrettierConfig(input) {
	const config = { ...(input || {}) };

	// Respect an explicit user value - never override 'lower'/'preserve'/'upper'.
	if (Object.prototype.hasOwnProperty.call(config, 'ampscriptKeywordCase')) {
		return { config, changed: false };
	}

	config.ampscriptKeywordCase = 'upper';
	return { config, changed: true };
}

module.exports = { mergePrettierConfig };
