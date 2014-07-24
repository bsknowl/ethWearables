    // Database
//
var databaseUrl = "ethWearable"; // "username:password@example.com/mydb"
var collections = ["users", "runStats"]
var mongoose = require('mongoose');
var mongoUri = process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
  'mongodb://localhost/mydb';

//var db = mongoose.connect('mongodb://127:0.0.1:27017/ethWearable', collections );

//attach listner to connected event
/*mongoose.connection.once('connected', function() {
    console.log("Connected to database")
});*/

//var db = require("mongojs").connect(databaseUrl, collections);
var db = require("mongojs").connect(mongoUri, collections);

db.on('error', console.error.bind(console, 'connection error:'));
module.exports = {

    getHealthData : function (lastRetrievedTs, writeLastDataAccessTimeCB) {
    var sfuserId ; //sfusersid
    var https = require('https');

    // Configure the application with you generated App ID and App Secret 
    // Etherios Wear 2
    //var HUMANAPI_APP_ID     =  '3e098d19e42de61584e1bac7ff321a7385edd094';
    //var HUMANAPI_APP_SECRET =  'd5f5725383e96b2d6fd8db5897b8535b2ac69ca6' ;

    // Etherios Wear 3 --working demo
    var HUMANAPI_APP_ID     = '1b48204992f90084cc751b37a6c8f97ee676f2fe' ;
    var HUMANAPI_APP_SECRET = '7a8cce328d5134ec4a31e7cfd174baa77ecc90f1' ;
    
    // EtheriosWear4
    //	var HUMANAPI_APP_ID     = "18817818cfbc68f54d0ee93a04288c4023949ab5" ;
    // 	var HUMANAPI_APP_SECRET = "23e6e4f43db5b9479969443754fa1cf993c71e3a" ;

    var dataItems = ['activities/summaries', 'activities', 'heart_rates', 'bmis', 'body_fats', 'heights', 'weights', 'blood_glucoses', 'blood_oxygens', 'sleeps',
       	'blood_pressures', 'genetic_traits', 'locations' ];
    
    var deviceCloud = require('./callDs.js');

    var callHealthApi = function(healthApiItem) {
         var postheaders = {
             'Accept': 'application/json'
         };
        console.info('CAT...Call Health API with\t' + healthApiItem ) ;
        var path = '/v1/apps/' + HUMANAPI_APP_ID + '/users/' ;
        var optionsget = { 
            auth : 'bf011678349f68eb5444f91180312f8b002bff9d:', 		// ew3
	    // auth : '96df20174a8f47178519f08cd49153b8f221b1bc:',		// ew2
            // auth : '859372977999f9e92423a142921978ff7f054627:',		// ew4
	    host : 'api.humanapi.co', 
            port : 443,
            path : path,
            method : 'GET', 
            headers : postheaders // do GET
        };

        optionsget["path"] = path + healthApiItem + '?updatedSince=' + lastRetrievedTs; 

        var reqGet = https.request(optionsget, function(res) {
            console.log("statusCode: " + "For Item:\t" + healthApiItem, res.statusCode  );

	    var storedData = "";
            res.on('data', function(d) {
                 storedData += d;
             }); 
	    
            res.on('end', function(d) {
                //console.log("Stored DATA: " +  healthApiItem + storedData  );
		var deviceOutString =  '' ;
                try {
	            var parsedJson = JSON.parse(storedData) ;

	            if ( parsedJson.length > 1 ) {
		         deviceOutString = '<list>' ;
	            }

	            for ( var i = 0 ; i < parsedJson.length ; i++ ) {

	                var subElemJson = parsedJson[i]; 

			db.users.findOne( { "session.userId" : subElemJson['userId'] }, function(err, userid){
				if(err || !userid) {console.log('SF USER ID NOT FOUND ' + err) ;}
				else{
			//	console.info('I AM USER ID '   +   subElemJson['userId'] ) ;
			//	console.info('I AM SF USER ID ' + userid.sfuserId ) ;
				sfuserId = userid.sfuserId ;
				} });
 			 
                        console.info('Stream ID ' + streamId );
			subElemJson.sfuserId = sfuserId ;
			
			console.info('SUBELEMJSON ' + JSON.stringify(subElemJson,null,2) );

	                var subElemJsonPretty = JSON.stringify(subElemJson,null,0) ;
			 
	                var streamId = healthApiItem + '/' + subElemJson['userId'] ;
				
                        var data = '<DataPoint> <data>' + subElemJsonPretty + '</data> <streamId>' + streamId + '</streamId> <description>Temperature at device 1</description> <location>0.0, 0.0, 0.0</location> <quality>99</quality> <streamType>float</streamType> <streamUnits>Kelvin</streamUnits> <streamForwards>allDevices/temp, allDevices/metrics</streamForwards> </DataPoint>' ;
                            //console.info('Created DATA ' + data );

	                    deviceOutString = deviceOutString + data ;
		     }

	             if ( parsedJson.length > 1 ) {
	                deviceOutString = deviceOutString + '</list>' ;
	             }

		     if ( deviceOutString != '' ) {
			  deviceCloud.writeToDeviceCloud(deviceOutString);
		     }

                 } catch (error) {
                     console.info('Exception parsing ' + d + '\n\n'  + error);
		     return;
                 }
            });
	});
 
        reqGet.end(console.info('Call to ' +  healthApiItem + 'ENDED.. ' ));
        reqGet.on('error', function(e) {
            console.error(e);
        });
    }	


    var dataItemLength = dataItems.length ;

    for ( var itemNbr = 0 ; itemNbr < dataItemLength ; itemNbr++  ) {
        console.info( 'In Loop .. ' + itemNbr ) ;
	var optionsPath = dataItems[itemNbr] ;
        console.info('Options prepared:' + optionsPath);
        callHealthApi( optionsPath )  ;
        writeLastDataAccessTimeCB();
    }
}
};
