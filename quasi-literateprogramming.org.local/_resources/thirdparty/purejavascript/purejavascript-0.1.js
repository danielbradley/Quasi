/*
 *  PureJavacript, APIServer.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 *
 *  License LGPL v2
 */

APIServer = Resolve;

function Resolve()
{
    var base_domain = Resolve.ExtractBaseDomain( location.hostname );
	var dom = "";

	switch ( location.protocol )
	{
	case "http:":
		dom = location.protocol + "//api-" + base_domain + ":8080";
		break;

	case "https:":
		dom = location.protocol + "//api-" + base_domain + ":8443";
		break;
	}

	return dom;
}

Resolve.ExtractBaseDomain
=
function( domain )
{
	var base_domain = "";
	var bits = domain.split( "-" );
	
	if ( 1 == bits.length )
	{
		base_domain = bits[0];
	}
	else
	{
		base_domain = bits[1];
	}
	return base_domain;
}

/*
 *  PureJavacript, Auth.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 *
 *  License LGPL v2
 */

Auth                 = {}
Auth.Login           = Auth_Login;
Auth.Logout          = Auth_Logout;
Auth.LogoutAndReload = Auth_LogoutAndReload;

function Auth_Login( event )
{
	Submit( event, Auth.Login.Handler );
}

function Auth_Logout( event )
{
	Auth.UnsetIDTypeCookie();
	Auth.UnsetSessionIDTypeCookie();
	Auth.UnsetCookie( "email" );

	Call( "/auth/logout/", new Array(), Auth.Logout.Handler );
}

function Auth_LogoutAndReload()
{
	Auth.UnsetIDTypeCookie();
	Auth.UnsetSessionIDTypeCookie();
	Auth.UnsetCookie( "email" );

	Call( "/auth/logout/", new Array(), Auth.LogoutAndReload.Handler );
}

Auth.Login.Handler
=
function ( responseText )
{
	if ( "" != responseText )
	{
		var obj = JSON.parse( responseText );

		if ( obj && obj.idtype )
		{
			Auth.SetIDTypeCookie( obj.idtype );
			Auth.SetSessionIDTypeCookie( obj.sessionid );
			Auth.SetCookie( "email", obj.email, 1 );

			Redirect( obj.idtype ); // External Call
		}
		else
		{
			if ( obj["error"] == "INVALID_CREDENTIALS" )
			{
				var errorText = "Invalid username or password.";
			}
			else
			{
				var errorText = "Error logging in, please try again.";
			}

			var loginErrorDiv = document.getElementById( 'login-error' );

            if ( loginErrorDiv )
            {
				loginErrorDiv.innerHTML = "";
				loginErrorDiv.innerHTML = errorText;
            }
            else
            {
                alert( errorText );
            }
		}
	}
	else
	{
		Auth.Logout();
	}
}

Auth.Logout.Handler
=
function ( responseText )
{
	location.replace( location.protocol + "//" + location.hostname + "/" );
}

Auth.LogoutAndReload.Handler
=
function ( responseText )
{
	location.reload();
}

Auth.SetIDTypeCookie
=
function( idtype )
{
	Auth.SetCookie( "idtype", idtype, 1 );
}

Auth.SetSessionIDTypeCookie
=
function( sid )
{
	Auth.SetCookie( "sessionid", sid, 1 );
}

Auth.UnsetCookie
=
function ( cname )
{
	document.cookie = cname + "=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/";
}

Auth.UnsetIDTypeCookie
=
function ()
{
	document.cookie = "idtype=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/";
}

Auth.UnsetSessionIDTypeCookie
=
function ()
{
	document.cookie = "sessionid=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/";
}

Auth.SetCookie
=
function( cname, cvalue, exdays )
{
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires + ";path=/;";
}

/*
 *  PureJavacript, Base64.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 *
 *  License LGPL v2
 */

Base64 = {}
Base64.Encode = Base64Encode;
Base64.Decode = Base64Decode;

function Base64Encode( data )
{
	return btoa( data );
}

function Base64Decode( base64 )
{
	return atob( base64 );
}

/*
 *  PureJavacript, Call.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 *
 *  License LGPL v2
 */

function Call( endpoint, parameters, custom_handler )
{
	var command = Call.EncodeToString( parameters );
	var handler = (custom_handler) ? custom_handler : Call.DoNothing;

	if ( "http" != endpoint.substr( 0, 4 ) )
	{
		endpoint = Resolve() + endpoint;
	}

	Call.Post( endpoint, command, handler, 0, 0 );
}

Call.Post
=
function ( endpoint, command, handler, timeout, timeouts )
{
	var httpRequest = Call.CreateXMLHttpRequest( endpoint, command, handler, timeout, timeouts );
		httpRequest.send( command );
}

Call.CreateXMLHttpRequest
=
function( endpoint, command, handler, timeout, timeouts )
{
	var httpRequest = new XMLHttpRequest();
		httpRequest.open( "POST", endpoint, true );
		httpRequest.withCredentials   = true;
		httpRequest.timeout           = timeout;
		httpRequest.timeouts          = timeouts;
		httpRequest.myEndpoint        = endpoint;
		httpRequest.myCommand         = command;
		httpRequest.myResponseHandler = handler;

		httpRequest.onreadystatechange
		=
		function()
		{
			Call.OnReadyStateChange( httpRequest, endpoint, handler );
		}

		httpRequest.ontimeout
		=
		function()
		{
			if ( 10 < timeouts )
			{
				alert( "Giving up! Connections to the API server have timed out " + timeouts + " times." );
			}
			else
			if ( 3 < timeouts )
			{
				alert( "Warning! Connections to the API server have timed out several times. Will keep trying, but now might be a good time to check the quality of your Internet connection." );

				Call.Post( endpoint, command, handler, timeout * 2, timeouts + 1 );
			}
			else
			{
				Call.Post( endpoint, command, handler, timeout * 2, timeouts + 1 );
			}
		}

		httpRequest.setRequestHeader( "Content-type", "application/x-www-form-urlencoded" );

	return httpRequest;
}

Call.OnReadyStateChange
=
function( self, endpoint, handler )
{
	var status = self.status;

	switch ( self.readyState )
	{
	case 0:
	case 1:
	case 2:
	case 3:
		break;
		
	case 4:
		switch ( self.status )
		{
		case 200:
			console.log( "Called: " + endpoint );
			handler( self.responseText );
			break;

		case 404:
			console.log( "Invalid API endpoint: " + endpoint );
			break;

		case 501:
			console.log( "Required SQL Stored Procedure Not Implemented" );
			break;

		case 503:
			console.log( "Sorry, the API server is currently unavailable. Please try again later. (503)" );
			break;

		case 0:
			console.log( "The network timed out... (0)" );
			break;
			
		default:
			console.log( "Got status: " + status );
		}
		break;
		
	default:
		console.log( "Unexpected httpRequest ready state: " + self.readyState );
	}
}

Call.EncodeToString
=
function( parameters )
{
	var string = "";
	var sep    = "";

	for ( member in parameters )
	{
		if ( "" != member )
		{
			string += sep;
			string += member;
			string += "=";
			string += parameters[member];

			sep = "&";
		}
	}
	return string;
}

Call.DoNothing
=
function ()
{}

