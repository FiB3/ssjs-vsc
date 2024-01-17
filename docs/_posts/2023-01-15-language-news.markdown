---
layout: post
title:  "New language  features!"
date:   2023-01-15 21:00:00 +0100
categories: jekyll update
---

New features our out in the version `0.2.4`!

## New formatting

Use the improved SSJS formatter. It can now also be used for AMPscript! The extension now also contains settings for AMPscript setup.

## Library templating

The other new feature lets you easily include other file in your project into the script. So, if you want to share a piece of code - let's call it a library ;) - all you need to do is to use this new feature! And how?

1) put your piece of code into a new file:
```js
// file: ./myLib.js
function helloWorld() {
	Write("Hello World!");
}
```
Now, set a new token (for templating) in the `ssjs-setup.json`. It needs to reference your file using the: `file://./path/to/file` syntax.

```json
{
	//...
	"dev-tokens": {
		"IS_PROD": false,
		"MY_LIB": "file://./myLib.js"
	},
	//...
}
```
Let's include the library in your script file, like:

```js
Platform.Load("1.1.1");

{{MY_LIB}}

helloWorld();
```

And run as usual! No changes there!

But how about deploying to production, you might ask? Here's a new command in the toolset: `SSJS: Deploy to Production`. At the moment, it gives you compiled code to Clipboard, but more coming soon!

# Something more?

Yes! Preferences of the SSJS Manager are now organized in a more logical way.

And of course, some of the bugs are fixed!