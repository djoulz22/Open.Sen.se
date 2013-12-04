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
		process.stdout.write(line + ((addnewline) ? "\r\n" : ""));
	}	
}

function get_URL(){ 
	return opensense.url.replace("[sense_key]",opensense.sense_key); 
}

function SendFeed(feed_id, value, ONSUCCESS_FN, ONERROR_FN){
	
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

function Send_Feeds(CALLBACK_FN,FOREACH_FEED_FN){

	var feedbyidx = [];

        var SendFeed_FN = function (CALLBACK_FN,feedid_int) {
		
		var feed = opensense.feeds[feedbyidx[feedid_int]];
		var feed_id = feedbyidx[feedid_int];
		var feed_value = opensense.feeds[feedbyidx[feedid_int]].value;		
		
		writelog("\Sending feed --> " + (""+feed_id).magenta.bold + " [processing...]".bold,false);
		
		SendFeed(
			feed_id,
			feed_value,
			/*ONSUCCESS_FN*/ function (err, res, body){
				try
				{
					feed.json = JSON.parse(body);					
					
					writelog("\Sending feed --> " + (""+feed_id).magenta.bold + " [OK]".bold);
							
					if (FOREACH_FEED_FN){
						FOREACH_FEED_FN(feed);
					}
							
					if (CALLBACK_FN)
						CALLBACK_FN();
				}
				catch(parseerr)
				{
					writelog("\tSending feed --> " + (""+feed_id).magenta.bold  + " [ERROR]".red.bold);
					writelog("\tParse Query Result Error (device : " +(""+feed).magenta.bold + ") : " + parseerr);
				}
			},
			/*ONERROR_FN*/ function(err, res, body){ 
				writelog("[SendFeed_FN ONERROR_FN]".red.bold);
			}
		);
		
		//
		
		if (CALLBACK_FN)
			CALLBACK_FN();
		
		return;
		
		
        	var feed = opensense.feeds[feedid_int];
		
		writelog(feed);
        };

	var subsequenty = require('sequenty');
	var DevicesSeqFunc = [];
        
        for (var feedid in opensense.feeds)
	{
		feedbyidx.push(feedid);
		DevicesSeqFunc.push(SendFeed_FN);	
	}       	
	
	DevicesSeqFunc.push(function(CALLBACK_FN){
		writelog("Send_Feeds " + "[OK]".bold);
		if(CALLBACK_FN)		
			CALLBACK_FN();
	});
	
	if (CALLBACK_FN)
		DevicesSeqFunc.push(CALLBACK_FN);
	
	subsequenty.run(DevicesSeqFunc);
}

var opensense = {
	showlog: true,
	url: "http://api.sen.se/events/?sense_key=[sense_key]",
	sense_key: "",
        feeds: {},
        sendfeeds: Send_Feeds,
	geturl: get_URL,
	sendfeed: SendFeed
};

module.exports = opensense;