/*
 *  PureJavacript, Class.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

Class             = {}
Class.AddClass    = AddClass;
Class.RemoveClass = RemoveClass;

function AddClass( e, className )
{
	if ( ! Class.Contains( e, className ) )
	{
		if ( "" == e.className )
		{
			e.className = className;
		}
		else
		{
			e.className += " " + className;
		}
	}
}

function RemoveClass( e, className )
{
	if ( Class.Contains( e, className ) )
	{
		e.className = Class.Remove( e.className, className );
	}
}

Class.Remove
=
function( hay, needle )
{
	var ret = hay.replace( needle, "" ).trim();

	while ( -1 != ret.indexOf( "  " ) )
	{
		ret = ret.replace( "  ", " " );
	}
	
	return ret;
}

Class.Contains
=
function( e, className )
{
	//
	//	AddClass.Contains( { className="cls active" }, "active' );
	//
	//	var st = 10 - 6;
	//
	//	0123456789
	//	cls active
	//	01234

	var contains = false;

	if ( e.className && className )
	{
		var st = (e.className.length - className.length) - 1;

		if ( className == e.className )
		{
			contains = true;
		}
		else
		if ( 0 <= st )
		{
			if ( -1 != e.className.indexOf( " " + className + " " ) )
			{
				contains = true;
			}
			else
			if ( 0 == e.className.indexOf( className + " " ) )
			{
				contains = true;
			}
			else
			if ( st == e.className.indexOf( " " + className ) )
			{
				contains = true;
			}
		}
	}
	return contains;
}

/*
 *  PureJavacript, Cookie.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

Cookie            = {}
Cookie.Get        = GetCookie
Cookie.Set        = SetCookie
Cookie.Unset      = UnsetCookie

function GetCookie( search )
{
    var key = "";
    var val = "";

    if ( "" != search )
    {
        var bits = document.cookie.split( ";" );
        var n    = bits.length;

        for ( var i=0; i < n; i++ )
        {
            var keyval = bits[i].split( "=" );

            if ( (2 == keyval.length) && (keyval[0].trim() == search) )
            {
                val = keyval[1].trim();
                break;
            }
        }
    }

    return val;
}

function SetCookie( path, cname, cvalue, exdays )
{
    var d       = new Date(); d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = (0 != exdays) ? "expires="+d.toUTCString() + ";" : "";
	var cookie  = cname + "=" + cvalue + "; " + expires + " " + "path=/" + ";";
	
    document.cookie = cookie;
}

function UnsetCookie( name )
{
	document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/";
}

function SetIDTypeCookie( idtype )
{
	SetCookie( "/", "idtype", idtype, 1 );
}

function SetSessionIDTypeCookie( sid )
{
	SetCookie( "/", "sessionid", sid, 1 );
}

function UnsetIDTypeCookie()
{
	document.cookie = "idtype=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/";
}

function UnsetSessionIDTypeCookie()
{
	document.cookie = "sessionid=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/";
}

/*
 *  PureJavacript, CSVFile.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

function CSVFile( file_content )
{
	this.headers = new Array();
	this.rows    = new Array();

	this.parseContent( file_content );
}

CSVFile.prototype.getValueFor
=
function( row, labels )
{
	var value = "";
	var n     = labels.length;

	for ( var i=0; i < n; i++ )
	{
		var value = this.getValue( row, labels[i] );
		
		if ( "" != value ) break;
	}

	return value;
}

CSVFile.prototype.getValue
=
function( row, label )
{
	var value  = "";
	var column = -1;
	var n      = this.headers.length;
	
	for ( var i=0; i < n; i++ )
	{
		var text1 = label.toLowerCase().trim();
		var text2 = this.headers[i].toLowerCase().trim();
	
		if ( text1 == text2 )
		{
			column = i; break;
		}
	}

	if ( -1 != column )
	{
		var array = this.rows[row];
			value = array[column];
	}
	
	return value;
}

CSVFile.prototype.getNrOfRows
=
function()
{
	return this.rows.length;
}

CSVFile.prototype.CSVLineRE = new RegExp('("[\\w ,]+" ?|[\\w ]*), ?("[\\w ,]+" ?|[\\w ]*)$');

CSVFile.prototype.parseContent
=
function( file_content )
{
	var line_reader = new CSVFile.LineReader( file_content, 10000 );
	var line  = line_reader.readLine();
	if ( false !== line )
	{
        var trimmed = line.trim(); //trims CRs from Mac apps such as Numbers.
        //if (!this.CSVLineRE.test(trimmed)) throw "Header of file does not match expected Excel/LibreOffice CSV format."
		this.headers = CSVFile.SplitAndTrim( trimmed );


		while ( (false !== (line = line_reader.readLine())) )
		{
			var fields = CSVFile.SplitAndTrim( line );

			if ( "" != fields.join( "" ) )
			{
				this.rows.push( fields );
			}
		}
	}
}

CSVFile.SplitAndTrim
=
function( line )
{
	var array = new Array();
	var bits  = CSVFile.SplitWhileRespectingQuotes( line, "," );
	var n     = bits.length;
	
	for ( var i=0; i < n; i++ )
	{
		var field = bits[i];
			field = field.trim();

		if ( "" != field )
		{
			var x     = field.length - 1;

			if ( '"' == field.charAt( x ) ) field = field.substring( 0, x );
			if ( '"' == field.charAt( 0 ) ) field = field.substring( 1    );

			field = field.trim();
		}
	
		array.push( field );
	}

	return array;
}

CSVFile.SplitWhileRespectingQuotes
=
function( line, delimiter )
{
	var array = Array();
	var out   = true;
	var s     = 0;
	var n     = line.length;
	
	for ( var i=0; i < n; i++ )
	{
		switch ( line.charAt( i ) )
		{
		case '"':
			out = !out;
			break;
			
		case delimiter:
			if ( out )
			{
				array.push( line.substring( s, i ) );
				s = i + 1;
			}
			break;
		}
	}
	
	if ( s < n )
	{
		array.push( line.substring( s, n ) );
	}
	
	return array;
}

CSVFile.LineReader
=
function( file_content, limit )
{
	this.content = file_content;
	this.pos     = 0;
	this.lines   = 0;
	this.limit   = limit;
}

CSVFile.LineReader.prototype.readLine
=
function()
{
	var line = false;
	var loop = true;

	if ( ++this.lines < this.limit )
	{
		if ( this.pos < this.content.length )
		{
			line = "";
		
			while ( this.pos < this.content.length )
			{
				var ch = this.content[this.pos++];
				
				if ( '\n' == ch )
				{
					break;
				}
				else
				{
					line += ch;
				}
			}
		}
	}

	return line;
}

/*
 *  PureJavacript, Datalist.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

function Datalist( elements )
{
	var n = elements.length;
	
	for ( var i=0;i < n; i++ )
	{
		var e = elements[i];
	
		if ( Class.Contains( e, "datalist" ) ) Datalist.Setup( e );
	}

	document.addEventListener( "keydown", Datalist.KeyHandler );
}

Datalist.Setup
=
function( datalist )
{
	//datalist.autocomplete = "off";

	if ( datalist.hasAttribute( "data-kind" ) )
	{
		var kind       = datalist.getAttribute( "data-kind" );
		var parameters = GetSearchValues();
			parameters.kinds = kind;
	
		Call( "/api/multiselect/", parameters, function( responseText ) { Datalist.SetupListItems( datalist, responseText ); } );
	}
	else
	{
		Datalist.SetupFunctions( datalist );
	}
}

Datalist.SetupListItems
=
function( datalist, responseText )
{
	var json = JSON.parse( responseText );
	var kind = datalist.getAttribute( "data-kind" );

	var id = datalist.getAttribute( "id" );
	var ul = document.createElement( "UL" );
		ul.className = "datalist_list";
		ul.setAttribute( "id", id + "-div" );
		ul.style.display = "none";

	datalist.parentNode.insertBefore( ul, datalist.nextSibling );
	datalist.sublist  = ul;
	//datalist.cascade  = onchange;
	datalist.onchange = null;
	
	if ( "OK" == json.status )
	{
		var n = json.results.length;

		for ( var i=0; i < n; i++ )
		{
			var tuple = json.results[i];
			
			if ( tuple.name == kind )
			{
				var m = tuple.tuples.length;
				
				for ( var j=0; j < m; j++ )
				{
					var li = document.createElement( "LI" );
						li.innerHTML = tuple.tuples[j].text;
						li.dataListItemType = "prefixed";

					ul.appendChild( li );
				}

				for ( var j=0; j < m; j++ )
				{
					var li = document.createElement( "LI" );
						li.innerHTML = tuple.tuples[j].text;
						li.dataListItemType = "contains";

					ul.appendChild( li );
				}

				break;
			}
		}
	}
	
	Datalist.SetupFunctions( datalist );
}

Datalist.SetupFunctions
=
function( datalist )
{
	var list_items = datalist.sublist.getElementsByTagName( "LI" );
	var n = list_items.length;
			
	for ( var i=0; i < n; i++ )
	{
		var li = list_items[i];
				
			li.onmouseover = Datalist.OnMouseOver;
			li.onmouseout  = Datalist.OnMouseOut;
			li.onclick     = Datalist.OnClick;
	}

	datalist.oninput    = function() { Datalist.OnInput   ( event, datalist ); };
	datalist.onfocusout = function() { Datalist.OnFocusOut( event, datalist ); };
}

Datalist.OnInput
=
function( event, datalist )
{
	var div = datalist.sublist;

	if ( ! div.ignoreFocus )
	{
		div.style.display = "block";

		var filter = event.target.value;
		
		var list_items = div.getElementsByTagName( "LI" );
		var n          = list_items.length;
		
		for ( var i=0; i < n; i++ )
		{
			var li = list_items[i];

			var lcl = li.innerHTML.toLowerCase();
			var lcf = filter.toLowerCase();

			switch ( li.dataListItemType )
			{
			case "prefixed":

				// Case insensitive starts With
				if ( 0 != lcl.indexOf( lcf ) )
				{
					li.style.display = "none";
				}
				else
				{
					li.style.display = "block";
				}
				break;

			case "contains":

				// Case insensitive matching
				if ( -1 == lcl.indexOf( lcf ) )
				{
					li.style.display = "none";
				}
				else
				{
					li.style.display = "block";
				}
				break;
			}
		}
	}
	else
	{
		div.ignoreFocus = false;
	}
}

Datalist.OnMouse
=
function( event, selected )
{
	var datalist_list   = event.target.parentNode;
	var list_items = datalist_list.getElementsByTagName( "LI" );
	var n = list_items.length;
			
	for ( var i=0; i < n; i++ )
	{
		var li = list_items[i];
		
		RemoveClass( li, "selected" );
	}

	if ( selected ) AddClass( event.target, "selected" );
}

Datalist.OnMouseOver = function( event ) { Datalist.OnMouse( event,  true ); }
Datalist.OnMouseOut  = function( event ) { Datalist.OnMouse( event, false ); }

Datalist.OnClick
=
function( event )
{
	var li = event.target;
	var datalist_list = li.parentNode;
	var datalist      = datalist_list.previousSibling;

	if ( datalist )
	{
		datalist.value = li.innerHTML.trim();

		datalist_list.style.display = "none";
		datalist_list.ignoreFocus   = true;

		if ( datalist.form.hasAttribute( "data-change-url" ) )
		{
			var evt = new Object();
				evt.target = datalist;
		
			Save( evt );
		}
	}
}

Datalist.OnFocusOut
=
function( event, datalist )
{
	var list_items = datalist.sublist.getElementsByTagName( "LI" );
	var hide       = true;
	var n          = list_items.length;
			
	for ( var i=0; i < n; i++ )
	{
		var li = list_items[i];

		if ( Class.Contains( li, "selected" ) )
		{
			hide = false;
			break;
		}
	}

	if ( hide ) Datalist.HideDatalists( document.getElementsByTagName( "UL" ) );
}

Datalist.KeyHandler
=
function( evt )
{
	evt = evt || window.event;

	var isTab    = ( 9 == evt.keyCode);
	var isEnter  = (13 == evt.keyCode);
	var isEscape = (27 == evt.keyCode);
	var isUp     = (38 == evt.keyCode);
	var isDown   = (40 == evt.keyCode);

	if ( isTab )
	{
		Datalist.HideDatalists( document.getElementsByTagName( "UL" ) );
	}
	else
	if ( isEnter )
	{
		Datalist.ClickCurrentSelection();

		evt.preventDefault();
	}
	else
	if ( isEscape )
	{
		Datalist.HideDatalists( document.getElementsByTagName( "UL" ) );
	}
	else
	if ( isUp )
	{
		Datalist.MoveCurrentSelection( -1 );
	}
	else
	if ( isDown )
	{
		Datalist.MoveCurrentSelection( 1 );
	}
}

Datalist.HideDatalists
=
function( elements )
{
	var n = elements.length;
	
	for ( var i=0; i < n; i++ )
	{
		var e = elements[i];
	
		if ( Class.Contains( e, "datalist_list" ) )
		{
			e.style.display = "none";
			e.scrollTop     = 0;

			Datalist.UnselectItems( e );
		}
	}
}

Datalist.UnselectItems
=
function( datalist_list )
{
	var elements = datalist_list.getElementsByTagName( "LI" );
	var n        = elements.length;

	for ( var i=0; i < n; i++ )
	{
		var e = elements[i];

		RemoveClass( e, "selected" );
	}
}

Datalist.MoveCurrentSelection
=
function( delta )
{
	var datalist = Datalist.FindActiveDatalist();
	var elements = datalist.getElementsByTagName( "LI" );
	var n        = elements.length;
	var i        = -1;
	var p        = null;
	var s        = null;
	
	for ( i=0; i < n; i++ )
	{
		var e = elements[i];

		if ( Class.Contains( e, "selected" ) )
		{
			p = e;
			break;
		}
	}

	if ( (-1 == delta) && (i != n) )
	{
		for ( var j=i-1; j >= 0; j-- )
		{
			var e = elements[j];

			if ( null !== e.offsetParent )
			{
				s = e;
			
				AddClass   ( e, "selected" );
				RemoveClass( p, "selected" );
				break;
			}
		}
	}
	else
	if ( 1 == delta )
	{
		if ( i == n ) i = -1;

		for ( var j=i+1; j < n; j++ )
		{
			var e = elements[j];

			if ( null !== e.offsetParent )
			{
				s = e;
			
				AddClass   ( e, "selected" );
				RemoveClass( p, "selected" );
				break;
			}
		}
	}
	
	if ( s )
	{
		console.log( "offsetTop: " + s.offsetTop );

		if ( (1 == delta) && (s.offsetTop > 439) )
		{
			s.offsetParent.scrollTop += s.scrollHeight + 1;
		}
	}
}

Datalist.ClickCurrentSelection
=
function()
{
	var datalist = Datalist.FindActiveDatalist();

	if ( datalist )
	{
		var elements = datalist.getElementsByTagName( "LI" );
		var n        = elements.length;
		var i        = -1;
		
		for ( i=0; i < n; i++ )
		{
			var e = elements[i];
			
			if ( Class.Contains( e, "selected" ) )
			{
				e.click();
				break;
			}
		}
	}
}

Datalist.FindActiveDatalist
=
function()
{
	var ret      = null;
	var elements = document.getElementsByTagName( "UL" );
	var n        = elements.length;
	
	for ( var i=0; i < n; i++ )
	{
		var e = elements[i];
	
		if ( Class.Contains( e, "datalist_list" ) && (null != e.offsetParent) )
		{
			ret = e;
			break;
		}
	}
	return ret;
}

/*
 *  PureJavacript, DataStorage.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

DataStorage         = {}
DataStorage.Local   = {}
DataStorage.Session = {}

DataStorage.Exists
=
function()
{
	return typeof( Storage ) !== "undefined";
}

DataStorage.Local.SetItem
=
function( key, value )
{
	var success = false;

	if ( typeof( Storage ) !== "undefined" )
	{
		if ( value && "" != value )
		{
			window.localStorage.setItem( key, value );
		
			success = (window.localStorage.key == value);
		}
	}
	return success;
}

DataStorage.Local.GetItem
=
function( key )
{
	var value = null;

	if ( DataStorage.Exists() )
	{
		value = window.localStorage.getItem( key );
	}
	return value;
}

DataStorage.Local.RemoveItem
=
function( key )
{
	var success = false;

	if ( typeof( Storage ) !== "undefined" )
	{
		window.localStorage.removeItem( key );
		
		success = (window.localStorage.key == null);
	}
	return success;
}

DataStorage.Local.HasItem
=
function( key )
{
	var success = false;

	if ( typeof( Storage ) !== "undefined" )
	{
		success = window.localStorage.hasOwnProperty( key );
	}
	return success;
}

DataStorage.Session.SetItem
=
function( key, value )
{
	var success = false;

	if ( typeof( Storage ) !== "undefined" )
	{
		if ( value && "" != value )
		{
			window.sessionStorage.setItem( key, value );
		
			success = (window.sessionStorage.key == value);
		}
	}
	return success;
}

DataStorage.Session.GetItem
=
function( key )
{
	var value = null;

	if ( DataStorage.Exists() )
	{
		value = window.sessionStorage.getItem( key );
	}
	return value;
}

DataStorage.Session.RemoveItem
=
function( key )
{
	var success = false;

	if ( typeof( Storage ) !== "undefined" )
	{
		window.sessionStorage.removeItem( key );
		
		success = (window.sessionStorage.key == null);
	}
	return success;
}

DataStorage.Session.HasItem
=
function( key )
{
	var success = false;

	if ( typeof( Storage ) !== "undefined" )
	{
		success = window.sessionStorage.hasOwnProperty( key );
	}
	return success;
}

/*
 *  PureJavacript, Datetime.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

Datetime         = {}
Datetime.IsValid = DateIsValid
Datetime.ToYMD   = YMDDate

function DateIsValid( $datetime )
{
	var is_date = false;

	switch ( $datetime )
	{
	case null:
	case "NULL":
	case "null":
	case "":
	case "0":
	case "0000-00-00":
	case "0000-00-00 00:00:00":
		break;
		
	default:
		is_date = true;
	}

	return is_date;
}

function YMDDate( date_string )
{
	var ymd_date = null;
	var ymd      = new Array();

	date_string = date_string.replace( /%2F/g, "/" );
	
	if ( -1 !== date_string.indexOf( "/" ) )
	{
		var parts = date_string.split( "/" );
		
		switch ( parts.length )
		{
		case 3:
			ymd[0] = (2 == parts[2].length) ? "20" + parts[2] : parts[2];
			ymd[1] = parts[1];
			ymd[2] = parts[0];
			break;
			
		case 2:
			ymd[0] = new Date().getFullYear();
			ymd[1] = parts[1];
			ymd[2] = parts[0];
		}
	}
	else
	if ( -1 !== date_string.indexOf( "-" ) )
	{
		ymd = date_string.split( "-" );
	}
	
	if ( 3 == ymd.length )
	{
		if ( (3 == ymd.length) && (4 == ymd[0].length) && (2 == ymd[1].length) && (2 == ymd[2].length) )
		{
			var year  = parseInt( ymd[0] );
			var month = parseInt( ymd[1] );
			var day   = parseInt( ymd[2] );

			if ( YMDDate.IsMonth( month ) && YMDDate.IsDayOfMonth( day, month ) )
			{
				ymd_date = ymd.join( '-' );
			}
		}
	}
	
	return ymd_date;
}

YMDDate.IsMonth
=
function( month )
{
	return (1 <= month) && (month <= 12);
}

YMDDate.IsDayOfMonth
=
function( day, month )
{
	switch ( month )
	{
	case 1:
	case 3:
	case 5:
	case 7:
	case 8:
	case 10:
	case 12:
		return (1 <= day) && (day <= 31);

	case 4:
	case 6:
	case 9:
	case 11:
		return (1 <= day) && (day <= 30);

	case 2:
		return (1 <= day) && (day <= 29);

	default:
		return false;
	}
}

/*
 *  PureJavacript, Element.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

Elements          = {}
Elements.Toggle   = Toggle
Elements.Show     = Toggle.Show
Elements.Hide     = Toggle.Hide
Elements.ShowHide = ShowHide;
Elements.HideShow = null;

function Toggle( id )
{
	var ret = null;
	var e = document.getElementById( id );
	
	if ( e )
	{
		if ( null === e.offsetParent )
		{
			ret = Toggle.Show( e );
		}
		else
		{
			ret = Toggle.Hide( e );
		}
	}
	
	return ret;
}

Toggle.Show
=
function ( e )
{
    switch ( e.tagName )
    {
    case "TABLE":
        e.style.display    = "table";
        break;

    case "TR":
        e.style.display    = "table-row-group";
        break;

    case "TH":
        e.style.display    = "table-cell";
        break;

    case "TD":
        e.style.display    = "table-cell";
        break;

    default:
        e.style.display    = "block";
    }

	e.style.visibility = "visible";

	return true;
}

Toggle.Hide
=
function ( e )
{
	e.style.display    = "none";
	e.style.visibility = "hidden";

	return false;
}

Elements.HideShow
=
function ( cls, id )
{
    var elements = document.getElementsByClassName( cls );
    var e        = document.getElementById( id );
    var n        = elements.length;

    for ( var i=0; i < n; i++ )
    {
        Toggle.Hide( elements[i] );

        Class.RemoveClass( elements[i], "active" );
    }

    if ( e )
    {
        Toggle.Show( e );
        Class.AddClass( e, "active" );
    }

    return false;
}

function ShowHide( id, show_id, hide_id )
{
	var self   = document.getElementById( id );
	var show_e = document.getElementById( show_id );
	var hide_e = document.getElementById( hide_id );
	
	if ( show_e && hide_e )
	{
		Toggle.Hide( hide_e );
		Toggle.Show( show_e );
	}

	if ( self )
	{
		ShowHide.MakePeersInactive( self );
		ShowHide.MakeActive( self );
	}
}

ShowHide.MakePeersInactive
=
function( e )
{
	if ( e.parentNode && e.parentNode.parentNode )
	{
		var children = e.parentNode.parentNode.getElementsByTagName( "A" );
		var n        = children.length;
		
		for ( var i=0; i < n; i++ )
		{
			var child = children[i];
		
			ShowHide.MakeInactive( child );
		}
	}
}

ShowHide.MakeActive
=
function( e )
{
	Class.AddClass( e, "active" );
}

ShowHide.MakeInactive
=
function( e )
{
	Class.RemoveClass( e, "active" );
}

/*
 *  PureJavacript, Enum.js
 *
 *  Copyright 2017, CrossAdaptive
 */

