/*
 * ----------------------------------------------------------------------------
 * Copyright (c) 2012 Miguel Angel Gabriel. All Rights Reserved. 
 * Released under the GNU GPL V3. 
 * ----------------------------------------------------------------------------
 */

/* Declare namespace */
var Mags = Mags || {};
Mags.Tvhv = Mags.Tvhv || {};

/* Everything goes into the namespace */

/*******************************************************************************
 * Initialization
 * ******************************************************************************
 */
(function($, self) {
	(self.init = function() {
		console.debug('self.init');

		/*
		 * Setup when ready
		 */
		$(document).ready(function() {
			console.debug('document.ready');

			/*
			 * Set the language and translate everything
			 */
			$.setLanguage($.DSt.get('language'));
			$("body").translate();
		});

		/*
		 * Setup mobile
		 */
		$(document).bind("mobileinit", function() {
			console.debug('document.mobileinit');

			// Load data
			self.data.tvheadend.init();
		});

	})();

})(jQuery, Mags.Tvhv);

/*******************************************************************************
 * Capture some events
 * ******************************************************************************
 */
(function($, self) {
	(self.events = function() {
		/*
		 * Retrieve the parameters sent to any window (see jqm.page.params.js)
		 */
		$(document)
				.bind(
						"pagebeforechange",
						function(event, data) {
							if (typeof data.toPage == 'string')
								console.debug('document.pagebeforechange ' + data.toPage);

							$.mobile.pageData = (data && data.options && data.options.pageData) ? data.options.pageData
									: null;
						});

		/*
		 * Timeout event (from ajax)
		 */
		$(document).on('timeout', function(event) {
			console.debug('document.timeout');

			self.helpers.pageLoading.hide();
			$.mobile.changePage("#page_error");
		});

		/*
		 * All data has been loaded from AJAX
		 */
		$(document).on('dataloaded', function(event) {
			console.debug('document.dataloaded');
		});

		/*
		 * Track some other events (for debugging)
		 */
		$(document).on('initdone', function(event) {
			console.debug('document.initdone');
		});
		$(document)
				.on(
						'pagebeforecreate',
						function(event) {
							console
									.debug('document.pagebeforecreate '
											+ (event && event.target && event.target.dataset ? event.target.dataset.url
													: ''));
						});
		$(document)
				.on(
						'pagecreate',
						function(event) {
							console
									.debug('document.pagecreate '
											+ (event && event.target && event.target.dataset ? event.target.dataset.url
													: ''));
						});
		$(document)
				.on(
						'pageinit',
						function(event) {
							console
									.debug('document.pageinit '
											+ (event && event.target && event.target.dataset ? event.target.dataset.url
													: ''));
						});
	})();
})(jQuery, Mags.Tvhv);

/*******************************************************************************
 * Data members
 * ******************************************************************************
 */
