<!-- TODO: change -->
<!-- 
  FOLLOWING STEPS SHOW HOW TO DEPLOY DEV SCRIPT TO YOUR SFMC ENVIRONMENT:
    1) Ensure, that your environment is publically accessible (e.g. by NGROK)
    2) Your publically accessible domain needs to be set in your setup file (.vscode/ssjs-setup.json => "public-domain")
    3) Create a new Cloud Page in your SFMC Instance.
    4) Paste deployment script from this file into your Cloud Page (this comment is not required).
    5) Save & Publish your Cloud Page.

  You are done!
    
  Any script in your environment can now be accessed via this Cloud Page:
    Don't forget to add "dev-token" and path to your file:
    e.g.: https://mc12345667890.pub.sfmc-content.com/abcdefghijk?token=<<ssjs-setup.json dev-token>>&path=<<relative path of developed script>>
 -->

<!-- DEPLOYMENT SCRIPT FOLLOWS: -->
<script runat="server">
  /* 
   * Development Page for SSJS Manager (Extension for Visual Studio Code).
   * Used to simplify (not only) SSJS Development using Content Block.
   * @source-page: {{page}}
   * @version: {{version}}
   */
  Platform.Load("core","1.1.5");
  try {
    var tokenDefault = '{{token}}';

    var token = Request.GetQueryStringParameter("token"); // TODO: option to disable

    if (token && token === tokenDefault) {
      // TODO: ensure that the param is provided and is OK?
      var assetId = Request.GetQueryStringParameter("asset-id");
      Variable.SetValue("id", assetId);
      Variable.SetValue("authenticated", true);
    } else {
      Variable.SetValue("authenticated", false);
    }
  } catch(err) {
    Write("<br>" + Stringify(err));
  }
</script>

%%[ IF @authenticated == TRUE THEN ]%%
  %%=ContentBlockByID(v(@id))=%%
%%[ ELSE ]%%
  <h3>401</h3>
  <p>Not authenticated.</p>
%%[ ENDIF ]%%