function Enum( values )
{
    var e = {}
    var n = values.length;

    for ( var i=0; i < n; i++ )
    {
        var name = values[i]

        e[name] = name;
    }

    return e;
}

/*
 *  PureJavacript, Forms.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

Forms                      = {}
Forms.GetValues            = GetFormValues
Forms.InsertResponseValues = InsertResponseValues
Forms.InsertValues         = InsertFormValues
Forms.Save                 = Save
Forms.Submit               = Submit
Forms.SubmitTableValues    = SubmitTableValues
Forms.Validate             = Validate

function GetFormValues( form )
{
	var object = new Object;

	if ( form && form.elements )
	{
		var n = form.elements.length;

		for ( var i=0; i < n; i++ )
		{
			var e     = form.elements[i];
			var key   = e.name;
			var value = e.value;

            if ( e.hasAttribute( "data-date-format" ) )
            {
                value = GetFormValues.ConvertDateToMySQLDateFormatFrom( value, e.getAttribute( "data-date-format" ) );
            }

			switch ( e.type )
			{
			case "checkbox":
				if ( ! e.disabled && e.checked )
				{
					value = e.checked ? value : "";
				}
                else
                {
                    value = "";
                }
				break;

			case "radio":
				var v = encodeURIComponent( value );
				if ( ! e.checked )
				{
					key   = null;
					value = null;

					object[v] = 0;
				}
				else
				{
					object[v] = 1;
				}
				break;

			case "hidden":
				if ( "" != e.hasAttribute( "data-table" ) )
				{
					value = GetFormValues.ConvertTableToJSON( e.getAttribute( "data-table" ) );
				}
				break;
			}

			switch ( e.tagName )
			{
			case "BUTTON":
				value = e.innerHTML.trim();
				break;
			}
			
			if ( key && value )
			{
				if ( GetFormValues.IsTimeComponent( key ) )
				{
					key   = GetFormValues.GetTimePrefix( key );
					value = GetFormValues.ExtractTime( form, key );
				}
			
				if ( object[key] )
				{
					object[key] += ("," + encodeURIComponent( value ));
				}
				else
				{
					object[key] = encodeURIComponent( value );
				}
			}
		}
	}
	else
	{
		console.log( "GetFormValues: null form passed!" );
	}
	return object;
}

function InsertResponseValues( formID, keyName, responseText )
{
	var status     = false;
	var parameters = GetSearchValues();
	
	if ( (null == keyName) || ("" != parameters[keyName]) )
	{
		var json = JSON.parse( responseText );
		var form = document.getElementById( formID );

		if ( json && form && ("OK" == json.status) && (1 == json.results.length) )
		{
			InsertFormValues( form, json.results[0] );

			status = true;
		}
	}
	return status;
}

function InsertFormValues( form, object )
{
	for ( var member in object )
	{
		if ( form[member] )
		{
			var input = form[member]; // May return one item or node list.
			var value = DecodeHTMLEntities( object[member] );

            if ( ("SELECT" != input.tagName) && input.length )
            {
                var n = input.length;

                for ( var i=0; i < n; i++ )
                {
                    if ( "radio" == input[i].type )
                    {
                        if ( value == input[i].value )
                        {
                            input[i].checked = true;
                        }
                    }
                }
            }
            else
			if ( input  && value )
			{
				if ( "INPUT" == input.tagName )
				{
					var ph = input.placeholder;
				
					if ( "checkbox" == input.type )
					{
						input.checked = (("0" == value) || ("" == value)) ? false : true;
					}
					else
                    if ( "radio" == input.type )
                    {
                        if ( value == input.value )
                        {
                            input.checked = true;
                        }
                    }
                    else
					{
						input.value = value;
					}
					input.placeholder = "";
					input.placeholder = ph;
				}
				else
				if ( "SELECT" == input.tagName )
				{
					if ( input.setValue )
					{
						input.setValue( value );
					}
					else
					{
						input.value = value;
					}
					
					input.setAttribute( "data-value", value );
				}
				else
				if ( "TEXTAREA" == input.tagName )
				{
					value = value.replace( /<br>/g, "\n" );
				
					input.innerHTML = value;

					if ( input.onchange )
					{
						var evt = new Object();
							evt.target = input;
						
						input.onchange( evt );
					}
				}
			}
		}
	}
}

function Save( event, handler )
{
	var element     = event.target;
	var form        = event.target.form;
	var parameters  = GetFormValues( form );
	var url         = form.getAttribute( "data-change-url" );

	if ( ! parameters.hasOwnProperty( "USER" ) )
	{
	//	parameters.USER = Session.USER;
	}

	switch ( element.type )
	{
	case 'checkbox':
		parameters.name  = element.name;
		parameters.value = element.checked ? "1" : "0";
		break;
	
	case 'select-one':
	case 'text':
	default:
		parameters.name  = encodeURIComponent( element.name  );
		parameters.value = encodeURIComponent( element.value );
	}

    if ( element.hasAttribute( "id" ) )
    {
        parameters.target_id = element.getAttribute( "id" );
    }

	Call( Resolve() + url, parameters, handler ? handler : Save.Handler );
}

Save.Handler
=
function( responseText )
{
	console.log( responseText );
}

function Submit( event, custom_handler )
{
	var form       = event.target;
	var apihost    = Resolve();
	var handler    = custom_handler ? custom_handler : Submit.SubmitDefaultHandler;
	var parameters = GetFormValues( form );

	var submit     = form.elements['submit'];

	if ( submit && ("delete" == submit.value.toLowerCase()) )
	{
		if ( form && form.hasAttribute( "data-delete-url" ) )
		{
			var url     = form.getAttribute( "data-delete-url" );
			var handler = form.handler ? form.handler : handler;

			Call( apihost + url, parameters, handler );
		}
	}
	else
	if ( form && form.hasAttribute( "data-url" ) )
	{
		var url        = form.getAttribute( "data-url" );
		var handler    = form.handler ? form.handler : handler;

		Call( apihost + url, parameters, handler );
	}
	else
	if ( form.hasAttribute( "data-submit-url" ) )
	{
		var url        = form.getAttribute( "data-submit-url" );
		var handler    = form.handler ? form.handler : handler;

		Call( apihost + url, parameters, handler );
	}
	return false;
}

Submit.SubmitDefaultHandler
=
function( responseText )
{
	var json = JSON.parse( responseText );
	
	if ( "OK" == json.status )
	{
        Locations.Up();
	}
}

Submit.SubmitReloadHandler
=
function( responseText )
{
	var json = JSON.parse( responseText );
	
	if ( "OK" == json.status )
	{
        location.reload();
	}
    else
    {
        alert( "Error: " + json.error )
    }
}

function SubmitTableValues( event, verify )
{
	var target_id = event.target.getAttribute( "data-target" );
	var table     = document.getElementById( target_id );
	var endpoint  = table.getAttribute( "data-url" );
	
	if ( table && table.rows && (1 < table.rows.length) )
	{
		var i = SubmitTableValues.NextVerifiedRow( table, verify, 0 );

		if ( i )
		{
			SubmitTableValues.DoCall( endpoint, table, i, verify );
		}
		else
		{
			alert( "Finished submitting table values." );
		}
	}
	else
	{
		Call( "/auth/session/", new Object(), SubmitTableValues.Finish );
	}
	return false;
}

SubmitTableValues.NextVerifiedRow
=
function( table, verify, i )
{
	var j           = false;
	var progress_id = table.getAttribute( "data-progress" );
	var progress    = progress_id ? document.getElementById( progress_id ) : null;

	var loop = true;

	while ( table.rows[++i] )
	{
		if ( progress )
		{
			progress.style.width = (i / table.rows.length) * 100 + "%";
		}

		if ( verify( table.rows[i] ) )
		{
			j = i;
			break;
		}
	}

	if ( progress && ! table.rows[i] )
	{
		progress.style.width = "100%";
	}

	if ( progress && (i == table.rows.length) )
	{
		progress.style.background = "green";
	}

	return j;
}


SubmitTableValues.Handler
=
function( responseText, table, i, verify )
{
	var endpoint = table.getAttribute( "data-url" );
	var json     = JSON.parse( responseText );

	SubmitTableValues.MarkupRow( json, table, i );

	var i = SubmitTableValues.NextVerifiedRow( table, verify, i );

	if ( false !== i )
	{
		SubmitTableValues.DoCall( endpoint, table, i, verify );
	}
	else
	{
		var progress_id = table.getAttribute( "data-progress" );
		var progress    = document.getElementById( progress_id );

			progress.style.width = "100%";

		Call( "/auth/session/", new Object(), SubmitTableValues.Finish );
	}
}

SubmitTableValues.DoCall
=
function( endpoint, table, i, verify )
{
	var parameters = SubmitTableValues.ConvertTRToParameters( table.rows[i] );

	Call
	(
		endpoint,
		parameters,
		function ( responseText )
		{
			var table_copy = table;
			var i_copy     = i;
			var v_copy     = verify;
	 
			SubmitTableValues.Handler( responseText, table_copy, i_copy, v_copy );
		}
	);
}

SubmitTableValues.MarkupRow
=
function( json, table, i )
{
	if ( "OK" == json.status )
	{
		table.rows[i].style.background = "green";
		table.rows[i].style.color      = "white";
	}
	else
	if ( "EXISTS" == json.error )
	{
		table.rows[i].style.background = "#888";
		table.rows[i].style.color      = "#ddd";
	}
	else
	{
		table.rows[i].style.background = "red";
		table.rows[i].style.color      = "white";
	}
}

SubmitTableValues.ConvertTRToParameters
=
function( tr )
{
	var parameters = false;
	var n          = tr.cells.length;
	
	for ( var i=0; i < n; i++ )
	{
		if ( "TD" == tr.cells[i].tagName )
		{
			var key = encodeURIComponent( tr.cells[i].getAttribute( "data-name" ) );
			var val = encodeURIComponent( tr.cells[i].innerHTML );
		
			if ( key && val )
			{
				parameters      = parameters ? parameters : new Object();
				parameters[key] = val;
			}
		}
	}
	return parameters;
}

SubmitTableValues.Finish
=
function( responseText )
{
	alert( "Finished submitting table values." );
}

function Validate( event, handler )
{
	var valid  = true;
	var form   = event.target;
	var n      = form.elements.length;

	form.checkValidity();
	
	for ( var i=0; i < n; i++ )
	{
		var element   = form.elements[i];

		if ( element.hasAttribute( "required" ) )
		{
			var name      = element.name;
			var value     = element.value;
			var validated = element.validity.valid;

			Validate.AddClass( element, "checked" );

			if ( false === validated )
			{
				valid = false;
			}
		}
	}

	if ( valid && handler )
	{
		handler( event );
	}
	else
	{
		alert( "Please complete the form before submitting." );
	}
	
	return false;
}

function WordLimit( elements )
{
	var n = elements.length;
	
	for ( var i=0; i < n; i++ )
	{
		var e = elements[i];
	
		if ( ("TEXTAREA" == e.tagName) && e.hasAttribute( "data-limit" ) )
		{
			e.oninput  = WordLimit.OnInput;
		}
	}
}

WordLimit.OnInput
=
function( event )
{
	var textarea  = event.target;
	var limit     = textarea.getAttribute( "data-limit" );
	var target_id = textarea.getAttribute( "data-target" );
	var target    = target_id ? document.getElementById( target_id ) : null;
	var last_char = WordLimit.LastChar  ( textarea.value );
	var words     = WordLimit.CountWords( textarea.value );
	var truncated = false;
	
	if ( limit < words )
	{
		textarea.value = WordLimit.TruncateTextToWords( textarea.value, limit );

		words = WordLimit.CountWords( textarea.value );

		truncated = true;
	}

	if ( truncated )
	{
		switch ( last_char )
		{
		case  " ":
		case "\n":
			alert( "Warning, your have reached the word limit!" );
		}
	}

	if ( target ) target.innerHTML = (words) + " words";
}

WordLimit.CountWords
=
function( value )
{
	return value.split( " " ).length;
}


WordLimit.TruncateTextToWords
=
function( value, limit )
{
	var words     = 0;
	var i         = -1;
	
	while ( -1 != (i = WordLimit.NextWhitespace( value, i + 1 )) )
	{
		words++;

		if ( limit < words ) break;
	}

	if ( -1 == i ) i = value.length;

	return value.substring( 0, i );
}

WordLimit.LastChar
=
function( value )
{
	return value.length ? value.substring( value.length - 1, value.length ) : null;
}


WordLimit.NextWhitespace
=
function( value, i )
{
	var s = value.indexOf(  " ", i );
	var n = value.indexOf( "\n", i );
	var r = -1;

	if ( (-1 != s) && (-1 != n) )
	{
		r = Math.min( s, n );
	}
	else
	if ( -1 != s )
	{
		r = s;
	}
	else
	if ( -1 != n )
	{
		r = n;
	}

	return r;
}

GetFormValues.ConvertTableToJSON
=
function( table_id )
{
	var tuples = new Array();
	var table = document.getElementById( table_id );

	if ( table )
	{
		var rows   = table.getElementsByTagName( "TR" );
		var n      = rows.length;
		
		for ( var i=0; i < n; i++ )
		{
			var tuple = new Object();
			var row   = rows[i];
			
			var fields = row.getElementsByTagName( "TD" );
			var m      = fields.length;
		
			for ( var j=0; j < m; j++ )
			{
				var field = fields[j];

				if ( field.hasAttribute( "data-name" ) )
				{
					var key   = field.getAttribute( "data-name" );
					var value = field.innerHTML.trim();
					
					tuple[key] = value;
				}
			}
			
			tuples.push( tuple );
		}
	}
	
	return JSON.stringify( tuples );
}

GetFormValues.IsTimeComponent
=
function( name )
{
	return (-1 !== name.indexOf( "_hour" ));
}

GetFormValues.GetTimePrefix
=
function( name )
{
	var index = name.indexOf( "_hour" );
	
	return name.substring( 0, index );
}

GetFormValues.ExtractTime
=
function( form, key )
{
	var ret         = "";
	var key_hour    = key + "_hour";
	var key_minutes = key + "_minutes";
	var key_seconds = key + "_seconds";

    ret += form.elements[key_hour]    ? form.elements[key_hour   ].value : "00";
    ret += ":";
	ret += form.elements[key_minutes] ? form.elements[key_minutes].value : "00";
    ret += ":";
    ret += form.elements[key_seconds] ? form.elements[key_seconds].value : "00";

	return ret;
}

GetFormValues.ConvertDateToMySQLDateFormatFrom
=
function( date_value, date_format )
{
    var converted = "0000-00-00";

    var delimiter = (-1 != date_value.indexOf( "/" )) ? "/" : "-";
    var bits      = date_value.split( delimiter );

    if ( 3 == bits.length )
    {
        var yy = "";
        var mm = "";
        var dd = "";

        switch ( date_format )
        {
        case "DD-MM-YY":
        case "DD/MM/YY":
        case "DD-MM-YYYY":
        case "DD/MM/YYYY":
            dd = bits[0];
            mm = bits[1];
            yy = bits[2];
            break;

        case "MM-DD-YY":
        case "MM/DD/YY":
        case "MM-DD-YYYY":
        case "MM/DD/YYYY":
            mm = bits[0];
            dd = bits[1];
            yy = bits[2];
            break;

        case "YY-MM-DD":
        case "YYYY-MM-DD":
        default:
            yy = bits[0];
            mm = bits[1];
            dd = bits[2];
        }

        var year = parseInt( yy )

        if ( !isNaN( year ) && (year < 100) )
        {
            yy = (year < 50) ? 2000 + year : 1900 + year;
        }

        converted = "" + yy + "-" + GetFormValues.ZeroPad( mm ) + "-" + GetFormValues.ZeroPad( dd );
    }

    return converted;
}

GetFormValues.ZeroPad
=
function( value )
{
    var val = parseInt( value );

    if ( isNaN( val ) )
    {
        return "00";
    }
    else
    {
        return (val <= 9) ? "0" + val : "" + val;
    }
}

Validate.HasClass
=
function ( element, cls )
{
	var classes = element.className;
	
	return (-1 != classes.indexOf( cls ));
}

Validate.AddClass
=
function ( element, cls )
{
	if ( element && cls )
	{
		var classes = element.className;
		
		if ( -1 == classes.indexOf( cls ) )
		{
			element.className += (" " + cls);
		}
	}
}

Validate.RemoveClass
=
function ( element, cls )
{
	var classes = element.className;
	var f = 0;
	var n = cls.length;

	if ( (-1 != classes.indexOf( " " + cls )) || (-1 != classes.indexOf( cls + " " )) || (-1 != classes.indexOf( cls )) )
	{
		var f = classes.indexOf( cls );

		if ( (0 < f) && (' ' == classes[f - 1]) ) f--;
	
		element.className = classes.substring( 0, f ) + classes.substring( f + n + 1 );
	}
}

/*
 *  PureJavacript, Geocode.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

function Geocode( latitude, longitude, handler )
{
	var GOOGLE_URL = "https://maps.googleapis.com";
	
	var parameters = new Object();
		parameters.latlng = latitude + "," + longitude;

    /*
     *  https://maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452&key=API_KEY
     */

	Call( GOOGLE_URL, "/maps/api/geocode/json/", parameters, handler );
}

