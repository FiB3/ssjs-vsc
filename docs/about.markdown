---
layout: page
title: Extension
permalink: /extension/
---

This extension streamlines Server Side JavaScript (and AMPscript) development in Salesforce Marketing Cloud.
From syntax highlight to easier testing  and deployment.

Long story short... make VSCode into SSJS IDE!

#### Deployment options

This extension allows you to develop the code in 2 main ways:

**Asset Provider**  
Uses API to deploy your script on demand or save. This is the default.

Asset Provider is the more secure option.
However, it is slightly slower, and requires an Installed Package. Deployed scripts are always available.

**Server Provider**  
It uses a local server that provides your scripts via HTTPS.

While this is the faster option that also does not always require an Installed Package (only for setup creation, which will be updated later).
Reverse tunneling tool is required (NGROK, Expose, Local Tunnel, Cloud Flare Tunnels...).

Less secure (as it exposes your computer to potential hackers), but faster.
Script are accessible only when you need it.