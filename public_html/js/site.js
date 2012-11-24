/*
 * ----------------------------------------------------------------------------
 * Copyright (c) 2012 Miguel Angel Gabriel. All Rights Reserved. 
 * Released under the GNU GPL V3. 
 * ----------------------------------------------------------------------------
 */
"use strict";

/* Declare namespace */
var Mags = Mags || {};
Mags.Tvhv = Mags.Tvhv || {};

/*******************************************************************************
 * Initialization
 * *****************************************************************************
 */
Mags.Tvhv.init = Mags.Tvhv.init || {};

(function($, self) {
	(self.init = function() {

		/*
		 * Setup when DOM ready
		 */
		$(document).ready(function() {
			console.debug('document.ready');

			// Retrieve saved values
			self.data.config.load();

			/*
			 * Set the language and translate everything
			 */
			$.setLanguage(self.data.config.values.language);
			$("body").translate();
		});

		/*
		 * Setup mobile
		 */
		$(document).on("mobileinit", function() {
			console.debug('document.mobileinit');

			// UI defaults
			$.mobile.loader.prototype.options.theme = "a";

			// Load data
			self.helpers.tvheadend.init();
		});

	})();
})(jQuery, Mags.Tvhv);

/*******************************************************************************
 * Capture some events
 * *****************************************************************************
 */
Mags.Tvhv.events = Mags.Tvhv.events || {};

(function($, self) {
	(self.events = function() {

		/*
		 * Retrieve the parameters sent to any window (see jqm.page.params.js)
		 */
		$(document).on("pagebeforechange", function(event, data) {
			$.mobile.pageData = (data && data.options && data.options.pageData)
					? data.options.pageData
					: null;
		});

		/*
		 * Timeout event (from ajax)
		 */
		$(document).on('timeout', function(event, data) {
			self.helpers.pageLoading.hide();
			$.mobile.changePage("#page_error");
		});

		/*
		 * Track some other events (for debugging)
		 */
		var events = 'initdone pagebeforecreate pagecreate pageinit pagebeforechange timeout dataloaded';
		$(document)
				.on(events, function(event, data) {
					var url = (event
							&& event.target
							&& event.target.dataset
							&& event.target.dataset.url ? event.target.dataset.url : '');
					var toPage = (data && data.toPage && typeof data.toPage == 'string'
							? data.toPage
							: '');

					console.debug('document.' + event.type + ' ' + url + toPage);
				});

	})();
})(jQuery, Mags.Tvhv);

/*******************************************************************************
 * Data members
 * *****************************************************************************
 */
Mags.Tvhv.data = Mags.Tvhv.data || {};

(function($, self) {
	self.data = {

		/*
		 * Configuration values
		 */
		config : {
			defaults : {
				linkType : 'stream',
				language : 'en',
			},
			values : {
				linkType : '',
				language : '',
			},

			setDefaults : function() {
				this.values.linkType = this.defaults.linkType;
				this.values.language = this.defaults.language;
			},

			load : function() {
				this.values.linkType = $.DSt.get('linkType') || this.defaults.linkType;
				this.values.language = $.DSt.get('language') || this.defaults.language;
			},

			save : function() {
				$.DSt.set('linkType', this.values.linkType);
				$.DSt.set('language', this.values.language);
			}
		},

	};
})($, Mags.Tvhv);

/*******************************************************************************
 * Page handlers
 * *****************************************************************************
 */
Mags.Tvhv.pages = Mags.Tvhv.pages || {};

/* =============================================================================
 * Page "loading"
 * =============================================================================
 */
(function($, self) {
	(self.pages.loading = function() {

		$(document).on('pagebeforeshow', '#page_loading', function(event) {
			if (self.helpers.tvheadend.data.isLoaded) {
				// Data has been already loaded, switch to home right now!!
				$.mobile.changePage("#page_home");
			} else {
				// Wait for data loaded and then switch to home
				$(document).one('dataloaded', function(event) {
					$.mobile.changePage("#page_home");
				});
			}
		});

	})();
})($, Mags.Tvhv);

/* =============================================================================
 * Page "error"
 * =============================================================================
 */
(function($, self) {
	(self.pages.error = function() {

		// Data refresh on click
		$(document).on('click', '#page_error #btn_retry', function() {
			self.helpers.tvheadend.refresh();
		});

	})();
})($, Mags.Tvhv);