/*
 *  PureJavacript, Helper.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

function GetTuple( obj )
{
	var tuple = null;

	if ( obj instanceof Array )
	{
		for ( index in obj )
		{
			tuple = GetTuple( obj[index] );
			break;
		}
	}
	else
	{
		tuple = obj;
	}

	return tuple;
}

function LimitOffsetParameters( json )
{
	var parameters = null;
	var offset     = ("" != json.offset) ? parseInt( json.offset ) : 0;
	var limit      = ("" != json.limit ) ? parseInt( json.limit  ) : 0;
	
	if ( limit )
	{
		parameters        = new Object();
		parameters.limit  = limit;
		parameters.offset = limit + offset;
	}
	
	return parameters;
}

function Object_Get( $object, $member )
{
	if ( $object.hasOwnProperty( $member ) )
	{
		return decodeURI( $object[$member] );
	}
	else
	{
		return "";
	}
}

function Replace( text, array )
{
	for ( var member in array )
	{
		var key   = "%" + member + "%";
		var value = array[member];

		while ( -1 != text.indexOf( key ) )
		{
			text = text.replace( key, value );
		}
	}
	return text;
}

/*
 *  PureJavacript, HTMLEntities.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

HTMLEntities        = {}
HTMLEntities.Encode = HTMLEntitiesEncode
HTMLEntities.Decode = DecodeHTMLEntities

/*
 *	The following implementations were copied from the following opensource implementations:
 *	
 *	http://locutus.io/php/strings/htmlentities/
 *	http://locutus.io/php/strings/get_html_translation_table/index.html
 */

