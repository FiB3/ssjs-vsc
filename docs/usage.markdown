---
layout: page
title: Use
permalink: /use/
---

Some features are provided automatically and without setup.  
Like syntax highlight, code snippets (and in future document formatting) is available as soon as you create or open your first `.ssjs` file.

**To setup your environment:**
- set your Code Provider,
- create your first `.ssjs` file (`.html` and `.amp` files are also supported,
- create your setup (`SSJS: Create Config`) and finish the remainder of information,
- finally, run `SSJS: Deploy Dev Page` to generate your Cloud Page / Text Resource code, which you then deploy to your SFMC instance.

**To develop:**

Asset provider can deploy any file automatically or by `SSJS: Upload Script` command (Content Builder folder is set on first file deployment). In the future release, the file will have to be initially deployed by `Upload Script` command before auto-deploy will work.

Server provider needs to be on by running `SSJS: Start` and stopped by `SSJS: Stop` command.

Finally! How to run your script?  
Open your Cloud Page / Text resource.
Then `SSJS: Get Dev PATH` on your file - this puts the query parameters into clipboard. Then just add them to the Cloud Page URL! ENTER it and you're done!

**Tokens:**

Set `dev-tokens` and `prod-tokens` in `.vscode/ssjs-setup.json`, in case you need to fill anything in your scripts differently on the context. E.g.: Dev vs Production or in order not to commit to your Git repository.


Any key you set here can be used in your .ssjs file using `{{ token-name }}` syntax. It will be automatically assigned whenever you deploy your file.