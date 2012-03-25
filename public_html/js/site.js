/*
 * Configuración
 */
$(document).bind("mobileinit", function(){
	//defaultPageTransition : "slide"
	$.mobile.defaultPageTransition = 'none';
	$.mobile.defaultDialogTransition = 'none';
	$.mobile.loadingMessage = "Cargando..."; 
	
	// Siempre usamos el proxy para poder usan JSONP (restricción "same-domain")
	tvheadend.useProxy = true;
	
	// Datos que necesitamos
	var urlBase = location.protocol + '//' + location.hostname;
	var port = '9981'; // TODO: Parametrizar
	
	// Datos específicos del entorno de pruebas
	if (window.location.hostname == 'localhost') {
		urlBase = 'http://192.168.1.201';
	}
	
	// Dirección del servidor de tvheadend y del proxy JSONP
	tvheadend.serverurl = urlBase+':'+port;
	tvheadend.serverurlProxy = urlBase + '/jsonp-proxy.php';
		
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

$( document ).live( 'timeout',function(event){
	pageLoading.hide();
	$.mobile.changePage("#page_error");
});

var tvheadend = {
	
	serverurl : '',
	serverurlProxy : '',
	
	timeout : 3000,
	useProxy : false,
	
	data : { 
		isLoaded : false,
		isLoading : false,
		
		channelTags : null,
		channels : null,
		epg : null,
		
		checkLoaded : function () {
			this.isLoaded = !!(this.channelTags && this.channels && this.epg); 
			if (this.isLoaded) {
				this.isLoading = false;
				$(document).trigger('dataloaded');
			}
		},
		checkTimeout : function(me) { // El parámetro es la instancia de tvheadend!!!
			if (!me.data.isLoaded) {
				$(document).trigger('timeout');
			};
		}
	},
	
	init : function() {
		if (this.data.isLoaded) {
			$(document).trigger('dataloaded');
		} else if (!this.data.isLoading) {
			this.refresh();
		} 
	},
	
	refresh : function() {
		this.data.isLoading = true;
		this.data.isLoaded = false;
		
		// El 3er. parámetro es la instancia de tvheadend!!!
		setTimeout(this.data.checkTimeout, this.timeout, this); 
		
		// Cargar todo
		var me = this;
		this._sendRequest('channeltags', 'listTags', 
				function(data){me.data.channelTags = data; });
		this._sendRequest('channels', 'list', 
				function(data){me.data.channels = data;});
		this._sendRequest('epg', 'start=0&limit=200', 
				function(data){me.data.epg = data;});
	},
	
	_sendRequest : function(api, operation, resultCallback) 
	{
		var url = this.serverurl+'/'+api;
		var data = 'op='+operation;
		var dataType = 'json';
		var type = 'POST';
		
		if (this.useProxy) {
			url = this.serverurlProxy;
			data = 'url='+encodeURIComponent(this.serverurl)+'&api='+api+'&op='+operation;
			dataType = 'jsonp';
			type = 'GET';
		}
		
		var me = this;
		$.ajax({
			url: url,
			data: data,
			
			type: type,
			cache: false,
			dataType: dataType,
			timeout: this.timeout,
			success: function(data) {
				resultCallback(data);
				me.data.checkLoaded();
			},
			error: function (jqXHR, textStatus, errorThrown)	{
				console.debug('AJAX ERROR: '+textStatus);
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
		var result = [];
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
		var result = [];
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
		var epg = this.findEpgByChannel(channelid);
		
		var result = null;
		var currDate = new Date();
		$.each(epg.entries, function(i, entry) {		
			var start = new Date(entry.start * 1000);
			var end = new Date(entry.end * 1000);
			if((start.getTime() <= currDate.getTime()) && (currDate.getTime() <= end.getTime())) {
				result = entry;
				return false;
			}
		});
		
		return result;
	},

	findEpgNextByChannel : function(channelid)
	{
		var current = this.findEpgCurrentByChannel(channelid);

		var currStart = new Date();
		var currEnd = new Date();

		if (current) {
			currStart = new Date(current.start * 1000);
			currEnd = new Date(current.end * 1000);
		}
		
		var result = null;
		var resultStart = new Date();
		resultStart.setDate(resultStart.getDate() + 1);
		var currDate = new Date();
		
		var epg = this.findEpgByChannel(channelid);
		
		$.each(epg.entries, function(i, entry) {		
			var start = new Date(entry.start * 1000);
			var end = new Date(entry.end * 1000);
			if (start.getTime() > currDate.getTime() && start.getTime() >= currEnd.getTime()) {
				if (start.getTime() < resultStart) {
					result = entry;
					resultStart = start.getTime(); 
				}
			}
		});
		
		return result;
	},

	getChannelStreamUrl : function(chid)
	{	
		return this.serverurl+'/stream/channelid/'+chid;
	}
};

/****
 * Página "loading"
 */
$( '#page_loading' ).live( 'pageinit',function(event){
	$( document ).live( 'dataloaded',function(event){
		$.mobile.changePage("#page_home");
	});
});

/****
 * Página "error"
 */
$( '#page_error' ).live( 'pageinit',function(event){
	/*
	 * Preparar el refresco de datos
	 */
	$("#page_error #btn_retry").on('click', function() {
		tvheadend.refresh();
	});
});

/****
 * Página "channeltags"
 */
$( '#page_channeltags' ).live( 'pageinit',function(event){
		
	$( '#page_channeltags' ).live( 'pagebeforeshow',function(event){		
		
		if (!tvheadend.data.isLoaded) {
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
		if (!tvheadend.data.isLoaded) {
			$.mobile.changePage("#page_loading");
			return;
		}
		
		pageLoading.show();
		
	    if ($.mobile.pageData && $.mobile.pageData.channeltag){

	    	channelTag = tvheadend.findChannelTag($.mobile.pageData.channeltag);
	    	$("#page_channels h1").hide();
	    	$("h1.lbl_channelsByTag").show();
	    	$('.txt_channeltag').html(channelTag.name);

	    	channels = tvheadend.findChannelsByChannelTag($.mobile.pageData.channeltag);
	    	setTimeout(fillChannelsList, 0, channels, sort);	    	
	    } else {
	    	setTimeout(fillChannelsList, 0, tvheadend.data.channels, sort);
	    	$("#page_channels h1").hide();
	    	$("h1.lbl_channels").show();
	    };		
	};

	/*
	 * Rellenar la lista de canales
	 */
	function fillChannelsList(channels, sort)
	{
		pageLoading.show();
		
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
		
		// Variable en la que acumularemos todos los items a añadir a la lista
		var listItems = [];
		
		// Definimos un objeto función que añade a la variable un aray de items 
		channelsListFillAll = function(channels) {
			$.each(channels.entries, function(i, channel) {		
				
				var epg = '';
				
				var epgEntry = tvheadend.findEpgCurrentByChannel(channel.chid);
				if (epgEntry) {
					epg+= '<h4>'+epgEntry.title+'</h4>';
					epg+= '<h5>'+
							'<span class="epg-duration">['+utils.getDisplayDuration(epgEntry.duration)+']</span>'+
							'<span class="epg-start">'+utils.getDisplayTime(epgEntry.start)+'</span>'+
							'<span class="epg-bar">'+
							'<span class="epg-barc" style="width:'+utils.getElapsedDuration(epgEntry.start, epgEntry.end, 80)+'px;">&nbsp;'+
							'</span></span>' +
							'<span class="epg-end">'+utils.getDisplayTime(epgEntry.end)+'</span>'+
							'<span class="epg-remain">['+utils.getDisplayRemaining(epgEntry.start, epgEntry.end)+']</span>'+
							'</h5>';
				};
				
				var epgEntry = tvheadend.findEpgNextByChannel(channel.chid);
				if (epgEntry) {
					epg+= '<h4>'+epgEntry.title+'</h4>';
					epg+= '<h5>'+
							'<span class="epg-duration">['+utils.getDisplayDuration(epgEntry.duration)+']</span>'+
							'<span class="epg-start">'+utils.getDisplayTime(epgEntry.start)+'</span>'+
							'<span class="epg-bar">'+
							'<span class="epg-barc" style="width:'+utils.getElapsedDuration(epgEntry.start, epgEntry.end, 80)+'px;">&nbsp;'+
							'</span></span>' +
							'<span class="epg-end">'+utils.getDisplayTime(epgEntry.end)+'</span>'+
							'</h5>';
				};
				
				channel.number = channel.number ? channel.number : '';
				
				item = 	'<a href="'+tvheadend.getChannelStreamUrl(channel.chid)+'">'+
						'<h3 class="channel-name"><span class="channel-number">'+channel.number+'</span>'+'&nbsp;'+channel.name+'</h3>'+
						epg +
						'</a>';
				
				listItems.push('<li>'+item+'</li>');
			});
		};
		
		// Definimos un objeto función que finaliza la lista 
		channelsWrapUp = function () {
			$('#page_channels .list_channels').html(listItems.join(''));
			$('#page_channels .list_channels').listview('refresh');
			pageLoading.hide();
		};
		
		// Usaremos una cola de tareas para que la GUI no se congele 
		tasks = [];

		size = 1; // Tamaño del subarray de items, ajustable
		
		// Crear una tarea por cada subarray
		$.each(channels.entries, function(i, channelEntry) {
			if ((i % size) == 0) {
				slice = channels.entries.slice(i, i+size);
				slice.entries = slice;
				tasks.push([channelsListFillAll, slice]);
			}
		});
		
		// Crear una tarea para finalizar la lista
		tasks.push(channelsWrapUp);

		// Ejecuar todas las tareas en orden
		utils.runTasks(tasks);
	}    	

});

/****
 * Página "epg"
 */
$( '#page_epg' ).live( 'pageinit',function(event){

	/*
	 * Relleno inicial de la ventana 
	 */
	$("#page_epg").live("pagebeforeshow", function(e, data){
		fillPage();
	});
	
	/*
	 * Ordenación y relleno
	 */
	$("#page_epg #btn_sort_date").on('click', function() {
		fillPage('date');
	});
	$("#page_epg #btn_sort_channel").on('click', function() {
		fillPage('channel');
	});
	
	/*
	 * Preparar el refresco de datos
	 */
	$("#page_epg #btn_refresh").on('click', function() {
		$( document ).one( 'dataloaded',function(event){
			fillPage();
		});
		pageLoading.show();
		tvheadend.refresh();
	});
	
	/*
	 * Realiza el relleno de la ventana
	 */
	function fillPage(sort)
	{
		if (!tvheadend.data.isLoaded) {
			$.mobile.changePage("#page_loading");
			return;
		}
		
		pageLoading.show();
		setTimeout(fillEpgList, 0, tvheadend.data.epg, sort);
	};

	/*
	 * Rellenar la lista de epg
	 */
	function fillEpgList(epglist, sort)
	{
		pageLoading.show();

		sort = (sort == null) ? 'date' : sort;

		$("#page_epg #btn_sort_date").removeClass('ui-btn-active');
		$("#page_epg #btn_sort_channel").removeClass('ui-btn-active');

		if (sort == 'date') {
			epglist.entries = utils.sortByKey(epglist.entries, 'start:n,end:n', true);
			$("#page_epg #btn_sort_date").addClass('ui-btn-active');
		} else if (sort == 'channel') {
			epglist.entries = utils.sortByKey(epglist.entries, 'channel:s,start:n', true);
			$("#page_epg #btn_sort_channel").addClass('ui-btn-active');
		};
		
		// Variable en la que acumularemos todos los items a añadir a la lista
		var listItems = [];
		
		// Canal actual (para ordenación por canal)
		var currChannel = ''; 
		
		// Definimos un objeto función que añade a la variable un aray de items 
		epgListFillAll = function(epglist) {
			
			$.each(epglist.entries, function(i, epgEntry) {
				var epg = '';
				
				if (sort == 'channel') {
					if (epgEntry.channelid != currChannel) {
						listItems.push('<li data-role="list-divider">'+epgEntry.channel+'</li>');
						currChannel = epgEntry.channelid;
					}
				}
					
				var epgEntryCurrent = tvheadend.findEpgCurrentByChannel(epgEntry.channelid);
				if (epgEntryCurrent && epgEntryCurrent.id == epgEntry.id) {
					epg+= '<h4>'+epgEntry.title+'</h4>';
					epg+= '<h5>'+
					'<span class="epg-duration">['+utils.getDisplayDuration(epgEntry.duration)+']</span>'+
					'<span class="epg-start">'+utils.getDisplayTime(epgEntry.start)+'</span>'+
					'<span class="epg-bar">'+
					'<span class="epg-barc" style="width:'+utils.getElapsedDuration(epgEntry.start, epgEntry.end, 80)+'px;">&nbsp;'+
					'</span></span>' +
					'<span class="epg-end">'+utils.getDisplayTime(epgEntry.end)+'</span>'+
					'<span class="epg-remain">['+utils.getDisplayRemaining(epgEntry.start, epgEntry.end)+']</span>'+
					'</h5>';
				} else {
					epg+= '<h4>'+epgEntry.title+'</h4>';
					epg+= '<h5>'+
					'<span class="epg-duration">['+utils.getDisplayDuration(epgEntry.duration)+']</span>'+
					'<span class="epg-start">'+utils.getDisplayTime(epgEntry.start)+'</span>'+
					'<span class="epg-bar">'+
					'<span class="epg-barc" style="width:'+utils.getElapsedDuration(epgEntry.start, epgEntry.end, 80)+'px;">&nbsp;'+
					'</span></span>' +
					'<span class="epg-end">'+utils.getDisplayTime(epgEntry.end)+'</span>'+
					'</h5>';
				};

				if (sort == 'channel') {
					item = 
						'<a href="'+tvheadend.getChannelStreamUrl(epgEntry.channelid)+'">'+
						epg +
						'</a>';
				} else { // 'time'
					item = 
						'<a href="'+tvheadend.getChannelStreamUrl(epgEntry.channelid)+'">'+
						'<h3 class="channel-name">'+epgEntry.channel+'</h3>'+
						epg +
						'</a>';
				}

				listItems.push('<li>'+item+'</li>');
			});

		}; 	

		// Definimos un objeto función que finaliza la lista 
		epgWrapUp = function () {
			$("#page_epg .list_epg").html(listItems.join(''));
			$('#page_epg .list_epg').listview('refresh');
			pageLoading.hide();
		};
		
		// Usaremos una cola de tareas para que la GUI no se congele 
		tasks = [];

		size = 1; // Tamaño del subarray de items, ajustable
		
		// Crear una tarea por cada subarray
		$.each(epglist.entries, function(i, epgEntry) {
			if ((i % size) == 0) {
				slice = epglist.entries.slice(i, i+size);
				slice.entries = slice;
				tasks.push([epgListFillAll, slice]);
			}
		});
		
		// Crear una tarea para finalizar la lista
		tasks.push(epgWrapUp);

		// Ejecuar todas las tareas en orden
		utils.runTasks(tasks);
	};
});

var pageLoading = {
		
	show: function()
		{
			$("body").append('<div class="pageLoading"/>');
			//setTimeout('$.mobile.showPageLoadingMsg', 5);
			$.mobile.showPageLoadingMsg();
			setTimeout('pageLoading.hide()', 15000);
		},

	hide: function()
		{
			$(".pageLoading").remove();
			//setTimeout('$.mobile.hidePageLoadingMsg', 5);
			$.mobile.hidePageLoadingMsg();
			//$('body').removeClass('ui-loading');
		},
};
 