function HTMLEntitiesEncode( string, quoteStyle, charset, doubleEncode )
{
	//  discuss at: http://locutus.io/php/htmlentities/
	// original by: Kevin van Zonneveld (http://kvz.io)
	//  revised by: Kevin van Zonneveld (http://kvz.io)
	//  revised by: Kevin van Zonneveld (http://kvz.io)
	// improved by: nobbler
	// improved by: Jack
	// improved by: Rafał Kukawski (http://blog.kukawski.pl)
	// improved by: Dj (http://locutus.io/php/htmlentities:425#comment_134018)
	// bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
	// bugfixed by: Brett Zamir (http://brett-zamir.me)
	//    input by: Ratheous
	//      note 1: function is compatible with PHP 5.2 and older
	//   example 1: htmlentities('Kevin & van Zonneveld')
	//   returns 1: 'Kevin &amp; van Zonneveld'
	//   example 2: htmlentities("foo'bar","ENT_QUOTES")
	//   returns 2: 'foo&#039;bar'

	var hashMap = HTMLEntitiesEncode.GetHTMLTranslationTable( 'HTML_ENTITIES', quoteStyle )

	string = string === null ? '' : string + ''

	if ( !hashMap )
	{
		return false
	}

	if ( quoteStyle && quoteStyle === 'ENT_QUOTES' )
	{
		hashMap["'"] = '&#039;'
	}

	doubleEncode = doubleEncode === null || !!doubleEncode

	var regex = new RegExp('&(?:#\\d+|#x[\\da-f]+|[a-zA-Z][\\da-z]*);|[' + Object.keys(hashMap).join('').replace(/([()[\]{}\-.*+?^$|\/\\])/g, '\\$1') + ']','g')

	return string.replace( regex,
		function ( ent )
		{
			if ( ent.length > 1 )
			{
				return doubleEncode ? hashMap['&'] + ent.substr(1) : ent
			}

			return hashMap[ent]
		}
	)
}

function DecodeHTMLEntities( htmlEncodedString )
{
	var ret = htmlEncodedString;

	if ( "string" == typeof htmlEncodedString )
	{
		var bits = htmlEncodedString.split( '&' );
		var n    = bits.length;

		if ( 1 < n )
		{
			for ( var i=0; i < n; i++ )
			{
				var s = bits[i].indexOf( ";" );

				if ( -1 != s )
				{
					var bit = bits[i];
					var bob = bit.substring( 0, s + 1 );

					switch ( bob )
					{
					case "amp;":
						bits[i] = "&"  + bit.substring( s + 1, bit.length );
						break;
						
					case "quot;":
						bits[i] = "\"" + bit.substring( s + 1, bit.length );
						break;
						
					case "apos;":
						bits[i] = "\'" + bit.substring( s + 1, bit.length );
						break;
						
					case "lt;":
						bits[i] = "<"  + bit.substring( s + 1, bit.length );
						break;
						
					case "gt;":
						bits[i] = ">"  + bit.substring( s + 1, bit.length );
						break;

					default:
						bits[i] = DecodeHTMLEntities.DecodeEntity( bob ) + bit.substring( s + 1, bit.length );
					}
				}
			}
			ret = bits.join( "" );
		}
	}

	return ret;
}

