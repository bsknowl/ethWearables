module.exports = {

    getHealthData : function (lastRetrievedTs, writeLastDataAccessTimeCB) {

    var https = require('https');

    // Configure the application with you generated App ID and App Secret
    var HUMANAPI_APP_ID     =  '3e098d19e42de61584e1bac7ff321a7385edd094';
    var HUMANAPI_APP_SECRET =  'd5f5725383e96b2d6fd8db5897b8535b2ac69ca6' ;

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
            auth : '96df20174a8f47178519f08cd49153b8f221b1bc:',
            host : 'api.humanapi.co', 
            port : 443,
            path : path,
            method : 'GET', 
            headers : postheaders // do GET
        };

        optionsget["path"] = path + healthApiItem + '?updated_since=' + lastRetrievedTs; 

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

	                var subElemJsonPretty = JSON.stringify(subElemJson,null,0); 

	                var streamId = healthApiItem + '/' + subElemJson['userId'] ;

                        console.info('Stream ID ' + streamId );

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
