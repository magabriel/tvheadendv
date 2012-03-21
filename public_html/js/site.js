/*
 * Configuración
 */
$(document).bind("mobileinit", function(){
	//defaultPageTransition : "slide"
	$.mobile.defaultPageTransition = 'none';
	$.mobile.defaultDialogTransition = 'none';
	$.mobile.loadingMessage = "Cargando..."; 
	
	tvheadend.useProxy = true;
	
	// Cargar datos
	tvheadend.init();	
});

/*
 * Recoger los datos enviados a la ventana
 */
$(document).bind("pagebeforechange", function( event, data ) {
    $.mobile.pageData = (data && data.options && data.options.pageData)
        ? data.options.pageData
        : null;
});

var tvheadend = {
	
	serverurl : 'http://192.168.1.201:9981',
		
	serverurlProxy : 'http://192.168.1.125/web/tvheadendv/tvheadend-proxy.php',
	
	useProxy : false,
	
	data : { 
		loaded : false,
		loading : false,
		channelTags : null,
		channels : null,
		epg : null,
		
		checkLoaded : function () {
			this.loaded = !!(this.channelTags && this.channels && this.epg); 
			if (this.loaded) {
				this.loading = false;
				$(document).trigger('dataloaded');
			}
		}
	},
	
	init : function() {
		if (this.data.loaded) {
			$(document).trigger('dataloaded');
		} else if (!this.data.loading) {
			this.refresh();
		} 
	},
	
	refresh : function() {
		this.data.loading = true;
		// Cargar todo
		var me = this;
		this._sendRequest('channeltags', 'listTags', function(data){ 
			me.data.channelTags = data; console.debug('LOADED channeltags');});
		this._sendRequest('channels', 'list', function(data){ 
			me.data.channels = data;console.debug('LOADED channels');});
		this._sendRequest('epg', 'start=0&limit=300', function(data){ 
			me.data.epg = data;console.debug('LOADED epg');});
	},
	
	_sendRequest : function(api, operation, resultCallback) 
	{
		url = this.serverurl+'/'+api;
		data = 'op='+operation;
		
		if (this.useProxy) {
			url = this.serverurlProxy;
			data = 'api='+api+'&op='+operation;
		}
		
		var me = this;
		$.ajax({
			url: url,
			data: data,
			
			type: "POST",
			cache: false,
			dataType: "jsonp",
			timeout: 5000,
			success: function(data) {
				resultCallback(data);
				me.data.checkLoaded();
			},
			error: function (jqXHR, textStatus)	{
				alert ('ERROR: '+textStatus);
			},
			complete: function() {
				//
			}
		});
	},

	findChannelTag : function(identifier)
	{
		var found=null;
		
		$.each(this.data.channelTags.entries, function(i, channelTag) {
			if (channelTag.identifier == identifier) {
				found=channelTag;
				return false;
			}
		});
		
		return found;
	},

	findChannelsByChannelTag : function(channelTag) 
	{
		result = [];
		$.each(this.data.channels.entries, function(i, channel) {		
			tags = channel.tags.split(',');
			if($.inArray(channelTag, tags) != -1) {
				result.push(channel);
			}
		});
		
		result.entries = result;
		
		return result;
	},
	
	findEpgByChannel : function(channelid)
	{
		result = [];
		$.each(this.data.epg.entries, function(i, entry) {		
			if(entry.channelid == channelid) {
				result.push(entry);
			}
		});
		
		result.entries = result;
		return result;
	},
	
	findEpgCurrentByChannel : function(channelid)
	{
		epg = this.findEpgByChannel(channelid);
		
		result = [];
		$.each(epg.entries, function(i, entry) {		
			currDate = new Date();
			start = new Date(entry.start * 1000);
			end = new Date(entry.end * 1000);
			if((start.getTime() <= currDate.getTime()) && (currDate.getTime() <= end.getTime())) {
				result.push(entry);
			}
		});
		
		result.entries = result;
		return result;
	},
	
	getChannelStreamUrl : function(chid)
	{	
		return this.serverurl+'/stream/channelid/'+chid;
	}
};

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
	}
	

};

/****
 * Página "loading"
 */
$( '#page_loading' ).live( 'pageinit',function(event){
	$( document ).one( 'dataloaded',function(event){
		$.mobile.changePage("#page_home");
	});
});
	 
/****
 * Página "channeltags"
 */
$( '#page_channeltags' ).live( 'pageinit',function(event){
		
	$( '#page_channeltags' ).live( 'pagebeforeshow',function(event){		
		
		if (!tvheadend.data.loaded) {
			$.mobile.changePage("#page_loading");
			return;
		}
		
		$(".list_channeltags").empty();
		
		$.each(tvheadend.data.channelTags.entries, function(i, tag) {		
			item = 	'<li>'+
					'<a href="#page_channels?channeltag='+tag.identifier+'">'+
					'	<h3>'+tag.name+'</h3>',
					'</a>'+
					'</li>';
			$(".list_channeltags").append(item);
		});
		
		pageLoading.hide();
		$('.list_channeltags').listview('refresh');
	});
	
});

