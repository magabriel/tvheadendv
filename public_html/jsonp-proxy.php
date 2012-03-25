<?php

$jsonp = new JsonpProxy();
return $jsonp->process();

class JsonpProxy
{
	protected $serverUrl;
	
	public function __construct()
	{
	}
	
	public function process()
	{
		$params = $_REQUEST;
		
		// Ver si es JSONP
		$jsoncallback = '';
		if (isset($params['jsoncallback'])) {
			$jsoncallback = $params['jsoncallback'];
			unset($params['jsoncallback']);
		} elseif (isset($params['callback'])) {
			$jsoncallback = $params['callback'];
			unset($params['callback']);
		} else {
			echo "ERROR: falta parámetro jsoncallback\n";
			header("HTTP/1.0 400 Bad request");
			return;
		}
		
		// Recoger la url del servidor real
		if (isset($params['url'])) {
			$this->serverUrl = $params['url'];
			unset($params['url']);
		} else {
			echo "ERROR: falta parámetro url\n";
			header("HTTP/1.0 400 Bad request");
			return;
		}
		
		$requestUrl = $this->constructRequestUrl($params);
		
		$response = $this->sendRequest($requestUrl);
		
		// Construir la respuesta
		$return = $jsoncallback.'('.$response.')';
		
		header("Content-Type: application/javascript");
		
		echo $return;
	}
	
	protected function sendRequest($url)
	{
		// Petición
		$response = file_get_contents($url);
		$responseHeaders = $this->getResponseHeaders($http_response_header);
		
		if ( ! isset($responseHeaders['Content-Type']) || (strpos($responseHeaders['Content-Type'], 'text/x-json') === false) ) {
		
			echo "ERROR: El servidor no ha devuelto una respuesta JSON\n";
			print_r($responseHeaders);
			header("HTTP/1.0 400 Bad request");
			return;
		}
		
		return $response;
	}
	
	protected function constructRequestUrl($params)
	{
		// API a llamar
		$api = '';
		if (isset($params['api'])) {
			$api = $params['api'];
			unset($params['api']);
		}
		
		// Resto de parámetros
		$reqParams = array();
		foreach ($params as $key=>$value)
		{
			$reqParams[]= $key.'='.$value;
		}
		
		$query = implode('&', $reqParams);
		$url = $this->serverUrl.'/'.$api.'?'.$query;
		
		return $url;
	}
	
	protected function getResponseHeaders($headers)
	{
		$arh = array();
		$headers = $headers;
		foreach ($headers as $header) {
			$header = explode(":", $header);
			$arh[array_shift($header)] = trim(implode(":", $header));
		}
		return $arh;
	}
}