/* =============================================================================
 * Page "channeltags"
 * =============================================================================
 */
(function($, self) {
	(self.pages.channeltags = function() {

		// Init page contents
		$(document).on('pagebeforeshow', '#page_channeltags', function(event) {
			console.debug('page_channeltags.pagebeforeshow');

			// Fill the list asynchronously
			self.helpers.pageLoading.show();

			var listFiller = new Mags.Tools.ListFiller($(".list_channeltags"));

			$.each(self.helpers.tvheadend.data.channelTags.entries, function(i, tag) {
				listFiller.addItem(tag, function(tag) {
					var item = [];
					item.push('<li>');
					item.push('<a href="#page_channels?channeltag=' + tag.identifier + '">');
					item.push('<h3>' + tag.name + '</h3>');
					item.push('</a>');
					item.push('</li>');
					return item.join('');
				});
			});

			listFiller.run(function() {
				self.helpers.pageLoading.hide();
			});
		});

		// });
	})();
})($, Mags.Tvhv);

/* =============================================================================
 * Page "channels"
 * =============================================================================
 */
(function($, self) {
	(self.pages.channels = function() {

		// Init page conntents
		$(document).on('pagebeforeshow', '#page_channels', function(e, data) {
			console.debug('page_channels.pagebeforeshow');

			// Do not fill list if coming back from detail
			if (data
					&& data.prevPage[0]
					&& data.prevPage[0].dataset
					&& data.prevPage[0].dataset.url == 'page_epgevent') {
				return;
			}

			fillPage();
		});

		// Sort by number / by name
		$(document).on('click', '#page_channels #btn_sort_number', function() {
			fillPage('number');
		});
		$(document).on('click', '#page_channels #btn_sort_name', function() {
			fillPage('name');
		});

		// Data refresh
		$(document).on('click', '#page_channels #btn_refresh', function() {
			$(document).one('dataloaded', function(event) {
				fillPage();
			});
			self.helpers.pageLoading.show();
			self.helpers.tvheadend.refresh();
		});

		// Fill page
		function fillPage(sort) {
			self.helpers.pageLoading.show();

			$("#page_channels #lbl_channels").hide();
			$("#page_channels #txt_channeltag").hide();

			// Look for parameters
			if ($.mobile.pageData && $.mobile.pageData.channeltag) {
				// Show channels for that channeltag
				var channelTag = self.helpers.tvheadend
						.findChannelTag($.mobile.pageData.channeltag);
				$("#page_channels #txt_channeltag").show().html(channelTag.name);

				var channels = self.helpers.tvheadend
						.findChannelsByChannelTag($.mobile.pageData.channeltag);
				setTimeout(fillChannelsList, 0, channels, sort);
			} else {
				// Show all channels
				setTimeout(fillChannelsList, 0, self.helpers.tvheadend.data.channels, sort);
				$("#page_channels #lbl_channels").show();
			}
		}

		// Fill channels list
		function fillChannelsList(channels, sort) {
			// Look an apply sort type
			if (!sort) {
				sort = $("#page_channels #sort").html();
			}

			if (sort == 'number') {
				channels.entries = Mags.Tools.sortByKey(channels.entries, 'number:n,name:s', true);
			} else if (sort == 'name') {
				channels.entries = Mags.Tools.sortByKey(channels.entries, 'name:s', true);
			}

			// Save sort for next time
			$("#page_channels #sort").html(sort);

			// Fill the list asynchronously
			self.helpers.pageLoading.show();

			var listFiller = new Mags.Tools.ListFiller($(".list_channels"));

			$.each(channels.entries, function(i, channel) {
				listFiller.addItem(channel, function(channel) {
					var epg = '';

					// Retrieve the current EPG entry for the channel
					var epgEntryCurrent = self.helpers.tvheadend
							.findEpgCurrentByChannel(channel.chid);
					if (epgEntryCurrent) {
						epg += self.helpers.epgFormat.current(epgEntryCurrent);
					}

					// Retrieve the next EPG entry
					var epgEntryNext = self.helpers.tvheadend
							.findEpgNextByChannel(channel.chid, epgEntryCurrent);
					if (epgEntryNext) {
						epg += self.helpers.epgFormat.next(epgEntryNext);
					}

					// Create the EPG info link
					var epgPar = [];
					epgPar.push('chid=' + channel.chid);

					if (epgEntryCurrent) {
						epgPar.push('current=' + epgEntryCurrent.id);
					}

					if (epgEntryNext) {
						epgPar.push('next=' + epgEntryNext.id);
					}
					var epgInfoLink = '#page_epgevent?' + epgPar.join('&');

					// Create the stream url link
					var streamLink = self.helpers.tvheadend.getChannelStreamUrl(channel.chid);

					var item = [];
					item.push('<li>');

					// Crate the list item
					channel.number = channel.number ? channel.number : '';
					item.push('<a href="' + epgInfoLink + '">');
					item.push('<h3 class="channel-name-block">');
					item.push('<span class="channel-number">' + channel.number + '</span>');
					if (channel.ch_icon || '') {
						item.push('<span class="channel-icon"><img src="'
								+ channel.ch_icon
								+ '"></span>');
					}
					item.push('<span class="channel-name">' + channel.name + '</span></h3>');
					item.push(epg);
					item.push('</a>');

					item.push('<a href="' + streamLink + '" target="_blank"/>');

					// Finished
					item.push('</li>');

					return item.join('');
				});
			});

			listFiller.run(function() {
				self.helpers.pageLoading.hide();
			});
		}

	})();
})($, Mags.Tvhv);

