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

  var TOKEN_ENABLED = {{tokenEnabled}};
  var TOKEN_DEFAULT = '{{token}}';

  function checkHashedToken(hashedValue) {
    var tokenHashed = Platform.Function.MD5(TOKEN_DEFAULT, "UTF-8");
    if (hashedValue && hashedValue === tokenHashed) {
      return TOKEN_DEFAULT;
    }
    return false;
  }

  function protectInjection(value) {
    if (!value) return false;
    var regex = /[^a-zA-Z0-9\-]/g;
    return value.replace(regex, '');
  }

  function getQueryString() {
    var tokenQS = Platform.Request.GetQueryStringParameter("token");
    tokenQS = protectInjection(tokenQS);
    return tokenQS;
  }

  function getHeaderToken() {
    var tokenHeader = Platform.Request.GetRequestHeader("ssjs-token");
    tokenHeader = protectInjection(tokenHeader);
    return tokenHeader;
  }

  function getTokenCookie() {
    var tokenCookie = Platform.Request.GetCookieValue("ssjs-token");
    tokenCookie = protectInjection(tokenCookie);
    return checkHashedToken(tokenCookie);
  }

  function setTokenCookie(value) {
    var exp_date = new Date();
    // exp_date.setMinutes(exp_date.getMinutes() + 1);
    exp_date.setDate(exp_date.getDate() + 1);
    var cookieHashed = Platform.Function.MD5(value, "UTF-8");
		Platform.Response.SetCookie("ssjs-token", cookieHashed, exp_date, true);
  }

  function getAssetId() {
    // TODO: ensure that the param is provided and is OK?
    var assetId = Request.GetQueryStringParameter("asset-id");
    assetId = protectInjection(assetId);
    // add assetId validation - maybe whitelist?
    return assetId;
  }

  try {
    var authenticated = false; 

    if (TOKEN_ENABLED) {
      var tokenQuery = getQueryString();
      var tokenCookie = getTokenCookie();
      var tokenHeader = getHeaderToken();

      var token = tokenCookie || tokenQuery || tokenHeader || false;

      if (token && token === TOKEN_DEFAULT) {
        setTokenCookie(token);
        authenticated = true;
      }
    } else {
      authenticated = true;
    }

    if (authenticated) {
      var assetId = getAssetId();
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
  401
  Not authenticated.
%%[ ENDIF ]%%