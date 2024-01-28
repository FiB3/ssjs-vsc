---
title: Extension

layout: redirected
sitemap: false
permalink: /extension/
redirect_to:  https://fib3.vercel.app/ssjs-vsc
---

This extension streamlines Server Side JavaScript (and AMPscript) development in Salesforce Marketing Cloud.
From syntax highlight to easier testing  and deployment.

Long story short... make VSCode into SSJS IDE!

![Usage of the Extension]({{ site.baseurl }}/assets/img/ssjs-vsc-demo1.1.gif)

#### Deployment options

This extension allows you to develop SSJS (or AMPscript) in accelerated pace, using one of the Code Providers and a Cloud Page (or Code Resource).

Code Providers represent the way your code is made accessible to SFMC - either as code snippet (asset) or via simple web server running in the extension.

**Asset Provider**  
Uses API to deploy your script via API as a Content Builder Code Snippet. Either on demand or on save. This is the default.

Asset Provider is the more secure option.
However, it is slightly slower, and requires an Installed Package. Deployed scripts are always available.

**Server Provider**  
It uses a local server that provides your scripts via HTTPS.

While this is the faster option that also does not always require an Installed Package (only for setup creation, which will be updated later).
Reverse tunneling tool is required (NGROK, Expose, Local Tunnel, Cloud Flare Tunnels...).

Less secure (as it exposes your computer to potential hackers), but faster.
Script are accessible only when you need it.