/* =============================================================================
 * Page "epg"
 * =============================================================================
 */
(function($, self) {
	(self.pages.epg = function() {

		/* 
		 * Init page contents
		 */
		$(document).on('pagebeforeshow', '#page_epg', function(e, data) {
			console.debug('page_epg.pagebeforeshow');

			// Do not fill list if coming back from detail
			if (data
					&& data.prevPage[0]
					&& data.prevPage[0].dataset
					&& data.prevPage[0].dataset.url == 'page_epgevent') {
				return;
			}

			fillPage();
		});

		/*
		 * Sort by date / by channel
		 */
		$(document).on('click', '#page_epg #btn_sort_date', function() {
			fillPage('date');
		});
		$(document).on('click', '#page_epg #btn_sort_channel', function() {
			fillPage('channel');
		});

		/* 
		 * Data refresh
		 */
		$(document).on('click', '#page_epg #btn_refresh', function() {
			$(document).one('dataloaded', function(event) {
				fillPage();
			});
			self.helpers.pageLoading.show();
			self.helpers.tvheadend.refresh();
		});

		/* 
		 * Fill page
		 */
		function fillPage(sort) {
			self.helpers.pageLoading.show();
			setTimeout(fillEpgList, 0, self.helpers.tvheadend.data.epg, sort);
		}

		/* 
		 * Fill epg list
		 */
		function fillEpgList(epglist, sort) {
			// Look an apply sort type
			if (!sort) {
				sort = $("#page_epg #sort").html();
			}

			if (sort == 'date') {
				epglist.entries = Mags.Tools.sortByKey(epglist.entries, 'start:n,end:n', true);
			} else if (sort == 'channel') {
				epglist.entries = Mags.Tools.sortByKey(epglist.entries, 'channel:s,start:n', true);
			}

			// Save sort for next time
			$("#page_epg #sort").html(sort);

			// Current channel (for sorting by channel)
			var currChannel = '';

			// Fill the list asynchronously
			self.helpers.pageLoading.show();

			var listFiller = new Mags.Tools.ListFiller($('#page_epg .list_epg'));

			$
					.each(epglist.entries, function(i, epgEntry) {
						listFiller
								.addItem(epgEntry, function(epgEntry) {

									var item = [];

									var epg = '';

									var channel = self.helpers.tvheadend
											.findChannelById(epgEntry.channelid);

									if (sort == 'channel') {
										if (epgEntry.channelid != currChannel) {
											item
													.push('<li data-role="list-divider" class="channel-group">');
											item.push('<span class="channel-icon">');
											if (channel.ch_icon || '') {
												item
														.push('<img src="'
																+ channel.ch_icon
																+ '" onerror="this.style.display = \'none\'">');
											}
											item.push('</span>');
											item.push('<span class="channel-name">'
													+ epgEntry.channel
													+ '</span></li>');
											currChannel = epgEntry.channelid;
										}
									}

									// Create the EPG info link
									var epgPar = [];
									epgPar.push('chid=' + epgEntry.channelid);

									var epgEntryCurrent = self.helpers.tvheadend
											.findEpgCurrentByChannel(epgEntry.channelid);
									if (epgEntryCurrent && epgEntryCurrent.id == epgEntry.id) {
										epg += self.helpers.epgFormat.current(epgEntry);
										epgPar.push('current=' + epgEntry.id);
									} else {
										epg += self.helpers.epgFormat.next(epgEntry);
										epgPar.push('next=' + epgEntry.id);
									}

									var epgInfoLink = '#page_epgevent?' + epgPar.join('&');

									// Create the stream url link
									var streamLink = self.helpers.tvheadend
											.getChannelStreamUrl(epgEntry.channelid);

									item.push('<li>');

									if (sort == 'channel') {
										item.push('<a href="' + epgInfoLink + '">' + epg + '</a>');
									} else { // 'date'
										item.push('<a href="' + epgInfoLink + '">');
										item.push('<h3 class="channel-name-block">');
										item.push('<span class="channel-icon">');
										if (channel.ch_icon || '') {
											item.push('<img src="'
													+ channel.ch_icon
													+ '" onerror="this.style.display = \'none\'">');
										}
										item.push('</span>');
										item.push('<span class="channel-name">'
												+ epgEntry.channel
												+ '</span></h3>');
										item.push(epg);
										item.push('</a>');
									}

									item.push('<a href="'
											+ streamLink
											+ '" target="_blank" data-split-icon="info" />');

									item.push('</li>');

									return item.join('');
								});

					});

			listFiller.run(function() {
				self.helpers.pageLoading.hide();
			});

		}

	})();
})($, Mags.Tvhv);