HTMLEntitiesEncode.GetHTMLTranslationTable
=
function( table, quoteStyle )
{
	// eslint-disable-line camelcase
	//  discuss at: http://locutus.io/php/get_html_translation_table/
	// original by: Philip Peterson
	//  revised by: Kevin van Zonneveld (http://kvz.io)
	// bugfixed by: noname
	// bugfixed by: Alex
	// bugfixed by: Marco
	// bugfixed by: madipta
	// bugfixed by: Brett Zamir (http://brett-zamir.me)
	// bugfixed by: T.Wild
	// improved by: KELAN
	// improved by: Brett Zamir (http://brett-zamir.me)
	//    input by: Frank Forte
	//    input by: Ratheous
	//      note 1: It has been decided that we're not going to add global
	//      note 1: dependencies to Locutus, meaning the constants are not
	//      note 1: real constants, but strings instead. Integers are also supported if someone
	//      note 1: chooses to create the constants themselves.
	//   example 1: get_html_translation_table('HTML_SPECIALCHARS')
	//   returns 1: {'"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;'}

	var entities = {}
	var hashMap = {}
	var decimal
	var constMappingTable = {}
	var constMappingQuoteStyle = {}
	var useTable = {}
	var useQuoteStyle = {}

	// Translate arguments
	constMappingTable[0] = 'HTML_SPECIALCHARS'
	constMappingTable[1] = 'HTML_ENTITIES'
	constMappingQuoteStyle[0] = 'ENT_NOQUOTES'
	constMappingQuoteStyle[2] = 'ENT_COMPAT'
	constMappingQuoteStyle[3] = 'ENT_QUOTES'

	useTable = !isNaN(table)
	? constMappingTable[table]
	: table
	  ? table.toUpperCase()
	  : 'HTML_SPECIALCHARS'

	useQuoteStyle = !isNaN(quoteStyle)
	? constMappingQuoteStyle[quoteStyle]
	: quoteStyle
	  ? quoteStyle.toUpperCase()
	  : 'ENT_COMPAT'

	if (useTable !== 'HTML_SPECIALCHARS' && useTable !== 'HTML_ENTITIES') {
	throw new Error('Table: ' + useTable + ' not supported')
	}

	entities['38'] = '&amp;'
	if (useTable === 'HTML_ENTITIES')
	{
		entities['160'] = '&nbsp;'
		entities['161'] = '&iexcl;'
		entities['162'] = '&cent;'
		entities['163'] = '&pound;'
		entities['164'] = '&curren;'
		entities['165'] = '&yen;'
		entities['166'] = '&brvbar;'
		entities['167'] = '&sect;'
		entities['168'] = '&uml;'
		entities['169'] = '&copy;'
		entities['170'] = '&ordf;'
		entities['171'] = '&laquo;'
		entities['172'] = '&not;'
		entities['173'] = '&shy;'
		entities['174'] = '&reg;'
		entities['175'] = '&macr;'
		entities['176'] = '&deg;'
		entities['177'] = '&plusmn;'
		entities['178'] = '&sup2;'
		entities['179'] = '&sup3;'
		entities['180'] = '&acute;'
		entities['181'] = '&micro;'
		entities['182'] = '&para;'
		entities['183'] = '&middot;'
		entities['184'] = '&cedil;'
		entities['185'] = '&sup1;'
		entities['186'] = '&ordm;'
		entities['187'] = '&raquo;'
		entities['188'] = '&frac14;'
		entities['189'] = '&frac12;'
		entities['190'] = '&frac34;'
		entities['191'] = '&iquest;'
		entities['192'] = '&Agrave;'
		entities['193'] = '&Aacute;'
		entities['194'] = '&Acirc;'
		entities['195'] = '&Atilde;'
		entities['196'] = '&Auml;'
		entities['197'] = '&Aring;'
		entities['198'] = '&AElig;'
		entities['199'] = '&Ccedil;'
		entities['200'] = '&Egrave;'
		entities['201'] = '&Eacute;'
		entities['202'] = '&Ecirc;'
		entities['203'] = '&Euml;'
		entities['204'] = '&Igrave;'
		entities['205'] = '&Iacute;'
		entities['206'] = '&Icirc;'
		entities['207'] = '&Iuml;'
		entities['208'] = '&ETH;'
		entities['209'] = '&Ntilde;'
		entities['210'] = '&Ograve;'
		entities['211'] = '&Oacute;'
		entities['212'] = '&Ocirc;'
		entities['213'] = '&Otilde;'
		entities['214'] = '&Ouml;'
		entities['215'] = '&times;'
		entities['216'] = '&Oslash;'
		entities['217'] = '&Ugrave;'
		entities['218'] = '&Uacute;'
		entities['219'] = '&Ucirc;'
		entities['220'] = '&Uuml;'
		entities['221'] = '&Yacute;'
		entities['222'] = '&THORN;'
		entities['223'] = '&szlig;'
		entities['224'] = '&agrave;'
		entities['225'] = '&aacute;'
		entities['226'] = '&acirc;'
		entities['227'] = '&atilde;'
		entities['228'] = '&auml;'
		entities['229'] = '&aring;'
		entities['230'] = '&aelig;'
		entities['231'] = '&ccedil;'
		entities['232'] = '&egrave;'
		entities['233'] = '&eacute;'
		entities['234'] = '&ecirc;'
		entities['235'] = '&euml;'
		entities['236'] = '&igrave;'
		entities['237'] = '&iacute;'
		entities['238'] = '&icirc;'
		entities['239'] = '&iuml;'
		entities['240'] = '&eth;'
		entities['241'] = '&ntilde;'
		entities['242'] = '&ograve;'
		entities['243'] = '&oacute;'
		entities['244'] = '&ocirc;'
		entities['245'] = '&otilde;'
		entities['246'] = '&ouml;'
		entities['247'] = '&divide;'
		entities['248'] = '&oslash;'
		entities['249'] = '&ugrave;'
		entities['250'] = '&uacute;'
		entities['251'] = '&ucirc;'
		entities['252'] = '&uuml;'
		entities['253'] = '&yacute;'
		entities['254'] = '&thorn;'
		entities['255'] = '&yuml;'
	}

	if (useQuoteStyle !== 'ENT_NOQUOTES')
	{
		entities['34'] = '&quot;'
	}

	if (useQuoteStyle === 'ENT_QUOTES')
	{
		entities['39'] = '&#39;'
	}
	entities['60'] = '&lt;'
	entities['62'] = '&gt;'

	// ascii decimals to real symbols
	for (decimal in entities)
	{
		if (entities.hasOwnProperty(decimal))
		{
			hashMap[String.fromCharCode(decimal)] = entities[decimal]
		}
	}

	return hashMap
}

DecodeHTMLEntities.DecodeEntity
=
function( entity )
{
	var ret = entity;

	if ( 0 == entity.indexOf( "#" ) )
	{
		var entity2 = entity.substring( 1, entity.length );
		var e       = entity2.indexOf( ";" );
	
		if ( (entity2.length - 1) == e )
		{
			var entity3 = entity2.substring( 0, entity2.length - 1 );
			
			var dec = parseInt( entity3 );
			
			if ( NaN !== dec )
			{
				ret = String.fromCharCode( dec );
			}
		}
	}
	
	return ret;
}

/*
 *  PureJavacript, InputFile.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

function InputFile( file_id, progress_handler, onload_handler, onerror_handler )
{
	return new InputFile.Class( file_id, progress_handler, onload_handler, onerror_handler );
}

InputFile.Class
=
function ( file_id, progress_handler, onload_handler, onerror_handler )
{
	this.reader            = new FileReader();
	this.reader.onprogress = progress_handler ? progress_handler : InputFile.OnProgress;
	this.reader.onloadend  =  onload_handler ?   onload_handler : InputFile.OnLoad;
	this.reader.onerror    =  onerror_handler ?  onerror_handler : InputFile.OnError;
	this.count             = 0;

	var input = document.getElementById( file_id );
	var file  = input.files[0];

	switch ( input.files[0].type.split( "/" )[1] )
	{
	case "png":
		this.fileType = "png";
		break;
		
	case "jpg":
	case "jpeg":
		this.fileType = "jpg";
		break;

	default:
		this.fileType = "";
	}

    /*
     *  Kludge to allow IE browsers to call 'readAsBinaryString', see:
     *  https://stackoverflow.com/questions/31391207/javascript-readasbinarystring-function-on-e11
     */

    if ( FileReader.prototype.readAsBase64 === undefined )
    {
        FileReader.prototype.readAsBase64
        =
        function( file_input )
        {
            this.readAsArrayBuffer( file_input );
        }

        this.reader.onload
        =
        function( e )
        {
            var binary = "";
            var bytes  = new Uint8Array( this.result );
            var length = bytes.byteLength;

            for ( var i=0; i < length; i++ )
            {
                binary += String.fromCharCode( bytes[i] )
            }

            this.resultAsBase64 = Base64.Encode( binary );
        }
    }

    this.reader.readAsBase64( file );
}

InputFile.Class.prototype.getCount
=
function()
{
	return this.count;
}

InputFile.OnProgress
=
function()
{
	console.log( "InputFile: default onprogress handler" );
}

InputFile.OnLoad
=
function()
{
	console.log( "InputFile: default onload handler" );
}

InputFile.OnError
=
function()
{
	console.log( "InputFile: default onerror handler" );
}

