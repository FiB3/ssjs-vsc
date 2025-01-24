<script runat="server">
	/* 
	 * Development Page for SSJS Manager (Extension for Visual Studio Code).
	 * Used to simplify (not only) SSJS Development using Content Block.
	 * Token-protected.
	 * @source-page: {{page}}
	 * @version: {{version}}
	 */
	Platform.Load("core","1.1.5");

	// Variable.SetValue("devPageContext", '{{devPageContext}}'); /* values: 'page' - cloud page / 'text' - text resource */
	var TOKEN_ENABLED = {{useAuth}};
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
    // Write('-----"' + assetId + '" - type: ' + typeof(assetId) + '-----' + parseInt(assetId) + ' => ' + !isNaN(parseInt(assetId)));
    return assetId !== false && !isNaN(parseInt(assetId)) ? parseInt(assetId) : false;
  }

  function setResponseHeader(status, message) {
    var st = typeof(status) === 'number' ? status : -1;
    var msg = message + '';
    
    Platform.Response.SetResponseHeader("ssjs-http-status", st);
    Platform.Response.SetResponseHeader("ssjs-http-message", msg);
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
      var assetId = getAssetId() || 0;
			Variable.SetValue("id", assetId);
			Variable.SetValue("authenticated", true);
      
      setResponseHeader(assetId === 0 ? 404 : 200, assetId === 0 ? 'Asset not found' : 'OK');
		} else {
      Variable.SetValue("authenticated", 'none');
			Variable.SetValue("id", false);
      setResponseHeader(401, 'Not Authenticated');
		}
	} catch(err) {
		Write("<br>" + Stringify(err));
	}
</script>
%%[ IF @authenticated == TRUE AND @id == 0 THEN ]%%
	%%[ IF @devPageContext == 'page' THEN ]%%
	<p>404</p>
	<p>No script found - please set ID.</p>
	%%[ ELSE ]%%
404
No script found - please set ID.
	%%[ ENDIF ]%%
%%[ ELSEIF @authenticated == TRUE THEN ]%%
	%%=TreatAsContent(ContentBlockById(v(@id)))=%%
%%[ ELSE ]%%
	%%[ IF @devPageContext == 'page' THEN ]%%
	<p>401</p>
	<p>Not authenticated.</p>
	%%[ ELSE ]%%
401
Not authenticated.
	%%[ ENDIF ]%%
%%[ ENDIF ]%%