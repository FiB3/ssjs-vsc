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
   * Used to simplify (not only) SSJS Development.
   * @source-page: {{page}}
   * @version: {{version}}
   */
  Platform.Load("core","1.1.5");
  try {
    var devPath = "{{proxy-any-file_main-path}}";
    var devBaseUrl = "{{public-domain}}";

    var token = Request.GetQueryStringParameter("token"); // QueryParameter('token')
    var path = Request.GetQueryStringParameter("path"); //QueryParameter('path')
    Variable.SetValue("path", path);

    var devUrl = devBaseUrl + devPath + "?token=" + token + "&path=" + path;

    var req = new Script.Util.HttpRequest(devUrl);
    req.method = "GET";
    req.emptyContentHandling = 0;
    req.retries = 2;
    req.continueOnError = true;

    var response = req.send();

    if (response.statusCode + '' === '200' || response.statusCode + '' === '304') {
      Variable.SetValue("ok", 'TRUE');
      Variable.SetValue("content", response.content + '');
    } else {
      Variable.SetValue("ok", 'FALSE');
      Variable.SetValue("status", response.statusCode);
      Variable.SetValue("content", response.content + '');
    }
  } catch(err) {
    Write("<br>" + Stringify(err));
  }
</script>

<h2>
SSJS DEV: %%=v(@path)=%%
</h2>
%%[ IF @ok == TRUE THEN ]%%
  %%=TreatAsContent(@content)=%%
%%[ ELSE ]%%
  <h3>%%=v(@status)=%%</h3>
  <p>%%=v(@content)=%%</p>
%%[ ENDIF ]%%