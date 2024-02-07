<!-- 
  === How to deploy Dev {{pageContextReadable}} to your SFMC environment? ===

    1) Create a new {{pageContextReadable}} in your SFMC Instance - you will need the page URL.
    2) Run the `SSJS: Install Dev Page` Command.
    3) Fill any requested details (like Content Builder Folder names...).
    4) Paste deployment script from this file into your {{pageContextReadable}} (without this comment!).
    5) Save & Publish your {{pageContextReadable}}.

  You are done!

	=== How to use your Dev {{pageContextReadable}}? ===
  
		1a) Asset Provider (default) - on first deployment of a new script, you need to run the `SSJS: Upload Script to Dev`.
			Following deployments are automatic on file save.
		1b) Server Provider - Just have Tunneling service running, and `SSJS: Start` the SSJS Manager.
		2) Any script in your environment can now be accessed via this Cloud Page - SSJS: Get Dev Path.

	=== DEPLOYMENT SCRIPT FOLLOWS: ===
 -->
%%[
	/*
    * Development {{pageContextReadable}} for SSJS Manager (Extension for VSCode).
    * Used to simplify (not only) SSJS Development using Content Block.
    * @source-page: {{page}}
    * @version: {{version}}
    * Deployed for: << your-email-here >> (User ID: {{userID}})
	 */
	VAR @devBlockID
	SET @devBlockID = {{devBlockID}}
]%%
%%=ContentBlockByID(v(@devBlockID))=%%