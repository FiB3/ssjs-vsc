const plugin = {
	meta: {
		name: "ssjs",
		version: "0.0.1",
	},
	configs: {},
	rules: {
		"no-trailing-commas": {
			meta: {
				type: "problem",
				docs: {
					description: "Disallow trailing commas in arrays",
					category: "Possible Errors",
					recommended: true
				},
				messages: {	
					trailingComma: "Trailing commas are not supported in SSJS arrays"
				}
			},
			create(context) {
				const sourceCode = context.getSourceCode();
				const regex = /,\s*\]/;
				
				return {
					ArrayExpression(node) {
						// const elements = node.elements;
						const text = sourceCode.getText(node);
						console.log(`ArrayExpression:`, node.type, text);
						if (text.match(regex)) {
							context.report({
								node: node,
								messageId: "trailingComma"
							});
						}
					}
				};
			}
		},
	},
};

module.exports = plugin;