/* =============================================================================
 * Page "epgevent"
 * =============================================================================
 */
(function($, self) {
	(self.pages.epgevent = function() {

		// Init page contents
		$(document).on('pagebeforeshow', '#page_epgevent', function(e, data) {
			console.debug('page_epgevent.pagebeforeshow');

			// Look for parameters
			var chid, current, next;
			if ($.mobile.pageData && $.mobile.pageData.chid) {
				chid = $.mobile.pageData.chid;
			}
			if ($.mobile.pageData && $.mobile.pageData.current) {
				current = self.helpers.tvheadend.findEpg($.mobile.pageData.current);
			}
			if ($.mobile.pageData && $.mobile.pageData.next) {
				next = self.helpers.tvheadend.findEpg($.mobile.pageData.next);
			}

			var text = '';

			var channel = self.helpers.tvheadend.findChannelById(chid);

			if (channel) {
				channel.ch_icon = channel.ch_icon || '';

				text += '<h3 class="channel-name-block">'
						+ '<span class="channel-icon">'
						+ '<img src="'
						+ channel.ch_icon
						+ '" onerror="this.style.display = \'none\'"></span>'
						+ '<span class="channel-name">'
						+ channel.name
						+ '</span></h3>';
				var streamLink = self.helpers.tvheadend.getChannelStreamUrl(channel.chid);
				$("#page_epgevent #content #btn_watch").attr("href", streamLink)
						.attr('target', '_blank');
			}

			if (current) {
				text += self.helpers.epgFormat.current(current, true);
			}

			if (next) {
				text += current ? '<hr/>' : '';
				text += self.helpers.epgFormat.next(next, true);
			}

			$("#page_epgevent #content #text").html(text).trigger('create');
		});
	})();
})($, Mags.Tvhv);

/* =============================================================================
 * Page "config"
 * =============================================================================
 */
