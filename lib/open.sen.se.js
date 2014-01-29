//Author JULIEN CHENAVAS

"use strict";

var colors = require('colors');
var request = require('request');
var jar = request.jar();

function writelog(line,addnewline){
	
	if (opensense.showlog){
		
		if (typeof(addnewline) == "undefined")
			addnewline = true;
			
		process.stdout.clearLine();  // clear current text
		process.stdout.cursorTo(0);
		
		var logvalue = "";
		
		if (opensense.show_datetime_in_log)
			logvalue += new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + " - ";
		
		process.stdout.write(logvalue + "[opensense] : " + line + ((addnewline) ? "\r\n" : ""));	
	}
}

function get_URL(){ 
	return opensense.url.replace("[sense_key]",opensense.sense_key); 
}

function SendFeed(feed_id, value, ONSUCCESS_FN, ONERROR_FN){
	
	writelog("Sending Feed : " + feed_id);
	
	if (feed_id == 0) {
		if (ONERROR_FN) ONERROR_FN(null,null,"FeedID = 0");
		return;
	}
	
        var postData = {
                "feed_id": feed_id,
                "value":value
        }; 
        
	var QUERY = {
		url: opensense.geturl(),
                'Content-type' : 'application/json',
		body: JSON.stringify(postData)
	};	
	
	request.post(QUERY, function ( err, res, body){    
                if (err || (res.statusCode != 200 && res.statusCode != 302)) {
                 	ONERROR_FN(err, res, body);      	 
                }
		else {
			ONSUCCESS_FN(err, res, body);
		}
        });		
}

function SendFeeds(){

	writelog("Sending Feeds");

	if(opensense.events.OnBeforeSendFeeds) opensense.events.OnBeforeSendFeeds();

	var feedbyidx = [];

        var SendFeed_FN = function (CALLBACK_FN,feedid_int) {		
		var feed = opensense.feeds[feedbyidx[feedid_int]];
		var feed_id = feedbyidx[feedid_int];
		var feed_value = feed.value;			
		
		/*
		writelog("Sending Feed : " + feed_id);
		console.log("opensense.feeds : " + JSON.stringify(opensense.feeds,null,10));
		console.log("feedbyidx[feedid_int] : " + JSON.stringify(feedbyidx[feedid_int],null,10));
		console.log("feed_id : " + feed_id);
		console.log("feed : " + JSON.stringify(feed,null,10));
		*/
		
		if(opensense.events.OnBeforeSendFeed) opensense.events.OnBeforeSendFeed(feed);	
		
		writelog("\Sending feed --> " + (""+feed_id).magenta.bold + " [processing...]".bold,false);
		
		SendFeed(
			feed_id,
			feed_value,
			/*ONSUCCESS_FN*/ function (err, res, body){
				try
				{
					feed.json = JSON.parse(body);					
					
					writelog("\Sending feed --> " + (""+feed_id).magenta.bold + " [OK]".bold);
							
					if(opensense.events.OnAfterSendFeed) opensense.events.OnAfterSendFeed(feed);	
					
					if (CALLBACK_FN) CALLBACK_FN();
				}
				catch(parseerr)
				{
					writelog("\tSending feed --> " + (""+feed_id).magenta.bold  + " [ERROR]".red.bold);
					writelog("\tParse Query Result Error (device : " +(""+feed).magenta.bold + ") : " + parseerr);
					writelog("\tBody : " + body);
					if(opensense.events.OnAfterSendFeed) opensense.events.OnAfterSendFeed(null);	
				}
			},
			/*ONERROR_FN*/ function(err, res, body){ 
				writelog("[SendFeed_FN ONERROR_FN]".red.bold);
				if(opensense.events.OnAfterSendFeed) opensense.events.OnAfterSendFeed(null);	
			}
		);
        };

	var subsequenty = require('sequenty');
	var DevicesSeqFunc = [];
        
        for (var feedid in opensense.feeds)
	{
		writelog("feedid:" + feedid);
		feedbyidx.push(feedid);
		DevicesSeqFunc.push(SendFeed_FN);	
	}       	
	
	DevicesSeqFunc.push(function(CALLBACK_FN){
		if(opensense.events.OnAfterSendFeeds) opensense.events.OnAfterSendFeeds();
	});
	
	subsequenty.run(DevicesSeqFunc);
}

var opensense = {
	showlog: true,
	show_datetime_in_log: true,
	url: "http://api.sen.se/events/?sense_key=[sense_key]",
	sense_key: "",
        feeds: {},
        sendfeeds: SendFeeds,
	geturl: get_URL,
	sendfeed: SendFeed,
	events: {
		OnBeforeSendFeeds:	null,
		OnAfterSendFeeds:	null,
		
		OnBeforeSendFeed: 	null,
		OnAfterSendFeed:	null
	}
};

module.exports = opensense;