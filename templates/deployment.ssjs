<!-- 
  === How to deploy Dev script to your SFMC environment? ===

    1) Create a new Cloud Page or Cloud Text Resource in your SFMC Instance - you will need the page URL.
    2) Run the `SSJS: Install Dev Page` Command.
    3) Fill any requested details (like Content Builder Folder names...).
    4) Paste deployment script from this file into your Cloud Page (without this comment!).
    5) Save & Publish your Cloud Page.

  You are done!

	=== How to use your Dev Page? ===
  
		1a) Asset Provider (default) - on first deployment of a new script, you need to run the `SSJS: Upload Script to Dev`.
			Following deployments are automatic on file save.
		1b) Server Provider - Just have Tunneling service running, and `SSJS: Start` the SSJS Manager.
		2) Any script in your environment can now be accessed via this Cloud Page - SSJS: Get Dev Path.
 -->

<!-- DEPLOYMENT SCRIPT FOLLOWS: -->

%%[
	/*
    * Development Cloud Page / Cloud Resource for SSJS Manager (Extension for VSCode).
    * Used to simplify (not only) SSJS Development using Content Block.
    * @source-page: {{page}}
    * @version: {{version}}
    * Deployed for: << your-email-here >>
	 */
	VAR @devBlockID, @devPageContext
	SET @devBlockID = {{devBlockID}}
	SET @devPageContext = '{{devPageContext}}' /* values: 'cloud-page' / 'text-resource' */
]%%

%%=ContentBlockByID(v(@devBlockID))=%%