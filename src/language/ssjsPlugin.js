const plugin = {
	meta: {
		name: "ssjs",
		version: "0.0.1",
	},
	configs: {},
	rules: {
		"only-var-assign": {
			meta: {
				type: "problem",
				messages: {
					onlyVarAssign: "Only `var` is allowed in SSJS."
				}
			},
			create(context) {
				let sourceCode = context.sourceCode;

				console.log(`create() - only-var-assign:`, sourceCode);

				return {
					VariableDeclaration(node) {
						if (node.kind !== "var") {
							context.report({ node, messageId: "onlyVarAssign" });
						}
					}
				};
			},
		},
	},
};

module.exports = plugin;