/*
 *  PureJavacript, Is.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

Is        = {}
Is.Date   = IsDate
Is.Prefix = IsPrefix

function IsDate( $datetime )
{
	var is_date = false;

	switch ( $datetime )
	{
	case null:
	case "NULL":
	case "null":
	case "":
	case "0":
	case "0000-00-00":
	case "0000-00-00 00:00:00":
		break;
		
	default:
		is_date = true;
	}

	return is_date;
}

function IsPrefix( string, prefix )
{
	return (0 == string.indexOf( prefix ));
}

/*
 *  PureJavacript, Links.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

Links          = {}
Links.Activate = LinksActivate
Links.Complete = LinksComplete

function LinksActivate( links, href )
{
	var n = links.length;
	
	for ( var i=0; i < n; i++ )
	{
		var link = links[i];

        if ( link.href == href )
        {
            link.className += ("" == link.className) ? "active" : " active";
        }

        if ( ((location.protocol + '//') != href) && (0 === href.indexOf(link.href)) )
        {
            var dashboard_url = location.protocol + '//' + location.hostname + '/dashboard/';

            if ( dashboard_url != link.href )
            {
                link.className += ("" == link.className) ? "subactive" : " subactive";
            }
        }
	}
}

function LinksComplete( links, tuple )
{
	var n = links.length;
	
	for ( var i=0; i < n; i++ )
	{
		var link = links[i];

		link.href      = Replace( link.href,      tuple );
		link.innerHTML = Replace( link.innerHTML, tuple );
	}
}

/*
 *  PureJavacript, Load.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

Load           = {}
Load.ImageFile = LoadInputFromImageFile
Load.Table     = LoadTableFromFile

function LoadInputFromImageFile( targetID, fileID, holderID )
{
	var target = document.getElementById( targetID );
	var file   = document.getElementById( fileID  );
	
	if ( target && file )
	{
		file.imageFile = new InputImageFile( fileID, null, function() { LoadInputFromImageFileHandler( targetID, fileID, holderID ); }, null );
	}
}

function LoadInputFromImageFileHandler( targetID, fileID, holderID )
{
	var target  = document.getElementById( targetID  );
	var file    = document.getElementById( fileID   );
	var holder  = document.getElementById( holderID );

	var base64 = Base64Encode( file.imageFile.reader.result );
	var ext    = file.imageFile.fileType;
	var url64  = "data:image/" + ext + ";base64," + base64;
	
	target.value = url64;

	if ( holder )
	{
		holder.style.background     = "white url(" + url64 + ") no-repeat center center";
		holder.style.backgroundSize = "cover";
	}
}

function LoadTableFromFile( event )
{
	var table_id = event.target.getAttribute( "data-target-id" );
	var table    = document.getElementById( table_id );
	
	if ( table )
	{
		var id = event.target.id;
		
		LoadTableFromFile.table = table;
		LoadTableFromFile.file  = InputFile( id, null, LoadTableFromFile.OnLoad, null );
	}
}

LoadTableFromFile.OnLoad
=
function()
{
	if ( LoadTableFromFile.file )
	{
		var table     = LoadTableFromFile.table;
		var content   = LoadTableFromFile.file.reader.result;
		var csv_file  = new CSVFile( content );
		var col_specs = LoadTableFromFile.ExtractColumnSpecs( LoadTableFromFile.table );
		var tbody     = table.tBodies[0];

		var rows      = csv_file.getNrOfRows();

		if ( 0 < rows )
		{
			tbody.innerHTML = "";
		
			for ( var row=0; row < rows; row++ )
			{
				var tr = document.createElement( "TR" );
				var n  = col_specs.length;
				
				for ( var i=0; i < n; i++ )
				{
					var spec           = col_specs[i];
					var td             = document.createElement( "TD" );
						td.innerHTML   = HTMLEntitiesEncode( csv_file.getValueFor( row, spec.source_names ), 'ENT_QUOTES', 'UTF8', true );
						td.setAttribute( "data-name", spec.field );

					tr.appendChild( td );
				}
			
				tbody.appendChild( tr );
			}
		}
	}
	else
	{
		console.log( "Unexpectedly, could not find file!" );
	}
}

LoadTableFromFile.ExtractColumnSpecs
=
function( table )
{
	var col_specs   = new Array();
	var th_elements = table.getElementsByTagName( "TH" );
	var n           = th_elements.length;
	
	for ( var i=0; i < n; i++ )
	{
		var th           = th_elements[i];
		var field        = th.getAttribute( "data-field" );
		var source_names = th.getAttribute( "data-source-names" );

		var col_spec                 = new Object();
			col_spec['field']        = field;
			col_spec['source_names'] = source_names.split( "," );

		col_specs.push( col_spec );
	}
	return col_specs;
}

/*
 *  PureJavacript, Locations.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

Locations              = {}
Locations.SearchValues = GetSearchValues
Locations.SearchValue  = GetSearchValue
Locations.Up           = Up
Locations.CreateDownFn = CreateDownFn
Locations.Down         = Down

function GetSearchValues()
{
	var object = new Object;
	
	var bits = window.location.search.substring( 1 ).split( "&" );
	var n    = bits.length;
	
	for ( var i=0; i < n; i++ )
	{
		var keyvalue = bits[i].split( "=" );

        if ( 2 == keyvalue.length )
        {
            var key      = decodeURIComponent( keyvalue[0] );
            var value    = decodeURIComponent( keyvalue[1] );

            object[key] = value;
        }
	}
	return object;
}

function GetSearchValue( name )
{
	var parameters = GetSearchValues();
	
	return parameters[name] ? parameters[name] : "";
}

function Up( search_parameters )
{
	var loc  = location.protocol + "//" + location.host;
	var bits = location.pathname.split( "/" );
	var path = "";

    if ( null == search_parameters )
    {
        search_parameters = new Array();
    }

	switch ( bits.length )
	{
	case 0: // ""
	case 1: // Can't happen
		path = "/";
		break;
	
	case 2: // "/"
		path = "/";
		break;
	
	default:
		bits = ("" == bits[bits.length - 1]) ? bits.slice( 0, -2 ) : bits.slice( 0, -1 );
		path = bits.join( "/" ) + "/";
	}

	loc += path;

    if ( 0 == search_parameters.length )
    {
        loc += location.search;
    }
    else
    {
        loc += "?";

        for ( key in search_parameters )
        {
            loc += search_parameters[key] + "=" + GetSearchValue( search_parameters[key] ) + "&";
        }
        loc = loc.substring( 0, loc.length - 1 );
    }

	location.replace( loc );
}

function CreateDownFn( pathname, search )
{
    return function()
    {
        Down( pathname, search );
    }
}

function Down( pathname, search )
{
    var loc  = location.protocol + "//" + location.host + location.pathname + pathname + search;

    if ( -1 !== loc.indexOf( '%' ) )
    {
        var parameters = Locations.SearchValues();

        loc = Replace( loc, parameters );
    }

    location.replace( loc );
}

/*
 *  PureJavacript, Modal.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

Modal        = {}
Modal.Close  = CloseModals;
Modal.Toggle = ToggleModal;

function CloseModals()
{
	var modal_bg = document.getElementById( "modal-bg" );
	var divs     = document.getElementsByTagName( "DIV" );
	var n        = divs.length;
	
	for ( var i=0; i < n; i++ )
	{
		if ( "modal" == divs[i].className )
		{
			var modal = divs[i];
			
			modal.style.display = "none";
		}
	}

	if ( modal_bg ) modal_bg.style.display = "none";
}

function ToggleModal( modal_id )
{
	var modal    = document.getElementById( modal_id   );
	var modal_bg = document.getElementById( "modal-bg" );
	
	if ( modal )
	{
		switch ( modal.style.display )
		{
		case "block":
			modal.style.display    = "none";
			modal_bg.style.display = "none";
			break;
			
		case "none":
		default:
			modal_bg.style.display = "block";

			modal.style.visibility = "hidden";
			modal.style.display    = "block";

			var width = modal.offsetWidth;
				width = width / 2;
				width = 1 - width;
		
			modal.style.marginLeft = width + "px";
			
			modal.style.visibility = "visible";
		}
	}
}

/*
 *  PureJavacript, Selects.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

function Selects( resolver )
{
	Selects.resolver = resolver;
	Selects.setup();
}

Selects.setup
=
function()
{
	var kinds = Array();
	var selects = document.getElementsByTagName( "SELECT" );
	if ( selects )
	{
		var n = selects.length;
		
		for ( var i=0; i < n; i++ )
		{
			var select = selects[i];
				select.setValue = Selects.setValue;

			var id   = select.hasAttribute( "id" ) ? select.getAttribute( "id" ) + ":" : "";
			var kind = select.getAttribute( "data-kind" );

			if ( kind )
			{
				var cupid = id + kind;

				kinds.push( cupid );
			}
		}
	}

	if ( kinds.length )
	{
		Selects.Multiselect( Selects.ArrayToString( kinds ), "", Selects.setup.handler );
	}
}

Selects.setup.handler
=
function( responseText )
{
	var obj = JSON.parse( responseText );
	if ( obj && obj.results )
	{
		var lists = Array();
		var n = obj.results.length;
			
		for ( var i=0; i < n; i++ )
		{
			var list   = obj.results[i];
			var name   = list.name;
			var tuples = list.tuples;
			
			lists[name] = tuples;
		}
		Selects.setup.init( lists );
	}
}

Selects.setup.init
=
function( lists )
{
	var selects = document.getElementsByTagName( "SELECT" );

	if ( selects )
	{
		var n = selects.length;
		
		for ( var i=0; i < n; i++ )
		{
			var select = selects[i];
			var id     = select.hasAttribute( "id" ) ? select.getAttribute( "id" ) + ":" : "";
			var kind   = select.getAttribute( "data-kind" );
			
			if ( kind && lists.hasOwnProperty( id + kind ) )
			{
				Selects.setup.addOptions( select, lists );
			}
		}

		for ( var i=0; i < n; i++ )
		{
			var select = selects[i];
			var id     = select.hasAttribute( "id" ) ? select.getAttribute( "id" ) + ":" : "";
			var kind   = select.getAttribute( "data-kind" );
			
			if ( kind && lists.hasOwnProperty( id + kind ) )
			{
				if ( select.hasAttribute( "data-cascade" ) )
				{
					select.addEventListener( "change", Selects.Cascade );

					if ( select.hasAttribute( "data-value" ) )
					{
						Selects.DoCascade( select );
					}
				}
			}
		}
	}
}

Selects.setup.addOptions
=
function( select, lists )
{
	var id           = select.hasAttribute( "id" ) ? select.getAttribute( "id" ) + ":" : "";
	var kind         = select.getAttribute( "data-kind" );
	var type         = select.getAttribute( "data-select-type" );
	var tuples       = lists[id + kind];
	
	if ( tuples )
	{
		select.options.length = 0;

		var offset   = 0;
		var selected = 0;
		var label    = select.getAttribute( "data-label"  ) ? select.getAttribute( "data-label"  ) : select.getAttribute( "placeholder" );
		if ( label )
		{
			select.options[0] = new Option( label, '' );
			offset++;
		}

		//if ( ! select.disabled )
		{
			var data_value = select.getAttribute( "data-value" );
			var data_text  = select.getAttribute( "data-text"  );

			var n = tuples.length;
			for ( var i=0; i < n; i++ )
			{
				var disabled = false;
				var name     = tuples[i].name;
				var text     = DecodeHTMLEntities( tuples[i].text );
					text     = text ? text : "";

				if ( 0 == name.indexOf( "!" ) )
				{
					disabled = true;
					name = name.substring( 1 );
				}

				if ( name == data_value               ) selected = i+offset;
				if ( -1 !== text.indexOf( data_text ) ) selected = i+offset;

				if ( name != text )
				{
					select.options[i+offset] = new Option( text, name );
				}
				else
				{
					select.options[i+offset] = new Option( text );
				}
				select.options[i+offset].disabled = disabled;
			}

			select.selectedIndex = selected;
		}
		
		if ( ("progressive" == type) && (0 < selected) )
		{
			for ( var i=selected - 1; i >= 0; i-- )
			{
				select.options[i].disabled = true;
			}
		}
	}
}

Selects.lookupOptions
=
function( id, kind, value )
{
	var select = document.getElementById( id );
	
	if ( select )
	{
		var n = select.length;

		if ( 0 < n )
		{
			for ( var i=0; i < n; i++ )
			{
				if ( select.options[i].value == value )
				{
					select.selectedIndex = i;
					break;
				}
			}
		}
		else
		{
			select.setAttribute( "data-value", value );
		}
	}
}

Selects.Cascade
=
function( event )
{
	Selects.DoCascade( event.target );
}

Selects.DoCascade
=
function( select )
{
	var value   = select.value;
	var targets = select.getAttribute( "data-cascade" );

	if ( targets )
	{
		var bits    = targets.split( "," );
		var n       = bits.length;
		
		for ( var i=0; i < n; i++ )
		{
			var target = bits[i];
			
			if ( target )
			{
				Selects.Reload( target, value );
			}
		}
		
		select.addEventListener( "change", Selects.Cascade );
		//select.onchange = Selects.Cascade;
	}
}

Selects.Reload
=
function( target, value )
{
	var select = document.getElementById( target );
	if ( select )
	{
		if ( "SELECT" == select.tagName )
		{
			var kind = select.getAttribute( "data-kind" );
			
			Selects.Multiselect( target + ":" + kind, value, Selects.setup.handler );

			//if ( value ) select.disabled = false;
		}
		else
		{
			if ( select.reload )
			{
				select.reload( value );
			}
		}
	}
}

Selects.Multiselect
=
function( kinds, value, handler )
{
	var parameters = new Object;
		parameters.kinds  = kinds;
		parameters.filter = value;

	var api_host = Selects.resolver();

	Call( api_host + "/api/multiselect/", parameters, handler );
}

Selects.SetValue
=
function( id, value )
{
	var select = document.getElementById( id );

	select.setValue( value );
	
//	if ( select )
//	{
//		var n = select.length;
//
//		if ( 0 < n )
//		{
//			for ( var i=0; i < n; i++ )
//			{
//				if ( select.options[i].value == value )
//				{
//					select.selectedIndex = i;
//					break;
//				}
//			}
//		}
//		else
//		{
//			select.setAttribute( "data-value", value );
//		}
//	}
}

Selects.setValue
=
function( value )
{
	if ( this )
	{
		var n = this.length;

		if ( 0 < n )
		{
			for ( var i=0; i < n; i++ )
			{
				if ( this.options[i].value == value )
				{
					this.selectedIndex = i;
					break;
				}
			}

			Selects.DoCascade( this );
		}
		else
		{
			this.setAttribute( "data-value", value );
		}
	}
}

Selects.ArrayToString
=
function( array )
{
	var string = "";
	var sep    = "";

	for ( var i in array )
	{
		string += sep + array[i];
		sep = ",";
	}
	
	return string;
}

/*
 *  PureJavacript, Session.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

function Session( Redirect )
{
	Session.Redirect = Redirect;

	Call( "/auth/session/", new Array(), Session.Switch );
}

Session.Switch
=
function( responseText )
{
	Session.Handler( responseText );

	if ( Session.Redirect )
	{
		Session.Redirect( Session.idtype );
	}
}

Session.Handler
=
function ( responseText )
{
	var idtype = "";

	Session.idtype = "";

	if ( -1 != responseText.indexOf( "UNAUTHENTICATED" ) )
	{
		Session.status = "UNAUTHENTICATED";
	}
	else
	if ( -1 != responseText.indexOf( "INVALID_SESSION" ) )
	{
		Session.status = "INVALID_SESSION";
	}
	else
	if ( "" != responseText )
	{
		var obj = JSON.parse( responseText );
		if ( obj && obj.sessionid )
		{
			Session.USER        = obj.USER;
			Session.email       = obj.email;
			Session.sessionid   = obj.sessionid;
			Session.idtype      = obj.idtype;
			Session.given_name  = obj.given_name;
			Session.family_name = obj.family_name;
			Session.user_hash   = obj.user_hash;
			Session.read_only   = obj.read_only;
			Session.status      = "AUTHENTICATED";

			idtype = Session.idtype;
		}
		else
		if ( obj && obj.error )
		{
			Session.status = obj["error"];
		}
	}

	//Redirect( idtype );
}

/*
 *  PureJavacript, Setup.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

function Setup()
{
	Setup.Elements( document.getElementsByTagName( "DIV"   ) );
	Setup.Elements( document.getElementsByTagName( "FORM"  ) );
	Setup.Elements( document.getElementsByTagName( "TBODY" ) );
}

Setup.CreateTableSetupFn
=
function( id, nr_columns )
{
    var path   = "";
    var search = "";

    return Setup.CreateTableSetupWithDownFn( id, nr_columns, path, search );
}

Setup.CreateTableSetupWithDownFn
=
function( id, nr_columns, path, search )
{
    /*
     *  The returned function parses the JSON formatted response text and creates a table row template for each result tuple.
     *  These are added to the tbody corresponding to 'id' - 'nr_of_columns' is used if no result tuples are returned.
     */

    var fn
    =
    function( responseText )
    {
        var json  = JSON.parse( responseText );
        var tbody = document.getElementById( id );
        
        if ( tbody && ("OK" == json.status) )
        {
            var htm = Setup.CreateTableSetupFn.RetrieveTemplate( tbody );

            if ( ! htm )
            {
                alert( "Table '" + id + "' is missing a row template with the id: '" + id + "-template'" );
            }
            else
            {
                var n = json.results.length;
                
                if ( 0 == n )
                {
                    tbody.innerHTML = "<tr><td colspan='" + nr_columns + "'>No entries added.</td></tr>";
                }
                else
                {
                    tbody.innerHTML = "";
                    
                    for ( var i=0; i < n; i++ )
                    {
                        var e = document.createElement( "TR" );
                        var t = json.results[i];
                            t['i'] = i + 1;

                        e.innerHTML = Replace( htm, t );
                        
                        if ( "" != path )
                        {
                            e.style.cursor = "pointer";
                            e.onclick = Locations.CreateDownFn( path, Replace( search, t ) );
                        }

                        if ( path && search )
                        {
                            e.className = "clickable"
                        }
                        
                        if ( 0 == (i % 2) )
                        {
                            e.className += " alternate"
                        }

                        if ( "css_class" in t )
                        {
                            e.className += " " + t['css_class'];
                        }

                        tbody.appendChild( e );
                    }
                }
            }
        }
    }
    
    return fn;
}

