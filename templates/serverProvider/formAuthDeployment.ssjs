
<script runat="server">
  /*
   * Development Page for SSJS Manager (Extension for Visual Studio Code).
   * Used to simplify (not only) SSJS Development using Content Block.
   * Version with Form Authentication.
   * @source-page: {{page}}
   * @version: {{version}}
   */
  Platform.Load("core","1.1.5");

	// Variable.SetValue("devPageContext", '{{devPageContext}}'); /* values: 'page' - cloud page / 'text' - text resource */
	var AUTH_ENABLED = {{useAuth}};
  var AUTH_DEFAULT = '{{username}}:{{password}}';
	var VSC_DOMAIN = "{{server-url}}";
	var SSJS_BASIC_ENCRYPTED = "{{basic-encrypted-secret}}";

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

	function getScriptPath() {
		var pth = Request.GetQueryStringParameter("path");
		if (pth) {
			Variable.SetValue("path", pth);
			return pth;
		} else {
			setNok(400, "No path provided - please specify path query parameter.", "none");
			return false;
		}
	}

	function setOk(content) {
		Variable.SetValue("ok", true);
		Variable.SetValue("status", "200");
		Variable.SetValue("content", content);
		Variable.SetValue("authenticated", true);
	}

	function setNok(status, content, path) {
		Variable.SetValue("ok", false);
		Variable.SetValue("authenticated", false);
		if (status) { Variable.SetValue("status", status + ''); }
		if (content) { Variable.SetValue("content", content + ''); }
		if (path) { Variable.SetValue("path",	path); }
	}

	function callScript(devUrl, path) {
		var req = new Script.Util.HttpRequest(devUrl);
    req.method = "GET";
    req.emptyContentHandling = 0;
    req.retries = 2;
    req.continueOnError = true;
    req.setHeader("ssjs-authorization", SSJS_BASIC_ENCRYPTED);

    var response = req.send();

    if (response.statusCode + '' === '200' || response.statusCode + '' === '304') {
			setOk(response.content);
    } else {
			setNok(response.statusCode, response.content + '');
    }
	}

	try {
    // set default state:
		setNok(400, "Unknown failure.", "none");

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
      var path = getScriptPath();

			if (path) {
				var devUrl = VSC_DOMAIN + "?path=" + path;
				callScript(devUrl);
			}
    } else {
			setNok(401, "Not authenticated.", "none");
    }

		Platform.Response.SetResponseHeader("Strict-Transport-Security", "max-age=200");
		Platform.Response.SetResponseHeader("X-XSS-Protection", "1; mode=block");
		Platform.Response.SetResponseHeader("X-Frame-Options", "Deny");
		Platform.Response.SetResponseHeader("X-Content-Type-Options", "nosniff");
		Platform.Response.SetResponseHeader("Referrer-Policy", "strict-origin-when-cross-origin");
		/* Platform.Response.SetResponseHeader("Content-Security-Policy", "default-src 'self'"); */
  } catch(err) {
    Write("<br>" + Stringify(err));
  }
</script>
%%[ IF @authenticated == TRUE AND @ok == TRUE AND Not Empty(@path) THEN ]%%
	%%=TreatAsContent(@content)=%%
%%[ ELSEIF NOT @authenticated == TRUE AND @status == '401' THEN ]%%
	%%[ IF @devPageContext == 'page' THEN ]%%
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
	%%[ ELSE ]%%
401
Not authenticated.
	%%[ ENDIF ]%%
%%[ ELSE ]%%
	%%[ IF @devPageContext == 'page' THEN ]%%
		<h3>%%=v(@status)=%%</h3>
		<p>%%=v(@content)=%%</p>
	%%[ ELSE ]%%
%%=v(@status)=%%
%%=v(@content)=%%
	%%[ ENDIF ]%%
%%[ ENDIF ]%%