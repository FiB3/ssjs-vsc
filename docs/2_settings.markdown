---
layout: page
title: Settings
permalink: /settings/
---

#### Extension Settings

Extension allows you to do some overall extension settings:

**Code Provider:**

Sets how to link your VSCode to SFMC?

- None: Code is not provided from VSCode to SFMC.
- Asset: Code is provided using Content Block. Slower but more secure. Default!
- Server: Code is server using local sever. Faster, but requires reverse tunneling.

More on [Code Providers]({{ site.baseurl }}/extension/#deployment-options).

<img src="{{ site.baseurl }}/assets/img/preferences.png" alt="Preferences">

**Autosave:**
Upload script automatically when using Asset Provider?

#### Project Settings

Settings for an individual project is set in a file. `.vscode/ssjs-setup.json` to be precise.
Create it either by `SSJS: Create Config` command (CMD/CTRL + Shift + P). You can also copy following JSON and set it yourself (remove commands and set only your required parameters). However, this could be used only for Server Provider and without API access.

API Client Secret is always stored in a secure way (in OS Key management).

**Example:**

```json
{
  // SFMC settings:
  "sfmc-domain": "<< sfmc-subdomain from AUTH URL: https://sfmc-subdomain.auth.marketingcloudapis.com/ >>",
  "sfmc-client-id": "<< client-id of installed package >>",
  "sfmc-mid": "<< optional: only if MID is needed >>",

  // Server provider settings:
  "public-domain": "<< publicly accessible domain, e.g. NGROK forwarding domain >>",
  "port": 4000, // PORT of to locally serve the data on
	"proxy-any-file": {
    "main-path": "/all-in-dev",
    "enabled": true, // disable providing files but keep server on - future use
    "use-token": true, // use token on the Cloud Page
    "dev-token": "<< dev-token-comes-here >>", // token to be used
		 // HTTP Basic Auth login to project the server (Header: "ssjs-authorization")
    "auth-username": "<< dev-username-comes-here >>",
    "auth-password": "<< dev-password-comes-here >>"
  },
  // Asset provider settings:
	"asset-provider": {
    "use-token": true, // use token on the Cloud Page
    "dev-token": "<< dev-token-comes-here >>", // token to be used
    "folder-id": 0, // Content Builder folder ID
    "folder": "<< asset-folder >>" // Content Builder folder
  },
  // If you need to tokenize your file, just set a token.
  // Any key you set here can be used in your .ssjs file using {{ token-name }} syntax.
  // It will be automatically assigned whenever you deploy your file.
  "dev-tokens": { // when developing
    "IS_PROD": "true",
    "token-name": "use {{Mustache}} syntax in your files to fill your dev files"
  },
  "prod-tokens": { // Future use: when deploying for production.
    "IS_PROD": "false",
    "token-name": "use {{Mustache}} syntax in your files to fill your prod files"
  },
	
  "dev-folder-path": "", // legacy
  // Version of the extension:
  "extension-version": "0.1.0"
}
```