Setup.CreateTableSetupFn.RetrieveTemplate
=
function( tbody )
{
    var htm             = "";
    var row_template_id = tbody.id + "-template";
    var template_tr     = document.getElementById( row_template_id );

    if ( template_tr )
    {
        htm = template_tr.innerHTML;
    }
    
    return htm;
}

Setup.CreateFormSetupFn
=
function( id, key_field )
{
    var fn
    =
    function( responseText )
    {
        InsertResponseValues( id, key_field, responseText )
    }

    return fn;
}

Setup.CreateDivSetupFn
=
function( id )
{
    var fn
    =
    function( responseText )
    {
        var div = document.getElementById( id )
        
        if ( div )
        {
            var json = JSON.parse( responseText )
            
            if ( ("OK" == json.status) && (1 == json.results.length) )
            {
                div.innerHTML = Replace( div.innerHTML, json.results[0] )
                div.style.opacity = "1.0"
            }
            else
            {
                alert( "An unexpected error occurred while retrieving data" )
            }
        }
    }
    
    return fn;
}

Setup.Elements
=
function( elements )
{
	var n = elements.length;
	
	for ( var i=0; i < n; i++ )
	{
		var element    = elements[i];
		var parameters = GetSearchValues();

		Setup.Element( element, parameters );
	}
}

Setup.Element
=
function( element, parameters )
{
	if ( element && element.hasAttribute( "data-setup-url" ) )
	{
		var url        = element.getAttribute( "data-setup-url" );
		var handler    = Setup.DefaultHandler;

		if ( element.hasOwnProperty( "setup" ) )
		{
			handler = element.setup;

			handler = handler ? handler : element.handler;
		}

		if ( !parameters.target_id && element.hasAttribute( "id" ) )
		{
			parameters.target_id = element.getAttribute( "id" );
		}

		Call( Resolve() + url, parameters, handler );
	}
}

Setup.DefaultHandler
=
function( responseText )
{
	var json = JSON.parse( responseText );
	
	if ( "OK" != json.status )
	{
		console.log( responseText );
	}
}

/*
 *  PureJavacript, String.js
 *
 *  Copyright 2014 - 2017, CrossAdaptive
 */

Strings = {}
Strings.EndsWith     = StringEndsWith
Strings.StartsWith   = StringStartsWith
Strings.StripUnicode = StringStripUnicode
Strings.Truncate     = StringTruncate

function StringEndsWith( string, suffix )
{
	var n = string.length;
	var s = suffix.length;
	var i = string.indexOf( suffix );

	return (i == (n - s));
}

function StringStartsWith( string, prefix )
{
    return (0 === string.indexOf( prefix ));
}

function StringStripUnicode( s )
{
	var r = "";
	var l = "";
	var n = s.length;
	
	for ( var i=0; i < n; i++ )
	{
		try {
			if ( s.charCodeAt( i ) <= 255 )
			{
				r += s.charAt( i );
				l += "#";
			}
			else
			{
				l += "U";
			}
		}
		catch (err)
		{}
	}
	
	console.log( l );
	
	return r;
}

function StringTruncate( text, max_length )
{
	if ( text && (text.length > max_length) )
	{
		text = text.substring( 0, max_length - 3 ) + "...";
	}
	return text;
}

