/*
 * ----------------------------------------------------------------------------
 * Copyright (c) 2012 Miguel Angel Gabriel. All Rights Reserved. 
 * Released under the GNU GPL V3. 
 * ----------------------------------------------------------------------------
 */
var utils = {
		
	getISODateTime: function(d)
	{
	    // padding function
	    var s = function(a,b){return(1e15+a+"").slice(-b);};

	    // default date parameter
	    if (typeof d === 'undefined'){
	        d = new Date();
	    };

	    // return ISO datetime
	    return d.getFullYear() + '-' +
	        s(d.getMonth()+1,2) + '-' +
	        s(d.getDate(),2) + ' ' +
	        s(d.getHours(),2) + ':' +
	        s(d.getMinutes(),2) + ':' +
	        s(d.getSeconds(),2);
	},
	
	getDisplayTime: function(d)
	{
	    // padding function
	    var s = function(a,b){return(1e15+a+"").slice(-b);};

	    // default date parameter
	    if (typeof d === 'undefined'){
	        d = new Date();
	    } else if (typeof d === 'number'){
	    	d = new Date(d * 1000);
	    } 

	    // return ISO datetime
	    return s(d.getHours(),2) + ':' + s(d.getMinutes(),2);
	},
	
	getDisplayDuration: function(duration)
	{
		h = Math.floor(duration / 3600);
		s1 = duration - (h*3600);
		m = Math.floor(s1 / 60);
		
		h = (h < 10) ? '0'+h : h;
		m = (m < 10) ? '0'+m : m;
		
		return h+':'+m;
	},
	
	getDisplayRemaining: function(start, end)
	{
		dStart = new Date(start * 1000);
		dEnd = new Date(end * 1000);
		dNow = new Date();
		duration = dEnd - dStart;
		
		remaining = duration - (dNow - dStart);
		
		return this.getDisplayDuration(remaining / 1000);
	},
	
	getElapsedDuration: function(start, end, scale)
	{
		dStart = new Date(start * 1000);
		dEnd = new Date(end * 1000);
		dNow = new Date();
		duration = dEnd - dStart;
		
		if (dStart > dNow) {
			return 0;
		}
		
		if (dEnd < dNow) {
			return scale;
		}
		
		elapsed = (duration > 0) ? ((dNow - dStart) / duration) : 0; 
		
		result = Math.floor(scale * elapsed);
		
		return result;
	},
	
	sortByKey : function (array, key, zeroLast) {
	    return array.sort(function(a, b) {

	    	var keys = key.split(',');
	    	
	    	var x='';
	    	var y='';
	    	
	    	var padLength = 20;
	    	$.each(keys, function(i, key) {		
	    		
	    		var keyParts = key.split(':');
	    		var keyName = keyParts[0];
	    		var keyType = 's';
	    		if (keyParts.length > 0) {
	    			keyType = keyParts[1];
	    		}
	    		
	    		var va = a[keyName].toString();
	    		var vb = b[keyName].toString();

	    		if (zeroLast) {
	    			if (va == 0) {
	    				va = utils.strRepeat('z', padLength); 
	    			}
	    			if (vb == 0) {
	    				vb = utils.strRepeat('z', padLength); 
	    			}
	    		};
	    		
	    		padA = utils.strRepeat(' ', padLength - va.length);
	    		padB = utils.strRepeat(' ', padLength - vb.length);
	    		
	    		x+= (keyType == 'n') ? padA + va : va + padA ;
	    		y+= (keyType == 'n') ? padB + vb : vb + padB ;
	    	});
	    	
	    	x = x.toUpperCase();
	    	y = y.toUpperCase();
	    		         
	        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
	    });
	},
	
	strRepeat : function(str, num )	{
	    return new Array( isNaN(num) ? 1: num + 1 ).join( str );
	},
	
	isArray: function(input){
		return typeof(input)=='object'&&(input instanceof Array);
	},
	
	runTasks: function ( tasks, idx ) {
	   idx = idx || 0;
	   task = tasks[idx]; 
	   if (utils.isArray(task)) {
		   task[0](task[1]);
	   } else {
		   task();
	   }
	   idx++;
	   me = this;
	   if( idx < tasks.length ) {
	      setTimeout( function(){ me.runTasks(tasks, idx); },1);
	   }
	},
	
	getCurrentBaseUrl: function () {
		location = window.location;
		port = location.port ? ':'+location.port : '';
		ret = location.protocol + '//' + location.hostname + port + location.pathname;
		return ret;
	},
	
	isNumber : function(n) {
		return !isNaN(parseFloat(n)) && isFinite(n);
	}

};

/*
 * A plugin to manage localization with jquery.localize.js
 */
(function($) {

	var options = { pathPrefix : "js", 		// Where the transaltion files are
					skipLanguage: /^en/}; 	// Default language (to avoid trying to translate it)
	
	/*
	 * jquery.localize doesn't work on buttons that have already been enhanced by
	 * JQuery Mobile. We need to override the translation callback to provide an
	 * additional case for the button's markup. 
	 */
	options.callback = function(data, defaultCallback) {
			
		return $items.each(function() {
			var elem, key, value;
			elem = $(this);
			key = elem.attr("rel").match(/localize\[(.*?)\]/)[1];
			value = valueForKey(key, data);
			if (elem.is('input')) {
				if (elem.is("[placeholder]")) {
					return elem.attr("placeholder", value);
				} else {
					return elem.val(value);
				}
			} else if (elem.is('optgroup')) {
				return elem.attr("label", value);
			} else if (elem.is('img')) {
				value = valueForKey("" + key + ".alt", data);
				if (value != null) {
					elem.attr("alt", value);
				}
				value = valueForKey("" + key + ".src", data);
				if (value != null) {
					return elem.attr("src", value);
				}
			} else if (elem.is('a')) {
				/* If this is an already-enhanced button, modify just
				 * the html part of the inner span
				 */ 
				button = elem.find(".ui-btn-text");
				if (button && button.html()) {
					value = valueForKey(key, data);
					return button.html(value);
				} else {
					return elem.html(value);
				}
			} else {
				return elem.html(value);
			}
		});
	};
	
	/*
	 * This is just a copy of the same function inside jquery.localize, because
	 * it cannot be called directly from our callback.
	 */
    valueForKey = function(key, data) {
        var keys, value, _i, _len;
        keys = key.split(/\./);
        value = data;
        for (_i = 0, _len = keys.length; _i < _len; _i++) {
          key = keys[_i];
          value = value != null ? value[key] : null;
        }
        return value;
      };
	
    /*
     * The JQuery plugin call
     */
	$.fn.translate = function() {
		$items = this.find("[rel*=localize]");
		if ($items.length == 0) {
			$items = this;
		}
		return $items.localize("lang", options);
	};
	
	/*
	 * Used to force a target language, in case the autodetection
	 * cannot be reliable enough. 
	 */
	$.setLanguage = function(lang) {
		options.language = lang;
	};
	
})(jQuery);

/*
 * Several mini plugins
 */ 
(function($){
	$.fn.reverse = [].reverse;
	$.fn.sort = [].sort;
	$.fn.shift = [].shift;
})(jQuery);