(function($, self) {
	self.data = {

		/***********************************************************************
		 * Configuration values
		 * ******************************************************************************
		 */
		config : {
			defaults : {
				serverProtocol : '',
				serverIP : '',
				serverPort : '9981', // Cannot be changed in TVH
				linkType : 'stream',
				language : 'en',
			},
			values : {
				serverProtocol : '',
				serverIP : '',
				serverPort : '',
				linkType : '',
				language : '',
			}
		},

		/***********************************************************************
		 * Tvheadend handler object
		 * ******************************************************************************
		 */
		tvheadend : {

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
				 * Called after load timeout. The argument is this tvheadend
				 * object instance.
				 */
				checkTimeout : function(me) {
					if (!me.data.isLoaded) {
						$(document).trigger('timeout');
					}
					;
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

				// UI Language
				// TODO: Initialize it in a global init function
				dstLanguage = $.DSt.get('language');
				if (dstLanguage) {
					self.data.config.values.language = dstLanguage;
				} else {
					self.data.config.values.language = self.data.config.defaults.language;
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
			 * Check if the server url is populated
			 */
			_checkserverUrl : function(reset) {

				if (this.serverUrl && !reset) {
					// Already set
					return;
				}

				// Set defaults
				self.data.config.defaults.serverProtocol = location.protocol;
				self.data.config.defaults.serverIP = location.hostname;

				// Get saved values from DST
				dstServerIP = $.DSt.get('serverip');
				dstLinkType = $.DSt.get('linktype');

				// Set saved values or defaults
				if (dstServerIP) {
					self.data.config.values.serverIP = dstServerIP;
				} else {
					self.data.config.values.serverIP = self.data.config.defaults.serverIP;
				}

				if (dstLinkType) {
					self.data.config.values.linkType = dstLinkType;
				} else {
					self.data.config.values.linkType = self.data.config.defaults.linkType;
				}

				// Only default protocol and port
				self.data.config.values.serverProtocol = self.data.config.defaults.serverProtocol;
				self.data.config.values.serverPort = self.data.config.defaults.serverPort;

				// Default tvheadend server and proxy url
				var urlBase = self.data.config.values.serverProtocol + '//'
						+ self.data.config.values.serverIP;
				this.serverUrl = urlBase + ':' + self.data.config.values.serverPort;
			},

			/*
			 * Send AJAX request to tvheadend
			 */
			_sendRequest : function(api, operation, resultCallback) {
				/*
				 * Default ajax parameters. They can only be used from a native
				 * app because the "same origin" restriction doesn't apply.
				 * NOTE: Even if this mobile web app is in the same server the
				 * restriction would be active because of the different port (80
				 * vs. 9981)
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
					tags = channel.tags.split(',');
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
					if (start.getTime() > currDate.getTime()
							&& start.getTime() >= currEnd.getTime()) {
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
				if (this.linkType == 'stream') {
					return this.serverUrl + '/stream/channelid/' + chid;
				}

				return this.serverUrl + '/playlist/channelid/' + chid;
			}
		}
	};
})($, Mags.Tvhv);

/*******************************************************************************
 * Page handlers
 * ******************************************************************************
 */
Mags.Tvhv.pages = Mags.Tvhv.pages || {};

(function($, self) {
	(self.pages.loading = function() {

		/***********************************************************************
		 * Page "loading"
		 * ******************************************************************************
		 */
		$('#page_loading').live('pageinit', function(event) {
			console.debug('page_loading.pageinit');

			$('#page_loading').on('pagebeforeshow', function(event) {
				if (self.data.tvheadend.data.isLoaded) {
					// Data has been already loaded, switch to home right now!!
					$.mobile.changePage("#page_home");
				} else {
					// Wait for data loaded and then switch to home
					$(document).one('dataloaded', function(event) {
						$.mobile.changePage("#page_home");
					});
				}
			});

		});
	})();
})($, Mags.Tvhv);

(function($, self) {
	(self.pages.error = function() {

		/***********************************************************************
		 * Page "error"
		 * ******************************************************************************
		 */
		$('#page_error').live('pageinit', function(event) {
			console.debug('page_error.pageinit');

			// Data refresh on click
			$("#page_error #btn_retry").on('click', function() {
				self.data.tvheadend.refresh();
			});

		});
	})();
})($, Mags.Tvhv);

(function($, self) {
	(self.pages.channeltags = function() {

		/***********************************************************************
		 * Page "channeltags"
		 * ******************************************************************************
		 */
		$('#page_channeltags').live(
				'pageinit',
				function(event) {
					console.debug('page_channeltags.pageinit');

					// Fill page
					$('#page_channeltags').on(
							'pagebeforeshow',
							function(event) {
								console.debug('page_channeltags.pagebeforeshow');

								// Load data if needed
								if (!self.data.tvheadend.data.isLoaded) {
									self.data.tvheadend.refresh();
									$.mobile.changePage("#page_loading");
									return;
								}

								// Fill the list
								$(".list_channeltags").empty();
								$.each(self.data.tvheadend.data.channelTags.entries, function(i,
										tag) {
									item = '<li>' + '<a href="#page_channels?channeltag='
											+ tag.identifier + '">' + '	<h3>' + tag.name + '</h3>',
											'</a>' + '</li>';
									$(".list_channeltags").append(item);
								});

								self.helpers.pageLoading.hide();
								$('.list_channeltags').listview('refresh');
							});

				});
	})();
})($, Mags.Tvhv);

(function($, self) {
	(self.pages.channels = function() {

		/***********************************************************************
		 * Page "channels"
		 * **************************************************************************
		 */
		$('#page_channels')
				.live(
						'pageinit',
						function(event) {
							console.debug('page_channels.pageinit');

							// Fill page
							$("#page_channels")
									.on(
											"pagebeforeshow",
											function(e, data) {
												console.debug('page_channels.pagebeforeshow');

												// Load data if needed
												if (!self.data.tvheadend.data.isLoaded) {
													self.data.tvheadend.refresh();
													$.mobile.changePage("#page_loading");
													return;
												}

												// Do not fill list if comming
												// back from
												// detail
												if (data
														&& data.prevPage[0]
														&& data.prevPage[0].dataset
														&& data.prevPage[0].dataset.url == 'page_epgevent') {
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
								$(document).one('dataloaded', function(event) {
									fillPage();
								});
								self.helpers.pageLoading.show();
								self.data.tvheadend.refresh();
							});

							// Fill page
							function fillPage(sort) {
								self.helpers.pageLoading.show();

								$("#lbl_channels").hide();
								$("#txt_channeltag").hide();

								// Look for parameters
								if ($.mobile.pageData && $.mobile.pageData.channeltag) {
									// Show channels for that channeltag
									channelTag = self.data.tvheadend
											.findChannelTag($.mobile.pageData.channeltag);
									$("#txt_channeltag").show().html(channelTag.name);

									channels = self.data.tvheadend
											.findChannelsByChannelTag($.mobile.pageData.channeltag);
									setTimeout(fillChannelsList, 0, channels, sort);
								} else {
									// Show all channels
									setTimeout(fillChannelsList, 0,
											self.data.tvheadend.data.channels, sort);
									$("#lbl_channels").show();
								}
								;
							}
							;

							// Fill channels list
							function fillChannelsList(channels, sort) {
								// Look an apply sort type
								if (!sort) {
									sort = $("#page_channels #sort").html();
								}

								if (sort == 'number') {
									channels.entries = utils.sortByKey(channels.entries,
											'number:n,name:s', true);
								} else if (sort == 'name') {
									channels.entries = utils.sortByKey(channels.entries, 'name:s',
											true);
								}

								// Save sort for next time
								$("#page_channels #sort").html(sort);

								// Let's accumulate here the items to add to the
								// list
								var listItems = [];

								// This function object will add an array of
								// items
								// to
								// the list variable
								channelsListFillAll = function(channels) {
									$
											.each(
													channels.entries,
													function(i, channel) {

														var epg = '';

														// Retrieve the current
														// EPG
														// entry for the channel
														var epgEntryCurrent = self.data.tvheadend
																.findEpgCurrentByChannel(channel.chid);
														if (epgEntryCurrent) {
															epg += self.helpers.epgFormat
																	.current(epgEntryCurrent);
														}
														;

														// Retrieve the next EPG
														// entry
														var epgEntryNext = self.data.tvheadend
																.findEpgNextByChannel(channel.chid,
																		epgEntryCurrent);
														if (epgEntryNext) {
															epg += self.helpers.epgFormat
																	.next(epgEntryNext);
														}
														;

														// Create the EPG info
														// link
														var epgPar = [];
														epgPar.push('chid=' + channel.chid);

														if (epgEntryCurrent) {
															epgPar.push('current='
																	+ epgEntryCurrent.id);
														}

														if (epgEntryNext) {
															epgPar.push('next=' + epgEntryNext.id);
														}
														var epgInfoLink = '#page_epgevent?'
																+ epgPar.join('&');

														// Create the stream url
														// link
														var streamLink = self.data.tvheadend
																.getChannelStreamUrl(channel.chid);

														listItems.push('<li>');

														// Crate the list item
														channel.number = channel.number ? channel.number
																: '';
														listItems.push('<a href="' + epgInfoLink
																+ '">');
														listItems
																.push('<h3 class="channel-name-block">');
														listItems
																.push('<span class="channel-number">'
																		+ channel.number
																		+ '</span>');
														listItems
																.push('<span class="channel-icon"><img src="'
																		+ channel.ch_icon
																		+ '"></span>');
														listItems
																.push('<span class="channel-name">'
																		+ channel.name
																		+ '</span></h3>');
														listItems.push(epg);
														listItems.push('</a>');

														listItems.push('<a href="' + streamLink
																+ '" target="_blank"/>');

														// Finished
														listItems.push('</li>');
													});
								};

								// This function object will wrapup the list
								// filling
								channelsWrapUp = function() {
									$('#page_channels .list_channels').empty().append(
											listItems.join('')).listview('refresh');

									self.helpers.pageLoading.hide();
								};

								// We use a task queue to avoid GUI freezing
								tasks = [];

								size = 1; // Items subarray size, adjustable
											// for
								// performance tweaking

								// Create a task for each subarray
								$.each(channels.entries, function(i, channelEntry) {
									if ((i % size) == 0) {
										slice = channels.entries.slice(i, i + size);
										slice.entries = slice;
										tasks.push([ channelsListFillAll, slice ]);
									}
								});

								// Create a task to finish the list
								tasks.push(channelsWrapUp);

								// Run all tasks in order
								utils.runTasks(tasks);
							}

						});
	})();
})($, Mags.Tvhv);

(function($, self) {
	(self.pages.epg = function() {

		/***********************************************************************
		 * Page "epg"
		 * **************************************************************************
		 */
		$('#page_epg').live(
						'pageinit',
						function(event) {
							console.debug('page_epg.pageinit');

							// Fill page
							$("#page_epg").on("pagebeforeshow", function(e, data) {
								console.debug('page_epg.pagebeforeshow');

								// Load data if needed
								if (!self.data.tvheadend.data.isLoaded) {
									self.data.tvheadend.refresh();
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
								$(document).one('dataloaded', function(event) {
									fillPage();
								});
								self.helpers.pageLoading.show();
								self.data.tvheadend.refresh();
							});

							// Fill page
							function fillPage(sort) {
								self.helpers.pageLoading.show();
								setTimeout(fillEpgList, 0, self.data.tvheadend.data.epg, sort);
							}
							;

							// Fill epg list
							function fillEpgList(epglist, sort) {
								// Look an apply sort type
								if (!sort) {
									sort = $("#page_epg #sort").html();
								}

								if (sort == 'date') {
									epglist.entries = utils.sortByKey(epglist.entries,
											'start:n,end:n', true);
								} else if (sort == 'channel') {
									epglist.entries = utils.sortByKey(epglist.entries,
											'channel:s,start:n', true);
								}
								;

								// Save sort for next time
								$("#page_epg #sort").html(sort);

								// Let's accumulate here the items to add to the
								// list
								var listItems = [];

								// Current channel (for sorting by channel)
								var currChannel = '';

								// This function object will add an array of
								// items
								// to
								// the list variable
								epgListFillAll = function(epglist) {

									var epg, channel, epgPar = [], epgInfoLink, streamLink, epgEntryCurrent;
									$
											.each(
													epglist.entries,
													function(i, epgEntry) {
														epg = '';

														channel = self.data.tvheadend
																.findChannelById(epgEntry.channelid);

														if (sort == 'channel') {
															if (epgEntry.channelid != currChannel) {
																listItems
																		.push('<li data-role="list-divider" class="channel-group">');
																listItems
																		.push('<span class="channel-icon">');
																listItems
																		.push('<img src="'
																				+ channel.ch_icon
																				+ '" onerror="this.style.display = \'none\'">');
																listItems.push('</span>');
																listItems
																		.push('<span class="channel-name">'
																				+ epgEntry.channel
																				+ '</span></li>');
																currChannel = epgEntry.channelid;
															}
														}

														// Create the EPG info
														// link
														epgPar = [];
														epgPar.push('chid=' + epgEntry.channelid);

														epgEntryCurrent = self.data.tvheadend
																.findEpgCurrentByChannel(epgEntry.channelid);
														if (epgEntryCurrent
																&& epgEntryCurrent.id == epgEntry.id) {
															epg += self.helpers.epgFormat.current(epgEntry);
															epgPar.push('current=' + epgEntry.id);
														} else {
															epg += self.helpers.epgFormat.next(epgEntry);
															epgPar.push('next=' + epgEntry.id);
														}
														;
														epgInfoLink = '#page_epgevent?'
																+ epgPar.join('&');

														// Create the stream url
														// link
														streamLink = self.data.tvheadend
																.getChannelStreamUrl(epgEntry.channelid);

														listItems.push('<li>');

														if (sort == 'channel') {
															listItems.push('<a href="'
																	+ epgInfoLink + '">' + epg
																	+ '</a>');
														} else { // 'date'
															listItems.push('<a href="'
																	+ epgInfoLink + '">');
															listItems
																	.push('<h3 class="channel-name-block">');
															listItems
																	.push('<span class="channel-icon">');
															listItems
																	.push('<img src="'
																			+ channel.ch_icon
																			+ '" onerror="this.style.display = \'none\'">');
															listItems.push('</span>');
															listItems
																	.push('<span class="channel-name">'
																			+ epgEntry.channel
																			+ '</span></h3>');
															listItems.push(epg);
															listItems.push('</a>');
														}

														listItems
																.push('<a href="'
																		+ streamLink
																		+ '" target="_blank" data-split-icon="info" />');

														listItems.push('</li>');
													});

								};

								// This function object will wrapup the list
								// filling
								epgWrapUp = function() {
									$("#page_epg .list_epg").empty().append(listItems.join(''))
											.listview('refresh');
									self.helpers.pageLoading.hide();
								};

								// We use a task queue to avoid GUI freezing
								tasks = [];

								size = 1; // Items subarray size, adjustable
											// for
								// performance tweaking

								// Create a task for each subarray
								$.each(epglist.entries, function(i, epgEntry) {
									if ((i % size) == 0) {
										slice = epglist.entries.slice(i, i + size);
										slice.entries = slice;
										tasks.push([ epgListFillAll, slice ]);
									}
								});

								// Create a task to finish the list
								tasks.push(epgWrapUp);

								// Run all tasks in order
								utils.runTasks(tasks);
							}
							;
						});
	})();
})($, Mags.Tvhv);

(function($, self) {
	(self.pages.epgevent = function() {

		/***********************************************************************
		 * Page "epgevent"
		 * **************************************************************************
		 */
		$('#page_epgevent').live(
				'pageinit',
				function(event) {
					console.debug('page_epgevent.pageinit');

					// Fill page
					$("#page_epgevent").on(
							"pagebeforeshow",
							function(e, data) {
								console.debug('page_epgevent.pagebeforeshow');

								// Load data if needed
								if (!self.data.tvheadend.data.isLoaded) {
									self.data.tvheadend.refresh();
									$.mobile.changePage("#page_loading");
									return;
								}

								// Look for parameters
								var chid, current, next;
								if ($.mobile.pageData && $.mobile.pageData.chid) {
									chid = $.mobile.pageData.chid;
								}
								if ($.mobile.pageData && $.mobile.pageData.current) {
									current = self.data.tvheadend
											.findEpg($.mobile.pageData.current);
								}
								if ($.mobile.pageData && $.mobile.pageData.next) {
									next = self.data.tvheadend.findEpg($.mobile.pageData.next);
								}

								var text = '';

								channel = self.data.tvheadend.findChannelById(chid);

								if (channel) {
									text += '<h3 class="channel-name-block">'
											+ '<span class="channel-icon">' + '<img src="'
											+ channel.ch_icon
											+ '" onerror="this.style.display = \'none\'"></span>'
											+ '<span class="channel-name">' + channel.name
											+ '</span></h3>';
									var streamLink = self.data.tvheadend
											.getChannelStreamUrl(channel.chid);
									$("#page_epgevent #content #btn_watch")
											.attr("href", streamLink).attr('target', '_blank');
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
				});
	})();
})($, Mags.Tvhv);

(function($, self) {
	(self.pages.config = function() {

		/***********************************************************************
		 * Page "config"
		 * **************************************************************************
		 */
		$('#page_config').live(
				'pageinit',
				function(event) {
					console.debug('page_config.pageinit');

					// Fill page
					$("#page_config").on("pagebeforeshow", function(e, data) {
						console.debug('page_config.pagebeforeshow');

						setValues();
					});

					// Defaults
					$("#page_config #btn_default").on('click', function() {
						setDefaults();
					});

					function setDefaults() {
						$("#page_config #fld_serverip").val(self.data.config.defaults.serverIP);
						$("#page_config #fld_linktype").val(self.data.config.defaults.linkType);
						$("#page_config #fld_language").val(self.data.config.defaults.language);
					}
					;

					function setValues() {
						$("#page_config #fld_serverip").val(self.data.config.values.serverIP);
						$("#page_config #fld_linktype").val(self.data.config.values.linkType);
						$("#page_config #fld_language").val(self.data.config.values.language);
					}
					;

					$('#form_config').submit(
							function() {
								var err = false;

								// Reset errors
								$("#form_config label").removeClass('error');
								$("#form_config #message").text('').hide();

								// Validation: all fields required
								$("#form_config input").reverse().each(function(index, field) {
									if ($(field).val() == null || $(field).val() == '') {
										$(field).prev().addClass('error');
										$(field).focus();
										err = true;
									}
								});

								if (err) {
									$("#form_config #message").text(
											"ERROR: Fill all required fields").attr("rel",
											"localize[error.fill-all]").translate().fadeIn('fast');
									return false;
								}

								// Get current values
								ipOrHostname = $("#page_config #fld_serverip").val();
								linktype = $("#page_config #fld_linktype").val();
								language = $("#page_config #fld_language").val();

								// Validate server name/IP
								ipParts = ipOrHostname.split('.');
								if (ipParts.length == 4) {
									// If it looks like an IP it must validate
									$.each(ipParts, function(i, part) {
										if (!utils.isNumber(part) || part > 255) {
											err = true;
											return false;
										}
									});
									if (err) {
										$("#fld_serverip").prev().addClass('error');
										$("#fld_serverip").focus();
										$("#form_config #message").text('ERROR: Not a valid IP')
												.attr("rel", "localize[error.invalid-ip]")
												.translate().fadeIn('fast');
										return false;
									}
								}

								// Save values
								$.DSt.set('serverip', ipOrHostname);
								$.DSt.set('linktype', linktype);
								$.DSt.set('language', language);

								// Translate
								console.debug('set userLanguage: ' + language);
								$.setLanguage(language);

								if (language == 'en') {
									/*
									 * English is the default language so there
									 * is no translation file for it. Just
									 * reload the whole thing.
									 */
									// Reload data
									// location.reload();
									// self.data.tvheadend.init(true);
									// $.mobile.changePage("#page_loading");
									var url = $.mobile.path.parseUrl(window.location.href);

									console.debug('url: ' + url.hrefNoSearch);
									self.data.tvheadend.init(true);
									// $.mobile.changePage(url.hrefNoSearch+'#page_loading',
									// {
									// reloadPage : true });
									$.mobile.changePage("#page_loading");
								} else {
									$("body").translate().trigger('refresh');

									// Reload data
									self.data.tvheadend.init(true);
									$.mobile.changePage("#page_loading");
								}

								// Must return false to avoid real submission
								return false;
							});
				});
	})();
})($, Mags.Tvhv);

/*******************************************************************************
 * Helpers
 * ******************************************************************************
 */
(function($, self) {
	self.helpers = {
		/*
		 * Helper to format the EPG information
		 */
		epgFormat : {

			_item : function(epgEntry, displayRemaining) {

				var epg = '<h4 class="epg-title">' + epgEntry.title + '</h4>';

				epg += '<h5 class="epg-entry">' + '<span class="epg-duration">['
						+ utils.getDisplayDuration(epgEntry.duration) + ']</span>'
						+ '<span class="epg-start">' + utils.getDisplayTime(epgEntry.start)
						+ '</span>' + '<span class="epg-bar">'
						+ '<span class="epg-barc" style="width:'
						+ utils.getElapsedDuration(epgEntry.start, epgEntry.end, 80)
						+ 'px;">&nbsp;' + '</span></span>' + '<span class="epg-end">'
						+ utils.getDisplayTime(epgEntry.end) + '</span>';

				if (displayRemaining) {
					epg += '<span class="epg-remain">['
							+ utils.getDisplayRemaining(epgEntry.start, epgEntry.end) + ']</span>';
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
		},

		/*
		 * Object to handle page loading indications
		 */
		pageLoading : {

			show : function() {
				$("body").append('<div class="pageLoading"/>');
				setTimeout('$.mobile.showPageLoadingMsg()', 1);
				setTimeout('pageLoading.hide()', 15000);
			},

			hide : function() {
				$(".pageLoading").remove();
				setTimeout('$.mobile.hidePageLoadingMsg()', 1);
			}
		}

	}
})($, Mags.Tvhv);
