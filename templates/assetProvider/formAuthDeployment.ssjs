<script runat="server">
  /*
   * Development Page for SSJS Manager (Extension for Visual Studio Code).
   * Used to simplify (not only) SSJS Development using Content Block.
   * Version with Form Authentication.
   * @source-page: {{page}}
   * @version: {{version}}
   */
  Platform.Load("core","1.1.5");

	/* NOTE: Cloud Page Only */
  var AUTH_ENABLED = {{useAuth}};
  var AUTH_DEFAULT = '{{username}}:{{password}}';

  function checkHashedAuth(hashedValue) {
    var authHashed = Platform.Function.MD5(AUTH_DEFAULT, "UTF-8");
    if (hashedValue && hashedValue === authHashed) {
      return AUTH_DEFAULT;
    }
    return false;
  }

  function protectFromInjection(value) {
    if (!value) return false;
    var regex = /[^a-zA-Z0-9\-\@\.]/g;
    return value.replace(regex, '');
  }

  function getAuthFormValues() {
    var username = Platform.Request.GetFormField('username');
    var password = Platform.Request.GetFormField('password');
    username = protectFromInjection(username);
		password = protectFromInjection(password);
    return username + ':' + password;
  }

  function getTokenCookie() {
    var authCookie = Platform.Request.GetCookieValue("ssjs-basic-auth");
    authCookie = protectFromInjection(authCookie);
    return checkHashedAuth(authCookie);
  }

  function setAuthCookie(value) {
    var exp_date = new Date();
    // exp_date.setMinutes(exp_date.getMinutes() + 1);
    exp_date.setDate(exp_date.getDate() + 1);
    var cookieHashed = Platform.Function.MD5(value, "UTF-8");
		Platform.Response.SetCookie("ssjs-basic-auth", cookieHashed, exp_date, true);
  }

	function getAssetId() {
    // TODO: ensure that the param is provided and is OK?
    var assetId = Request.GetQueryStringParameter("asset-id");
    assetId = protectFromInjection(assetId);
    // add assetId validation - maybe whitelist?
    return assetId;
  }

	try {
    var authenticated = false;

		if (AUTH_ENABLED) {
			var authCookie = getTokenCookie();
			var authFormValue = getAuthFormValues();
			var authVal = authCookie || authFormValue || false;

			if (authVal === AUTH_DEFAULT) {
				setAuthCookie(AUTH_DEFAULT);
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
      Variable.SetValue("authenticated", 'none');
			Variable.SetValue("id", false);
    }

		Platform.Response.SetResponseHeader("Strict-Transport-Security", "max-age=200");
		Platform.Response.SetResponseHeader("X-XSS-Protection", "1; mode=block");
		Platform.Response.SetResponseHeader("X-Frame-Options", "Deny");
		Platform.Response.SetResponseHeader("X-Content-Type-Options", "nosniff");
		Platform.Response.SetResponseHeader("Referrer-Policy", "strict-origin-when-cross-origin");
		Platform.Response.SetResponseHeader("Content-Security-Policy", "default-src 'self'");
  } catch(err) {
    Write("<br>" + Stringify(err));
  }
</script>

%%[ IF @authenticated == TRUE and @id == 'none' THEN ]%%
	<h2>SSJS Manager</h2>
	<p>Provide <code>asset-id</code> query parameter to load the content block.</p>

%%[ ELSEIF @authenticated == TRUE THEN ]%%
	%%=ContentBlockByID(v(@id))=%%
%%[ ELSE ]%%

<h2>SSJS Manager Login</h2>
<form method="post">
<!-- action="/" -->
    <div>
        <label for="username">Username:</label>
        <input type="text" id="username" name="username" required>
    </div>
    <div>
        <label for="password">Password:</label>
        <input type="password" id="password" name="password" required>
    </div>
    <div>
        <input type="submit" value="Login">
    </div>
</form>

%%[ ENDIF ]%%