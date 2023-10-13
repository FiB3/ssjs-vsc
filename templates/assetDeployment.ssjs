<!-- TODO: change -->
<!-- 
  FOLLOWING STEPS SHOW HOW TO DEPLOY DEV SCRIPT TO YOUR SFMC ENVIRONMENT:
    - valid only for Asset Provider!

    1) Setup the extension (Create Config)
    2) Create a new Cloud Page in your SFMC Instance.
    3) Paste deployment script from this file into your Cloud Page (comments are not required).
    4) Save & Publish your Cloud Page.

  You are done!

  To access any of your scripts just run the "Upload Script" command.
    
  Any script in your environment can now be accessed via this Cloud Page:
    Don't forget to add "dev-token" and path to your file:
    e.g.: https://mc12345667890.pub.sfmc-content.com/abcdefghijk?token=<<ssjs-setup.json asset-provider dev-token>>&path=<<asset.id>>
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
    var tokenEnabled = {{tokenEnabled}};
    var tokenDefault = '{{token}}';

    var token = Request.GetQueryStringParameter("token"); // TODO: option to disable

    if (!tokenEnabled || (tokenEnabled && token && token === tokenDefault)) {
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
  <!-- To use in Text Resource, remove the HTML Tags and HTML Comments. -->
  <h3>401</h3>
  <p>Not authenticated.</p>
%%[ ENDIF ]%%