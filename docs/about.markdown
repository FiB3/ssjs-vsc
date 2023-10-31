---
layout: page
title: About
permalink: /about/
---

This extension streamlines Server Side JavaScript (and AMPscript) development in Salesforce Marketing Cloud.
From syntax highlight to easier testing  and deployment.

Long story short... make VSCode into SSJS IDE!

### Deployment options

This extension allows you to develop the code in 2 main ways:

- **Asset Provider** (default): uses API to deploy your script on demand or save. More secure but requires an Installed Package.
- **Server Provider**: uses local server that provides your scripts via HTTPS. Reverse tunneling tool required (NGROK, Expose...). Less secure, but fast. Script runs only when you need it. Installed package needed only for the setup.