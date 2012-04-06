/*
 * ----------------------------------------------------------------------------
 * Copyright (c) 2012 Miguel Angel Gabriel. All Rights Reserved. 
 * Released under the GNU GPL V3. 
 * ----------------------------------------------------------------------------
 */

/*************************************************************
 * Initialization
 *************************************************************
 */

/*
 * Setup when jQuery ready
 */
$(document).ready(function() {
	// Translate everything
	$("body").translate();
});

/*
 * Setup mobile
 */
$(document).bind("mobileinit", function(){
	console.debug('document.mobileinit');
	
	$.mobile.defaultPageTransition = 'none';
	$.mobile.defaultDialogTransition = 'none';
	
	// Use proxy if we are not a native app ("same-domain" restriction)
	// TODO: This property must be set to false when this becomes a PhoneGap app.
	tvheadend.useProxy = true;
	
	// Load data
	tvheadend.init();	
});

/*************************************************************
 * Capture some events
 *************************************************************
 */
/*
 * Retrieve the parameters sent to any window (see jqm.page.params.js)
 */
$(document).bind("pagebeforechange", function( event, data ) {
	if (typeof data.toPage == 'string') console.debug('document.pagebeforechange '+ data.toPage) ;
	
    $.mobile.pageData = (data && data.options && data.options.pageData)
        ? data.options.pageData
        : null;
});

/*
 * Timeout event (from ajax)
 */
$(document).on( 'timeout',function(event){
	console.debug('document.timeout');
	
	pageLoading.hide();
	$.mobile.changePage("#page_error");
});

/*
 * Track some other events (for debugging)
 */
$(document).on( 'dataloaded',function(event){ console.debug('document.dataloaded');});
$(document).on( 'initdone',function(event){ console.debug('document.initdone');});

/*************************************************************
 * Tvheadend handler object
 *************************************************************
 */
