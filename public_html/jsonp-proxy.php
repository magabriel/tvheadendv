<?php
/**
 * ----------------------------------------------------------------------------
 * (C) 2012 Miguel Angel Gabriel. Released under the GNU GPL V3 
 * ----------------------------------------------------------------------------
 *
 * Class to call a JSON server using JSONP protocol when the real
 * server doesn't provide JSONP by itself.
 *
 * If you need to call a server that provides a JSON response but
 * you are doing it from a Javascript program that was not downloaded
 * from the same domain, the call will fail because of the "same origin"
 * security restriction (NB: "same origin" means same protocol, hostname
 * and port).
 *
 * To overcome this restriction you have two options:
 * 1) Use a JSONP call instead.
 * 2) Use a normal JSON call from another server, because the "same origin"
 *    restriction does not apply to servers.
 *
 * Note that 1) is only possible if the JSON server also supports JSONP or
 * if you are able to modify it to build JSONP supoort into it. If you cannot
 * include native JSONP support, this class is the solution.
 *
 * This class provides a proxy that acts as a JSONP server that will forward
 * a normal JSON call to the real server and return the JSON response
 * formatted as JSONP. To accomplish this:
 * - Copy this file to whatever PHP server you have access to (could be localhost)
 *   making it available via http (i.e. http://localhost/jsonp-proxy.php)
 * - Make a JSONP request to the proxy with the right parameters (see below)
 *   and it will make the JSON request to the real server an return a
 *   valid JSONP response.
 *
 */

$jsonp = new JsonpProxy();
return $jsonp->process();

class JsonpProxy
{
	protected $serverUrl;

	/**
	 * Process a JSONP request calling the real JSON server.
	 * 
	 * Expected url query parameters:
	 * - "jsoncallback" : The name to assign to the JSONP callback
	 * - "callback" : Same as jsoncallback (either one is valid)
	 * - "url" : The url for the real JSON server (urlencoded)
	 * - "api" : The api to call the real JSON server
	 * - any other : JSON request parameters
	 * 
	 * Example:
	 * - Request (broken down into several lines for readability):
	 * 
	 * 		http://<myhost>/?
	 * 				callback=mycallback&
	 * 				url=http%3A%2F%2Fjsonserverhost%3A9123%2F&
	 * 				api=items&
	 * 				from=100&
	 * 				limit=20
	 * 
	 * 	- This will call 'http://jsonserverhost:9123/items?from=100&limit=20'
	 *    and return the following JSONP response:
	 *    
	 *    	mycallback=({ ... JSON response ...})
	 * 		
	 */
	public function process()
	{
		$params = $_REQUEST;
		
		// Look if we have a JSONP request
		$jsoncallback = '';
		if (isset($params['jsoncallback'])) {
			$jsoncallback = $params['jsoncallback'];
			unset($params['jsoncallback']);
		} elseif (isset($params['callback'])) {
			$jsoncallback = $params['callback'];
			unset($params['callback']);
		} else {
			echo "ERROR: Missing jsoncallback parameter\n";
			header("HTTP/1.0 400 Bad request");
			return;
		}
		
		// Get the real server url
		if (isset($params['url'])) {
			$this->serverUrl = $params['url'];
			unset($params['url']);
		} else {
			echo "ERROR: Missing url parameter\n";
			header("HTTP/1.0 400 Bad request");
			return;
		}
		
		$requestUrl = $this->constructRequestUrl($params);
		
		$response = $this->sendRequest($requestUrl);
		
		/* Add the user preferred language (set in the browser but this is the only
		 * way to get to it. It can then be used in the client code to localize the 
		 * user interface.
		 * NOTE: I am not using json_ functions because they only work with UTF-8
		 * data. This solution is ugly but it works.
		 */
		if (strlen($response) > 0 && substr($response, 0, 1) == '{') {
			$response = '{ "acceptLanguage":'.'"'.$_SERVER['HTTP_ACCEPT_LANGUAGE'].'"'.
			','.substr($response, 1);
		}
		
		// Build the response
		$return = $jsoncallback.'('.$response.')';
		
		header("Content-Type: application/javascript");
		
		echo $return;
	}
	
	function prepareJSON($input) {
	
		$input = mb_convert_encoding($input, 'UTF-8', 'UTF-8');
	
		return $input;
	}
	
	function my_json_encode($arr)
	{
		//convmap since 0x80 char codes so it takes all multibyte codes (above ASCII 127). So such characters are being "hidden" from normal json_encoding
		array_walk_recursive($arr, function (&$item, $key) {
			if (is_string($item)) $item = mb_encode_numericentity($item, array (0x80, 0xffff, 0, 0xffff), 'UTF-8');
		});
		return mb_decode_numericentity(json_encode($arr), array (0x80, 0xffff, 0, 0xffff), 'UTF-8');
	
	}
	protected function sendRequest($url)
	{
		// Request
		$response = file_get_contents($url);
		$responseHeaders = $this->getResponseHeaders($http_response_header);
		
		if ( ! isset($responseHeaders['Content-Type']) || 
			(strpos($responseHeaders['Content-Type'], 'text/x-json') === false) ) {
		
			echo "ERROR: The server did not return a JSON response\n";
			print_r($responseHeaders);
			header("HTTP/1.0 400 Bad request");
			return;
		}
		
		return $response;
	}
	
	protected function constructRequestUrl($params)
	{
		// API to call
		$api = '';
		if (isset($params['api'])) {
			$api = $params['api'];
			unset($params['api']);
		}
		
		// Remaining parameters
		$reqParams = array();
		foreach ($params as $key=>$value)
		{
			$reqParams[]= $key.'='.$value;
		}
		
		// Build request
		$query = implode('&', $reqParams);
		$url = $this->serverUrl.'/'.$api.'?'.$query;
		
		return $url;
	}
	
	protected function getResponseHeaders($headers)
	{
		$arh = array();
		if (is_array($headers)) {
			foreach ($headers as $header) {
				$header = explode(":", $header);
				$arh[array_shift($header)] = trim(implode(":", $header));
			}
		}
		return $arh;
	}
}