/****
 * Página "channels"
 */
$( '#page_channels' ).live( 'pageinit',function(event){

	/*
	 * Relleno de la ventana 
	 */
	$("#page_channels").live("pagebeforeshow", function(e, data){
		fillPage();
	});
	
	/*
	 * Ordenación
	 */
	$("#page_channels #btn_sort_number").on('click', function() {
		fillPage('number');
	});
	$("#page_channels #btn_sort_name").on('click', function() {
		fillPage('name');
	});
	
	/*
	 * Preparar el refresco de datos
	 */
	$("#page_channels #btn_refresh").on('click', function() {
		$( document ).one( 'dataloaded',function(event){
			fillPage();
		});
		pageLoading.show();
		tvheadend.refresh();
	});

	/*
	 * Rellenar la ventana
	 */
	function fillPage(sort)
	{
		if (!tvheadend.data.loaded) {
			$.mobile.changePage("#page_loading");
			return;
		}
		
	    if ($.mobile.pageData && $.mobile.pageData.channeltag){

	    	channelTag = tvheadend.findChannelTag($.mobile.pageData.channeltag);
	    	$("#page_channels h1").hide();
	    	$("h1.lbl_channelsByTag").show();
	    	$('.txt_channeltag').html(channelTag.name);

	    	channels = tvheadend.findChannelsByChannelTag($.mobile.pageData.channeltag);
	    	fillChannelsList(channels, sort);	    	
	    } else {
	    	fillChannelsList(tvheadend.data.channels, sort);
	    	$("#page_channels h1").hide();
	    	$("h1.lbl_channels").show();
	    };		
	};

	/*
	 * Rellenar la lista de canales
	 */
	function fillChannelsList(channels, sort)
	{
		$(".list_channels").empty();
		
		sort = (sort == null) ? 'number' : sort;
		
		$("#page_channels #btn_sort_number").removeClass('ui-btn-active');
		$("#page_channels #btn_sort_name").removeClass('ui-btn-active');
		
		if (sort == 'number') {
			channels.entries = utils.sortByKey(channels.entries, 'number:n,name:s', true);
			$("#page_channels #btn_sort_number").addClass('ui-btn-active');
		} else if (sort == 'name') {
			channels.entries = utils.sortByKey(channels.entries, 'name:s', true);
			$("#page_channels #btn_sort_name").addClass('ui-btn-active');
		}
		
		$.each(channels.entries, function(i, channel) {		
			
			var epg = '';
			var epgEntries = tvheadend.findEpgCurrentByChannel(channel.chid);
			$.each(epgEntries, function(i, entry){
				epg+= '<h4>'+entry.title+'</h4>';
				epg+= '<h5>'+
						'<span class="epg-duration">['+utils.getDisplayDuration(entry.duration)+']</span>'+
						'<span class="epg-start">'+utils.getDisplayTime(entry.start)+'</span>'+
						'<span class="epg-bar">'+
						'<span class="epg-barc" style="width:'+utils.getElapsedDuration(entry.start, entry.end, 80)+'px;">&nbsp;'+
						'</span></span>' +
						'<span class="epg-end">'+utils.getDisplayTime(entry.end)+'</span>'+
						'<span class="epg-remain">['+utils.getDisplayRemaining(entry.start, entry.end)+']</span>'+
						'</h5>';
			});
			
			channel.number = channel.number ? channel.number : '';
			
			item = 	'<li>'+
					'<a href="'+tvheadend.getChannelStreamUrl(channel.chid)+'">'+
					'<h3 class="channel-name"><span class="channel-number">'+channel.number+'</span>'+'&nbsp;'+channel.name+'</h3>'+
					epg +
					'</a>'+
					'</li>';
			$(".list_channels").append(item);
		});
		
		pageLoading.hide();
		$('.list_channels').listview('refresh');
	}    	

});

var pageLoading = {
		
	show: function()
		{
			$("body").append('<div class="pageLoading"/>');
			setTimeout('$.mobile.showPageLoadingMsg()', 5);                      
			$.mobile.showPageLoadingMsg();
			//setTimeout('pageLoading.hide()', 5000);
		},

	hide: function()
		{
			$(".pageLoading").remove();
			setTimeout('$.mobile.hidePageLoadingMsg()', 5);                      
			$('body').removeClass('ui-loading');
		},
};
 
/*
 * Splash de carga inicial
 */
$(function() {
  //setTimeout(hideSplash, 2000);
});

function hideSplash() {
  $.mobile.changePage("#page_home", "slide");
}