var tvheadend = {
	
	// Defaults (autodetected)
	defaultServerProtocol : '',
	defaultServerIP : '',
	defaultServerPort : '',
	defaultLinkType : '',
		
	// Actual values (when set)
	serverProtocol : '',
	serverIP : '',
	serverPort : '',
	linkType : '',
	
	serverUrl : '',
	serverUrlProxy : '',
	
	timeout : 3000,
	useProxy : false,
	
	/*
	 * Data object
	 */
	data : { 
		isLoaded : false,
		isLoading : false,
		
		// Data repositories
		channelTags : null,
		channels : null,
		epg : null,
		
		/*
		 * Called after data loaded
		 */
		checkLoaded : function () {
			this.isLoaded = !!(this.channelTags && this.channels && this.epg); 
			if (this.isLoaded && this.isLoading) {
				this.isLoading = false;
				$(document).trigger('dataloaded');
			}
		},
		/*
		 * Called after load timeout.
		 * The argument is this tvheadend object instance.
		 */
		checkTimeout : function(me) { 
			if (!me.data.isLoaded) {
				$(document).trigger('timeout');
			};
		}
	},
	
	/*
	 * Initialization
	 */
	init : function(reset) {
		
		if (reset) {
			this.data.isLoaded = false;
			this.data.isLoading = false;
		}
		
		// Ensure we have the server URL
		this._checkserverUrl(reset);
		
		// Use the already loaded data or retrieve it from server
		if (this.data.isLoaded) {
			$(document).trigger('dataloaded');
		} else if (!this.data.isLoading) {
			this.refresh();
		} 
		
		$(document).trigger('initdone');
	},
	
	/*
	 * Refresh all data
	 */
	refresh : function() {
		this.data.isLoading = true;
		this.data.isLoaded = false;
		
		// 3rd. parameter is the tvheadend object instance!!!
		setTimeout(this.data.checkTimeout, this.timeout, this); 
		
		// Load everything
		var me = this;
		this._sendRequest('channeltags', 'listTags', 
				function(data){me.data.channelTags = data; });
		this._sendRequest('channels', 'list', 
				function(data){me.data.channels = data;});
		this._sendRequest('epg', 'start=0&limit=200', 
				function(data){me.data.epg = data;});
	},
	
	/*
	 * Check if the server url is populated
	 */
	_checkserverUrl : function(reset) {
		
		if (this.serverUrl && !reset) {
			// Already set 
			return;
		}
		
		// Set defaults
		this.defaultServerProtocol = location.protocol;
		this.defaultServerIP = location.hostname;
		this.defaultServerPort = '9981';	
		this.defaultLinkType = 'stream';
		
		// Get from DST
		dstServerIP = $.DSt.get('serverip');
		dstServerPort = $.DSt.get('serverport');
		dstLinkType = $.DSt.get('linktype');
		
		// Set saved values or defaults
		if (dstServerIP) {
			this.serverIP = dstServerIP;
		} else {
			this.serverIP = this.defaultServerIP;
		}
		
		if (dstServerPort) {
			this.serverPort = dstServerPort;
		} else {
			this.serverPort = this.defaultServerPort;	
		}

		if (dstLinkType) {
			this.linkType = dstLinkType;
		} else {
			this.linkType = this.defaultLinkType;	
		}

		// Only default protocol
		this.serverProtocol = this.defaultServerProtocol;
		
		// Default tvheadend server and proxy url
		var urlBase = this.serverProtocol + '//' + this.serverIP;
		this.serverUrl = urlBase+':'+this.serverPort;

		// Create the proxy url
		this.serverUrlProxy = location.protocol+'//'+location.hostname+location.pathname + 'jsonp-proxy.php';
		
	},
	
	/*
	 * Send AJAX request to tvheadend
	 */
	_sendRequest : function(api, operation, resultCallback) 
	{
		/*
		 * Default ajax parameters. 
		 * They can only be used from a native app because the "same origin"
		 * restriction doesn't apply. NOTE: Even if this mobile web app is in the same server
		 * the restriction would be active because of the different port (80 vs. 9981)
		 */
		var url = this.serverUrl+'/'+api;
		var data = 'op='+operation;
		var dataType = 'json';
		var type = 'POST';
		
		/*
		 * If we are using the ajax proxy because we are not in the same domain than the 
		 * tvheadend server, we must use JSONP instead of plain old JSON.    
		 */
		if (this.useProxy) {
			url = this.serverUrlProxy;
			data = 'url='+encodeURIComponent(this.serverUrl)+'&api='+api+'&op='+operation;
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

	/*
	 * Return a channeltag object
	 */
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

	/*
	 * Return all channels for a given channel tag
	 */
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
	
	/*
	 * Return a channel object by its id
	 */
	findChannelById : function(identifier)
	{
		var found=null;
		
		if (this.data.channels) {
			$.each(this.data.channels.entries, function(i, channel) {
				if (channel.chid == identifier) {
					found=channel;
					return false;
				}
			});
		}
		
		return found;
	},

	/*
	 * Return the EPG info
	 */
	findEpg : function(id)
	{
		var found=null;
		
		if (this.data.epg) {
			$.each(this.data.epg.entries, function(i, entry) {		
				if(entry.id == id) {
					found=entry;
					return false;
				}
			});
		}
		
		return found;
	},
	
	/*
	 * Return the EPG info for a channel
	 */
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
	
	/*
	 * Return the current EPG entry for a channel
	 */
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

	/*
	 * Return the next EPG info for a channel
	 */
	findEpgNextByChannel : function(channelid, currentEpgEntry)
	{
		var currStart = new Date();
		var currEnd = new Date();

		if (currentEpgEntry) {
			currStart = new Date(currentEpgEntry.start * 1000);
			currEnd = new Date(currentEpgEntry.end * 1000);
		}
		
		var result = null;
		var resultStart = new Date();
		resultStart.setDate(resultStart.getDate() + 1);
		var currDate = new Date();
		
		var epg = this.findEpgByChannel(channelid);
		
		$.each(epg.entries, function(i, entry) {		
			var start = new Date(entry.start * 1000);
			if (start.getTime() > currDate.getTime() && start.getTime() >= currEnd.getTime()) {
				if (start.getTime() < resultStart) {
					result = entry;
					resultStart = start.getTime(); 
					return false;
				}
			}
		});
		
		return result;
	},

	/*
	 * Return the stream url for a channel
	 */
	getChannelStreamUrl : function(chid)
	{	
		if (this.linkType == 'stream') {
			return this.serverUrl+'/stream/channelid/'+chid;
		}
		
		return this.serverUrl+'/playlist/channelid/'+chid;
	}
};

/*************************************************************
 * Page "loading"
 *************************************************************
 */
$( '#page_loading' ).live( 'pageinit',function(event){
	console.debug('page_loading.pageinit');

	$( '#page_loading' ).on( 'pagebeforeshow',function(event){		
		if (tvheadend.data.isLoaded) {
			// Data has been already loaded, switch to home right now!!
			$.mobile.changePage("#page_home");
		} else {
			// Wait for data loaded and then switch to home 
			$( document ).one( 'dataloaded',function(event){
				$.mobile.changePage("#page_home");
			});
		}
	});
	
});
	
/*************************************************************
 * Page "error"
 *************************************************************
 */
$( '#page_error' ).live( 'pageinit',function(event){
	console.debug('page_error.pageinit');
	
	// Data refresh on click
	$("#page_error #btn_retry").on('click', function() {
		tvheadend.refresh();
	});
	
});

/*************************************************************
 * Page "channeltags"
 *************************************************************
 */
$( '#page_channeltags' ).live( 'pageinit',function(event){
	console.debug('page_channeltags.pageinit');
		
	// Fill page
	$( '#page_channeltags' ).on( 'pagebeforeshow',function(event){		
		console.debug('page_channeltags.pagebeforeshow');
			
		// Load data if needed
		if (!tvheadend.data.isLoaded) {
			tvheadend.refresh();
			$.mobile.changePage("#page_loading");
			return;
		}
		
		// Fill the list
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

/*************************************************************
 * Page "channels"
 *************************************************************
 */
$( '#page_channels' ).live( 'pageinit',function(event){
	console.debug('page_channels.pageinit');
	
	// Fill page
	$("#page_channels").on("pagebeforeshow", function(e, data){
		console.debug('page_channels.pagebeforeshow');
		
		// Load data if needed
		if (!tvheadend.data.isLoaded) {
			tvheadend.refresh();
			$.mobile.changePage("#page_loading");
			return;
		}
		
		fillPage();
	});
	
	// Sort by number / by name
	$("#page_channels #btn_sort_number").on('click', function() {
		fillPage('number');
	});
	$("#page_channels #btn_sort_name").on('click', function() {
		fillPage('name');
	});
	
	// Data refresh 
	$("#page_channels #btn_refresh").on('click', function() {
		$( document ).one( 'dataloaded',function(event){
			fillPage();
		});
		pageLoading.show();
		tvheadend.refresh();
	});

	// Fill page
	function fillPage(sort)
	{		
		pageLoading.show();
		
		// Look for parameters
	    if ($.mobile.pageData && $.mobile.pageData.channeltag) {
	    	// Show channels for that channeltag 
	    	channelTag = tvheadend.findChannelTag($.mobile.pageData.channeltag);
	    	$("#page_channels h1").hide();
	    	$("h1.lbl_channelsByTag").show();
	    	$('.txt_channeltag').html(channelTag.name);

	    	channels = tvheadend.findChannelsByChannelTag($.mobile.pageData.channeltag);
	    	setTimeout(fillChannelsList, 0, channels, sort);	    	
	    } else {
	    	// Show all channels
	    	setTimeout(fillChannelsList, 0, tvheadend.data.channels, sort);
	    	$("#page_channels h1").hide();
	    	$("h1.lbl_channels").show();
	    };		
	};

	// Fill channels list
	function fillChannelsList(channels, sort)
	{
		pageLoading.show();
		
		// Look an apply sort type
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
		
		// Let's accumulate here the items to add to the list
		var listItems = [];
		
		// This function object will add an array of items to the list variable
		channelsListFillAll = function(channels) {
			$.each(channels.entries, function(i, channel) {		
				
				var epg = '';
				
				// Retrieve the current EPG entry for the channel 
				var epgEntryCurrent = tvheadend.findEpgCurrentByChannel(channel.chid);
				if (epgEntryCurrent) {
					epg+= epgFormat.current(epgEntryCurrent); 
				};
				
				// Retrieve the next EPG entry
				var epgEntryNext = tvheadend.findEpgNextByChannel(channel.chid, epgEntryCurrent);
				if (epgEntryNext) {
					epg+= epgFormat.next(epgEntryNext); 
				};
				
				// Create the EPG info link
				var epgPar = [];
				epgPar.push('chid='+channel.chid);
				
				if (epgEntryCurrent) {
					epgPar.push('current='+epgEntryCurrent.id);
				}
				
				if (epgEntryNext) {
					epgPar.push('next='+epgEntryNext.id);
				}
				var epgInfoLink = '#page_epgevent?'+epgPar.join('&');
				
				// Create the stream url link
				var streamLink = tvheadend.getChannelStreamUrl(channel.chid);

				// Crate the list item
				channel.number = channel.number ? channel.number : '';
				item = 	'<a href="'+epgInfoLink+'">'+
						'<h3 class="channel-name-block">'+
						'<span class="channel-number">'+channel.number+'</span>'+
						'<span class="channel-icon"><img src="'+channel.ch_icon+'"></span>'+
						'<span class="channel-name">'+channel.name+'</span></h3>'+
						epg +
						'</a>';

				item+= '<a href="'+streamLink+'" />';
				
				// Finished
				listItems.push('<li>'+item+'</li>');
			});
		};
		
		// This function object will wrapup the list filling
		channelsWrapUp = function () {
			$('#page_channels .list_channels').
				html(listItems.join('')).
				listview('refresh');
				
			pageLoading.hide();
		};
		
		// We use a task queue to avoid GUI freezing 
		tasks = [];

		size = 1; // Items subarray size, adjustable for performance tweaking
		
		// Create a task for each subarray
		$.each(channels.entries, function(i, channelEntry) {
			if ((i % size) == 0) {
				slice = channels.entries.slice(i, i+size);
				slice.entries = slice;
				tasks.push([channelsListFillAll, slice]);
			}
		});
		
		// Create a task to finish the list
		tasks.push(channelsWrapUp);

		// Run all tasks in order
		utils.runTasks(tasks);
	}    	

});

/*************************************************************
 * Page "epg"
 *************************************************************
 */
$( '#page_epg' ).live( 'pageinit',function(event){
	console.debug('page_epg.pageinit');
	
	// Fill page
	$("#page_epg").on("pagebeforeshow", function(e, data){
		console.debug('page_epg.pagebeforeshow');
		
		// Load data if needed
		if (!tvheadend.data.isLoaded) {
			tvheadend.refresh();
			$.mobile.changePage("#page_loading");
			return;
		}
		
		fillPage();
	});
	
	// Sort by date / by channel
	$("#page_epg #btn_sort_date").on('click', function() {
		fillPage('date');
	});
	$("#page_epg #btn_sort_channel").on('click', function() {
		fillPage('channel');
	});
	
	// Data refresh
	$("#page_epg #btn_refresh").on('click', function() {
		$( document ).one( 'dataloaded',function(event){
			fillPage();
		});
		pageLoading.show();
		tvheadend.refresh();
	});
	
	// Fill page
	function fillPage(sort)
	{	
		pageLoading.show();
		setTimeout(fillEpgList, 0, tvheadend.data.epg, sort);
	};

	// Fill epg list
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
		
		// Let's accumulate here the items to add to the list
		var listItems = [];
		
		// Current channel (for sorting by channel)
		var currChannel = ''; 
		
		// This function object will add an array of items to the list variable
		epgListFillAll = function(epglist) {
			
			$.each(epglist.entries, function(i, epgEntry) {
				var epg = '';

				var channel = tvheadend.findChannelById(epgEntry.channelid);
				
				if (sort == 'channel') {
					if (epgEntry.channelid != currChannel) {
						listItems.push('<li data-role="list-divider" class="channel-group">'+
								'<span class="channel-icon"><img src="'+channel.ch_icon+'" onerror="this.style.display = \'none\'"></span>'+
								'<span class="channel-name">'+epgEntry.channel+'</span></li>');
						currChannel = epgEntry.channelid;
					}
				}
					
				// Create the EPG info link
				var epgPar = [];
				epgPar.push('chid='+channel.chid);
				
				var epgEntryCurrent = tvheadend.findEpgCurrentByChannel(epgEntry.channelid);
				if (epgEntryCurrent && epgEntryCurrent.id == epgEntry.id) {
					epg+= epgFormat.current(epgEntry);
					epgPar.push('current='+epgEntry.id);
				} else {
					epg+= epgFormat.next(epgEntry);
					epgPar.push('next='+epgEntry.id);
				};
				var epgInfoLink = '#page_epgevent?'+epgPar.join('&');
				
				// Create the stream url link
				var streamLink = tvheadend.getChannelStreamUrl(channel.chid);

				if (sort == 'channel') {
					item = 
						'<a href="'+epgInfoLink+'">'+
						epg +
						'</a>';
				} else { // 'time'
					item = 
						'<a href="'+epgInfoLink+'">'+
						'<h3 class="channel-name-block">'+
						'<span class="channel-icon">'+
							'<img src="'+channel.ch_icon+'" onerror="this.style.display = \'none\'"></span>'+
						'<span class="channel-name">'+epgEntry.channel+'</span></h3>'+
						epg +
						'</a>';
				}
				
				item+= '<a href="'+streamLink+'" data-split-icon="info" />';

				listItems.push('<li>'+item+'</li>');
			});

		}; 	

		// This function object will wrapup the list filling
		epgWrapUp = function () {
			$("#page_epg .list_epg").
				html(listItems.join('')).
				listview('refresh');
			pageLoading.hide();
		};
		
		// We use a task queue to avoid GUI freezing 
		tasks = [];

		size = 1; // Items subarray size, adjustable for performance tweaking
		
		// Create a task for each subarray
		$.each(epglist.entries, function(i, epgEntry) {
			if ((i % size) == 0) {
				slice = epglist.entries.slice(i, i+size);
				slice.entries = slice;
				tasks.push([epgListFillAll, slice]);
			}
		});
		
		// Create a task to finish the list
		tasks.push(epgWrapUp);

		// Run all tasks in order
		utils.runTasks(tasks);
	};
});

/*************************************************************
 * Page "epgevent"
 *************************************************************
 */
$( '#page_epgevent' ).live( 'pageinit',function(event){
	console.debug('page_epgevent.pageinit');
	
	// Fill page
	$("#page_epgevent").on("pagebeforeshow", function(e, data){
		console.debug('page_epgevent.pagebeforeshow');
			
		// Load data if needed
		if (!tvheadend.data.isLoaded) {
			tvheadend.refresh();
			$.mobile.changePage("#page_loading");
			return;
		}
		
		// Look for parameters
		var chid, current, next;
	    if ($.mobile.pageData && $.mobile.pageData.chid) {
	    	chid = $.mobile.pageData.chid;
	    }		
	    if ($.mobile.pageData && $.mobile.pageData.current) {
	    	current = tvheadend.findEpg($.mobile.pageData.current);
	    }
	    if ($.mobile.pageData && $.mobile.pageData.next) {
	    	next = tvheadend.findEpg($.mobile.pageData.next);
	    }

	    var text = '';
	    
	    channel = tvheadend.findChannelById(chid);
	    
	    if (channel) {
			text+= '<h3 class="channel-name-block">'+
					'<span class="channel-icon">'+
						'<img src="'+channel.ch_icon+'" onerror="this.style.display = \'none\'"></span>'+
					'<span class="channel-name">'+channel.name+'</span></h3>';
	    }
	    
	    if (current) {
	    	text+= epgFormat.current(current, true);
	    }
	    
	    if (next) {
	    	text+= current ? '<hr/>' : '';
	    	text+= epgFormat.next(next, true);
	    }
	    
	    if (channel) {
		    var streamLink = tvheadend.getChannelStreamUrl(channel.chid);
		    
		    text+= '<div style="clear:both"/>';
		    text+= '<a href="'+streamLink+'" data-role="button" '+
		    		'data-theme="b" data-inline="true" rel="localize[watch-channel]">Watch channel</a>';
	    }
	    
	    $("#page_epgevent #content").
	    	html(text).
	    	translate().
	    	end().
	    	trigger('create');
	});
});	

/*************************************************************
 * Page "config"
 *************************************************************
 */
$( '#page_config' ).live( 'pageinit',function(event){
	console.debug('page_config.pageinit');

	// Fill page
	$("#page_config").on("pagebeforeshow", function(e, data){
		console.debug('page_config.pagebeforeshow');
		
		setValues();
	});
	
	// Defaults
	$("#page_config #btn_default").on('click', function() {
		setDefaults();
	});
	
	function setDefaults() 
	{
		$("#page_config #fld_serverip").val(tvheadend.defaultServerIP);
		$("#page_config #fld_serverport").val(tvheadend.defaultServerPort);
		$("#page_config #fld_linktype").val(tvheadend.defaultLinkType);
	};

	function setValues() 
	{
		$("#page_config #fld_serverip").val(tvheadend.serverIP);
		$("#page_config #fld_serverport").val(tvheadend.serverPort);
		$("#page_config #fld_linktype").val(tvheadend.linkType);
	};
	
	$('#form_config').submit(function() {  
		  var err = false;  
		  
		  // Reset errors
		  $("#form_config label").removeClass('error');	 
		  $("#form_config #message").text('').hide();

		  // Validation: all fields required  
		  $("#form_config input").reverse().each(function(index, field){  
		    if($(field).val() == null || $(field).val() =='') {  
		      $(field).prev().addClass('error');
		      $(field).focus();
		      err = true;  
		    }  
		  });  
		  
		  if (err) {
			  $("#form_config #message").
			  	text("ERROR: Fill all required fields").
			  	attr("rel", "localize[error.fill-all]").translate().
			  	fadeIn('fast');
			  return false;
		  }

		  // Get current values
		  ipOrHostname = $("#page_config #fld_serverip").val();
		  port = $("#page_config #fld_serverport").val();
		  linktype = $("#page_config #fld_linktype").val();

		  // Validate server name/IP and port
		  ipParts = ipOrHostname.split('.');
		  if (ipParts.length == 4) {
			  // If it looks like an IP it must validate
			  $.each(ipParts, function(i, part){
				  if (!utils.isNumber(part) || part > 255 ) {
					  err = true;
					  return false;
				  }
			  })
			  if (err) {
				  $("#fld_serverip").prev().addClass('error');
				  $("#fld_serverip").focus();
				  $("#form_config #message").
				  	text('ERROR: Not a valid IP').
				  	attr("rel", "localize[error.invalid-ip]").translate().
				  	fadeIn('fast');
				  return false;
			  }
		  }
		  
		  if (!utils.isNumber(port) || port < 1024 || port > 65535 ) {
			  $("#fld_serverport").prev().addClass('error');
			  $("#fld_serverport").focus();
			  $("#form_config #message").
			  	text('ERROR: Not a valid port').
			  	attr("rel", "localize[error.invalid-port]").translate().
			  	fadeIn('fast');
			  return false;			  
		  }
		  
		  // Save values
		  $.DSt.set('serverip', ipOrHostname);
		  $.DSt.set('serverport', port);
		  $.DSt.set('linktype', linktype);
			  
		  // Reload data
		  tvheadend.init(true);
		  $.mobile.changePage("#page_loading");
		  
		  // Must return false to avoid real submission
		  return false;
	});
});

/*
 * Helper to format the EPG information
 */
var epgFormat = {
		
		_item : function(epgEntry, displayRemaining) {
			
			var epg= '<h4 class="epg-title">'+epgEntry.title+'</h4>';
			
			epg+= '<h5 class="epg-entry">'+
			'<span class="epg-duration">['+utils.getDisplayDuration(epgEntry.duration)+']</span>'+
			'<span class="epg-start">'+utils.getDisplayTime(epgEntry.start)+'</span>'+
			'<span class="epg-bar">'+
			'<span class="epg-barc" style="width:'+utils.getElapsedDuration(epgEntry.start, epgEntry.end, 80)+'px;">&nbsp;'+
			'</span></span>' +
			'<span class="epg-end">'+utils.getDisplayTime(epgEntry.end)+'</span>';
			
			if (displayRemaining) {
				epg+='<span class="epg-remain">['+utils.getDisplayRemaining(epgEntry.start, epgEntry.end)+']</span>';
			}
			epg+='</h5>';
			
			return epg;
		},

		current : function(epgEntry, showDescription) {
			
			var epg = this._item(epgEntry, true);
			
			if (showDescription) {
				epg+= '<p class="epg-description">'+epgEntry.description+'</p>';
			}
			
			return epg;
		},
		
		next: function(epgEntry, showDescription) {
			
			var epg = this._item(epgEntry);
			
			if (showDescription) {
				epg+= '<p class="epg-description">'+epgEntry.description+'</p>';
			}
			
			return epg;
		},
}

/*
 * Object to handle page loading indications
 */
var pageLoading = {
		
	show: function()
		{
			$("body").append('<div class="pageLoading"/>');
			setTimeout('$.mobile.showPageLoadingMsg()', 1);
			setTimeout('pageLoading.hide()', 15000);
		},

	hide: function()
		{
			$(".pageLoading").remove();
			setTimeout('$.mobile.hidePageLoadingMsg()', 1);
		},
};
 


