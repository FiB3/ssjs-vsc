%%[
	/*
    * Development {{pageContextReadable}} for SSJS Manager (Extension for VSCode).
    * Used to simplify (not only) SSJS Development using Content Block.
		* 
		* Deployment: Simply copy this to your Landing Page or text Resource (depending on the @devPageContext variable) and publish.
		* Update SSJS Config accordingly based on the guide there. 
		*
    * @source-page: {{page}}
    * @version: {{version}}
    * Deployed for: << your-email-here >> (User ID: {{userID}})
	 */
	VAR @devBlockID, @devPageContext
	SET @devBlockID = {{devBlockID}}
	SET @devPageContext = '{{devPageContext}}' /* 'page' for CloudPage, 'text' for Code Resources */
]%%
%%=ContentBlockByID(v(@devBlockID))=%%