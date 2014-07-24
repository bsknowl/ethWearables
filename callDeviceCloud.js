module.exports = {
    writeToDeviceCloud : function ( dataType, healthApiResp )  {

    console.info('Writing to Device Cloud!!!! ' );
    var https = require('https');

    // Configure the application with you generated App ID and App Secret
    var DEVICE_CLOUD_PW     =  'Etherios1234$';
    var DEVICE_CLOUD_USER_ID     =  'RSrinivasan_Fitbit';

    var auth = DEVICE_CLOUD_USER_ID + ':' + DEVICE_CLOUD_PW ;
    var deviceOutString =  '' ;
    try {
	var parsedJson = JSON.parse(healthApiResp) ;

	if ( parsedJson.length > 1 ) {
		deviceOutString = '<list>' ;
	}

	for ( var i = 0 ; i < parsedJson.length ; i++ )

	    var subElemJson = parsedJson[i]; 
	    var subElemJsonPretty = JSON.stringify(parsedJson[i],null,2); 

	    var streamId = dataType + '/' + subElemJson['userid'] ;
            console.info('I AM USERID ' subElemJson['userid'] ) ;
            console.info('Stream ID ' + streamId );

            console.info('Pretty JSON ' + subElemJsonPretty );

            var data = '<DataPoint> <data>' + subElemJsonPretty + '</data> <streamId>' + streamId + '</streamId> <description>Temperature at device 1</description> <location>0.0, 0.0, 0.0</location> <quality>99</quality> <streamType>float</streamType> <streamUnits>Kelvin</streamUnits> <streamForwards>allDevices/temp, allDevices/metrics</streamForwards> </DataPoint>' ;
            console.info('Created DATA ' + data );

	    deviceOutString = dataOutString + data ;

            console.info('CONCATENATED STring DATA ' + data );
	}

	if ( parsedJson.length > 1 ) {
	    deviceOutString = '</list>' ;
	}
     } catch (error) {
        console.info('Exception parsing ' + healthApiResp);
     }

     console.info('Complete String' + deviceOutString );
     if ( deviceOutString != '' ) {
          var postheaders = {
              'Accept': 'application/json'
          };

          var optionsget = { 
              auth : auth,
              host : 'login.etherios.com', 
              port : 443,
              path : '/ws/DataPoint/',
              method : 'POST', // do POST
              headers : postheaders // POST HEADER
          };
 
          // do the GET request
          var reqGet = https.request(optionsget, function(res) {
               console.log("statusCode: ", res.statusCode);
               res.on('data', function(d) {
	            //Store last retrieval timestamp in database Database and 
                    console.info('POST result:\n');
                    process.stdout.write(d);
                    console.info('\n\nCall completed');
               });
 
          });
 
          reqGet.write(deviceOutString);
          reqGet.end();
          reqGet.on('error', function(e) {
              console.error(e);
          });
      }
}
};