(function($, self) {
	(self.pages.config = function() {

		// Init page contents
		$(document).on('pagebeforeshow', '#page_config', function(e, data) {
			console.debug('page_config.pagebeforeshow');

			setValues();
		});

		// Defaults
		$(document).on('click', '#page_config #btn_default', function() {
			self.data.config.setDefaults();
			setValues();
		});

		function setValues() {

			$("#page_config input[name=fld_language]").each(function(i, item) {
				$(item).attr("checked", $(item).val() == self.data.config.values.language)
						.checkboxradio("refresh");
			});
			
			$("#page_config input[name=fld_linktype]").each(function(i, item) {
				$(item).attr("checked", $(item).val() == self.data.config.values.linkType)
						.checkboxradio("refresh");
			});

		}

		$(document).ready(function() {
			$('#page_config #form_config').submit(function(event) {

				event.preventDefault();
				var err = false;

				// Reset errors
				$("#page_config #form_config label").removeClass('error');
				$("#page_config #form_config #message").text('').hide();

				// Validation: all fields required
				$("#page_config #form_config input").reverse().each(function(index, field) {
					if ($(field).val() == null || $(field).val() == '') {
						$(field).prev().addClass('error');
						$(field).focus();
						err = true;
					}
				});

				if (err) {
					$("#page_config #form_config #message").text("ERROR: Fill all required fields")
							.attr("rel", "localize[error.fill-all]").translate().fadeIn('fast');
					return false;
				}

				// Get current values
				$("#page_config input[name=fld_language]").each(function(i, item) {
					if ($(item).attr("checked")) {
						self.data.config.values.language = $(item).val();
					}
				});

				$("#page_config input[name=fld_linktype]").each(function(i, item) {
					if ($(item).attr("checked")) {
						self.data.config.values.linkType = $(item).val();
					}
				});

				// Save values
				self.data.config.save();

				// Reload the whole html to apply the new settings (especially, the language change)
				var url = $.mobile.path.parseUrl(window.location.href);
				window.location.href = url.hrefNoSearch;

				// Must return false to avoid real submission
				return false;
			});
		});
	})();
})($, Mags.Tvhv);

/*******************************************************************************
 * Helpers
 * *****************************************************************************
 */
Mags.Tvhv.helpers = Mags.Tvhv.helpers || {};

/* =============================================================================
 * Tvheadend handler object
 * =============================================================================
 */
