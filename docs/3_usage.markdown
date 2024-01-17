---
layout: page
title: Use
permalink: /use/
---

Some features are provided automatically and without setup.  
Like syntax highlight, code snippets (and in future document formatting) is available as soon as you start working on your first `.ssjs` file in VSCode.

#### To setup your environment:

The `SSJS: Show Setup Walkthrough` gives you an overall guide. However, the major steps are:

- create your first `.ssjs` file in VSCode. `.html` and `.amp` are also supported,
- create your setup (`SSJS: Create Config`) and finish the remainder of information,
- finally, run `SSJS: Create Dev Page Code` to generate your Cloud Page / Text Resource code, which you then deploy to your SFMC instance.

Note: The API calls to SFMC can use the MID of the Business Unit to target a different BU than the one that was used to create the Installed Package.
This is, when you want to provide your MID on the initial setup or to change it in the `ssjs-setup.json` file.

#### To develop:

Asset provider can deploy any file automatically or by `SSJS: Upload Script` command (Content Builder folder is set on first file deployment).
Since `v0.1.2`, the file has to be initially deployed by `Upload Script` command before auto-deploy will work.

Server provider needs to be on by running `SSJS: Start` and stopped by `SSJS: Stop` command.

**How to run your script?**

1) Open your published Cloud Page / Text resource. One is all you need  for your scripts.
2) Run `SSJS: Get Dev PATH` on your script file - this puts the query parameters into clipboard. Then just add them to the Cloud Page URL! ENTER it and you're done!

#### Templating of script files:

Set `dev-tokens` and `prod-tokens` in `.vscode/ssjs-setup.json`, in case you need to fill anything in your scripts differently on the context. E.g.: Dev vs Production or in order not to commit to your Git repository.

Any key you set here can be used in your .ssjs file using `{{ token-name }}` syntax. It will be automatically assigned whenever you deploy your file.
Mustache syntax is currently used.

**Example:**
{% raw %}
```html
<script runat=server>
	// ...
	var IS_PROD = {{IS_PROD}};
	var MC_SUBDOMAIN = "{{SUBDOMAIN}}";
	var CLIENT_ID = "{{CLIENT_ID}}";
	var CLIENT_SECRET = "{{CLIENT_SECRET}}";
	// ...
	if (IS_PROD) {
		var sfmc = new sfmcApi(MC_SUBDOMAIN, CLIENT_ID, CLIENT_SECRET);
	}
	// ...
</script>
```
{% endraw %}

**.vscode/ssjs-setup.json**

```json
{
	//...
	"dev-tokens": {
		"IS_PROD": false,
		"MC_SUBDOMAIN": "mc-dummy-subdomain",
		"CLIENT_ID": "cl-id-12345",
		"CLIENT_ID": "cl-secret-98765"
	},
	"prod-tokens": {
	},
	//...
}
```