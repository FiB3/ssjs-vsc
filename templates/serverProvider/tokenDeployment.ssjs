<script runat="server">
  /*
   * Development Page for SSJS Manager (Extension for Visual Studio Code).
   * Used to simplify (not only) SSJS Development using Content Block.
   * Version with Token Authentication.
   * @source-page: {{page}}
   * @version: {{version}}
   */
  Platform.Load("core","1.1.5");

	// Variable.SetValue("devPageContext", '{{devPageContext}}'); /* values: 'page' - cloud page / 'text' - text resource */
	var TOKEN_ENABLED = {{useAuth}};
	var TOKEN_DEFAULT = '{{token}}';
	var VSC_DOMAIN = "{{server-url}}";
	var SSJS_BASIC_ENCRYPTED = "{{basic-encrypted-secret}}";

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

	function getScriptPath() {
		// TODO: ensure that the param is provided and is OK?
		var pth = Request.GetQueryStringParameter("path");
		// pth = protectInjection(pth);
		// add path validation - maybe whitelist?
		if (pth) {
			return pth;
		} else {
			Variable.SetValue("path", "none");
			Variable.SetValue("ok", "NOK");
			Variable.SetValue("status", "400");
			Variable.SetValue("content", "No path provided.");
			return false;
		}
	}

	function callScript(devUrl) {
		var req = new Script.Util.HttpRequest(devUrl);
    req.method = "GET";
    req.emptyContentHandling = 0;
    req.retries = 2;
    req.continueOnError = true;
    req.setHeader("ssjs-authorization", SSJS_BASIC_ENCRYPTED);

    var response = req.send();

    if (response.statusCode + '' === '200' || response.statusCode + '' === '304') {
      Variable.SetValue("ok", 'TRUE');
      Variable.SetValue("content", response.content + '');
    } else {
      Variable.SetValue("ok", 'FALSE');
      Variable.SetValue("status", response.statusCode);
      Variable.SetValue("content", response.content + '');
    }
	}

  try {
		var authenticated = false; 
		var token = false;
		if (TOKEN_ENABLED) {
			var tokenQuery = getQueryString();
			var tokenCookie = getTokenCookie();
			var tokenHeader = getHeaderToken();
			token = tokenCookie || tokenQuery || tokenHeader || false;

			if (token && token === TOKEN_DEFAULT) {
				setTokenCookie(token);
				authenticated = true;
			}
		} else {
			authenticated = true;
		}

		if (authenticated) {
			Variable.SetValue("authenticated", true);
			var path = getScriptPath();
			if (path) {
				var devUrl = token ? VSC_DOMAIN + "?token=" + token + "&path=" + path : VSC_DOMAIN + "?path=" + path;
				callScript(devUrl);
			}
		}	else {
			Variable.SetValue("path", "none");
			Variable.SetValue("authenticated", false);
		}
  } catch(err) {
    Write("<br>" + Stringify(err));
  }
</script>
%%[ IF @authenticated == TRUE AND @path == 'none' THEN ]%%
	%%[ IF @devPageContext == 'page' THEN ]%%
	<p>404</p>
	<p>No script found - please set path.</p>
	%%[ ELSE ]%%
404
No script found - please set path.
	%%[ ENDIF ]%%
%%[ ELSEIF @authenticated == TRUE THEN ]%%
	%%[ IF @ok == TRUE THEN ]%%
		%%=TreatAsContent(@content)=%%
	%%[ ELSE ]%%
		%%[ IF @devPageContext == 'page' THEN ]%%
			<h3>%%=v(@status)=%%</h3>
			<p>%%=v(@content)=%%</p>
		%%[ ELSE ]%%
%%=v(@status)=%%
%%=v(@content)=%%
		%%[ ENDIF ]%%

	%%[ ENDIF ]%%
%%[ ELSE ]%%
	%%[ IF @devPageContext == 'page' THEN ]%%
	<p>401</p>
	<p>Not authenticated.</p>
	%%[ ELSE ]%%
401
Not authenticated.
	%%[ ENDIF ]%%
%%[ ENDIF ]%%