(function($, self) {
	self.helpers.tvheadend = {

		serverUrl : '',

		timeout : 3000,

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
			 * Called after all data loaded
			 */
			checkLoaded : function() {
				this.isLoaded = !!(this.channelTags && this.channels && this.epg);
				if (this.isLoaded && this.isLoading) {
					this.isLoading = false;
					$(document).trigger('dataloaded');
				}
			},
			/*
			 * Called after load timeout. The argument is this tvheadend object
			 * instance.
			 */
			checkTimeout : function(me) {
				if (!me.data.isLoaded) {
					$(document).trigger('timeout');
				}
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

			// Get the server URL
			var url = $.mobile.path.parseUrl(window.location.href);
			this.serverUrl = url.domain;

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
			this._sendRequest('channeltags', 'listTags', function(data) {
				me.data.channelTags = data;
			});
			this._sendRequest('channels', 'list', function(data) {
				me.data.channels = data;
			});
			this._sendRequest('epg', 'start=0&limit=200', function(data) {
				me.data.epg = data;
			});
		},

		/*
		 * Send AJAX request to tvheadend
		 */
		_sendRequest : function(api, operation, resultCallback) {
			/*
			 * Set Ajax call parameters.  
			 */
			var url = this.serverUrl + '/' + api;
			var data = 'op=' + operation;
			var dataType = 'json';
			var type = 'POST';

			var me = this;
			$.ajax({
				url : url,
				data : data,

				type : type,
				cache : false,
				dataType : dataType,
				timeout : this.timeout,
				success : function(data) {
					resultCallback(data);
					me.data.checkLoaded();
				},
				error : function(jqXHR, textStatus, errorThrown) {
					console.debug('AJAX ERROR: ' + textStatus);
				}
			});
		},

		/*
		 * Return a channeltag object
		 */
		findChannelTag : function(identifier) {
			var found = null;

			$.each(this.data.channelTags.entries, function(i, channelTag) {
				if (channelTag.identifier == identifier) {
					found = channelTag;
					return false;
				}
			});

			return found;
		},

		/*
		 * Return all channels for a given channel tag
		 */
		findChannelsByChannelTag : function(channelTag) {
			var result = [];
			$.each(this.data.channels.entries, function(i, channel) {
				var tags = channel.tags.split(',');
				if ($.inArray(channelTag, tags) != -1) {
					result.push(channel);
				}
			});

			result.entries = result;
			return result;
		},

		/*
		 * Return a channel object by its id
		 */
		findChannelById : function(identifier) {
			var found = null;

			if (this.data.channels) {
				$.each(this.data.channels.entries, function(i, channel) {
					if (channel.chid == identifier) {
						found = channel;
						return false;
					}
				});
			}

			return found;
		},

		/*
		 * Return the EPG info
		 */
		findEpg : function(id) {
			var found = null;

			if (this.data.epg) {
				$.each(this.data.epg.entries, function(i, entry) {
					if (entry.id == id) {
						found = entry;
						return false;
					}
				});
			}

			return found;
		},

		/*
		 * Return the EPG info for a channel
		 */
		findEpgByChannel : function(channelid) {
			var result = [];
			$.each(this.data.epg.entries, function(i, entry) {
				if (entry.channelid == channelid) {
					result.push(entry);
				}
			});

			result.entries = result;
			return result;
		},

		/*
		 * Return the current EPG entry for a channel
		 */
		findEpgCurrentByChannel : function(channelid) {
			var epg = this.findEpgByChannel(channelid);

			var result = null;
			var currDate = new Date();
			$.each(epg.entries, function(i, entry) {
				var start = new Date(entry.start * 1000);
				var end = new Date(entry.end * 1000);
				if ((start.getTime() <= currDate.getTime())
						&& (currDate.getTime() <= end.getTime())) {
					result = entry;
					return false;
				}
			});

			return result;
		},

		/*
		 * Return the next EPG info for a channel
		 */
		findEpgNextByChannel : function(channelid, currentEpgEntry) {
			var currEnd = new Date();

			if (currentEpgEntry) {
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
		getChannelStreamUrl : function(chid) {
			if (self.data.config.values.linkType  == 'stream') {
				return this.serverUrl + '/stream/channelid/' + chid;
			}

			return this.serverUrl + '/playlist/channelid/' + chid;
		}

	};
})($, Mags.Tvhv);

/* =============================================================================
 * Helper to format the EPG information
 * =============================================================================
 */
(function($, self) {
	self.helpers.epgFormat = {

		_item : function(epgEntry, displayRemaining) {

			var epg = '<h4 class="epg-title">' + epgEntry.title + '</h4>';

			epg += '<h5 class="epg-entry">'
					+ '<span class="epg-duration">['
					+ Mags.Tools.getDisplayDuration(epgEntry.duration)
					+ ']</span>'
					+ '<span class="epg-start">'
					+ Mags.Tools.getDisplayTime(epgEntry.start)
					+ '</span>'
					+ '<span class="epg-bar">'
					+ '<span class="epg-barc" style="width:'
					+ Mags.Tools.getElapsedDuration(epgEntry.start, epgEntry.end, 80)
					+ 'px;">&nbsp;'
					+ '</span></span>'
					+ '<span class="epg-end">'
					+ Mags.Tools.getDisplayTime(epgEntry.end)
					+ '</span>';

			if (displayRemaining) {
				epg += '<span class="epg-remain">['
						+ Mags.Tools.getDisplayRemaining(epgEntry.start, epgEntry.end)
						+ ']</span>';
			}
			epg += '</h5>';

			return epg;
		},

		current : function(epgEntry, showDescription) {

			var epg = this._item(epgEntry, true);

			if (showDescription) {
				epg += '<p class="epg-description">' + epgEntry.description + '</p>';
			}

			return epg;
		},

		next : function(epgEntry, showDescription) {

			var epg = this._item(epgEntry);

			if (showDescription) {
				epg += '<p class="epg-description">' + epgEntry.description + '</p>';
			}

			return epg;
		}

	};
})($, Mags.Tvhv);

/* =============================================================================
 * Helper to handle page loading indications
 * =============================================================================
 */
(function($, self) {
	self.helpers.pageLoading = {

		show : function() {
			$(".pageLoading").remove();
			$("body").append('<div class="pageLoading"/>');
			$.mobile.loading('show');
			/* showPageLoadingMsg is deprecated but is the only way to show
			 * the loader from pagebeforeshow event (!?)
			 */
			setTimeout($.mobile.showPageLoadingMsg, 1);
		},

		hide : function() {
			$(".pageLoading").remove();
			$.mobile.loading('hide');
		}

	};
})($, Mags.Tvhv);
