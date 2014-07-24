var express = require('express')
var passport = require('passport');
var util = require('util');
var fs = require('fs');
var http = require('http');
var url = require('url');
var sftools = require('./sf-tools');
var sf = require('node-salesforce');

var PORT = process.env.PORT || 3000;
var request = require('request') ;

var HumanApiStrategy = require('passport-humanapi').Strategy;
var SF_CANVASAPP_CLIENT_SECRET = process.env.SF_CANVASAPP_CLIENT_SECRET;
var SF_CANVASAPP_CLIENT_ID = process.env.SF_CANVASAPP_CLIENT_ID ;
var lastDataRetrievedTs ;
// inside saleforce
var sfuserId ;
var humClientId ;
var accessToken;

// vars for connection
var insurl ; // instanceUrl
var accTok ; // access token
var refTok ; // refresh token

// Database
//
// old(test) db url
//var databaseUrl = "ethWearable"; // "username:password@example.com/mydb"
//var databaseUrl = "mongodb://brian.knowlton@etherios.com:8f5aeb32633597e3d08196dc54938b71@kahana.mongohq.com:10076/app27245367";
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

// Configure the application with you generated App ID and App Secret
// EtheriosWear2
//var HUMANAPI_APP_ID 	  =  "3e098d19e42de61584e1bac7ff321a7385edd094";
//var HUMANAPI_APP_SECRET =  "d5f5725383e96b2d6fd8db5897b8535b2ac69ca6";

// EtheriosWear3
 var HUMANAPI_APP_ID     = "1b48204992f90084cc751b37a6c8f97ee676f2fe" ;
 var HUMANAPI_APP_SECRET = "7a8cce328d5134ec4a31e7cfd174baa77ecc90f1" ;

// EtheriosWear4
//  var HUMANAPI_APP_ID     = "18817818cfbc68f54d0ee93a04288c4023949ab5" ;
//  var HUMANAPI_APP_SECRET = "23e6e4f43db5b9479969443754fa1cf993c71e3a" ;

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete HumanAPI profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

var conn = new sf.Connection({
  // you can change loginUrl to connect to sandbox or prerelease env.
  // loginUrl : 'https://test.salesforce.com'
});
conn.login('brian.knowlton@etherios.com.wearables', 'Etherios1234!3hqou3S1LSDISSY2E3WlIbreW', function(err, userInfo) {
  if (err) { return console.error(err); }
  // Now you can get the access token and instance URL information.
  // Save them to establish connection next time.
  console.log(conn.accessToken);
  console.log(conn.instanceUrl);
  // logged in user property
  console.log("User ID: " + userInfo.id);
  console.log("Org ID: " + userInfo.organizationId);
  // ...
});
// Use the HumanApiStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and HumanAPI
//   profile), and invoke a callback with a user object.
passport.use(new HumanApiStrategy({
    clientID:     HUMANAPI_APP_ID,
    clientSecret: HUMANAPI_APP_SECRET,
    callbackURL:  "https://ethwearable.herokuapp.com/auth/humanapi/callback"
    //callbackURL:  "http://localhost:3000/auth/humanapi/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      writeToDB(accessToken, refreshToken, profile, sfuserId)
      //console.log("HUMAN API PROFILE DATA")
      //console.log("Access Token:\t" + accessToken)
      //console.log("Refresh Token:\t" +  refreshToken)
      //console.log(profile)
      // To keep the example simple, the user's HumanAPI profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the HumanAPI account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));


var app = express();


// configure Express
app.configure(function() {
  //app.set('port', process.env.PORT || 3000);
  // added by B.KNOW
  app.use('/public',express.static(__dirname + '/public'));
  app.engine('html', require('ejs').renderFile);
  // END
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  // app.use(express.logger()); //dev environment logger
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'jodelahuhu' }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.get('/', function(req, res){
  console.log("[HUMANAPI-EXAMPLE-APP] Request User" + req.user);
  //res.render('index', { user: req.user });
  //get the canvas details from session (if any)
  
  var canvasDetails = sftools.getCanvasDetails(req);

  insurl  = canvasDetails.instanceUrl;
  accTok  = canvasDetails.oauthToken;
  refTok  = canvasDetails.refreshToken;
  //the page knows if the user is logged into SF
  res.render('index',{canvasDetails : canvasDetails});

  sfuserId = canvasDetails.userId;
  
  console.log('CANVASDETAILS IF ANY: ' + JSON.stringify(canvasDetails, null, 2));
  console.log('userid: ' + sfuserId);
  console.log('username: '   + canvasDetails.context.user.userName);
  console.log('firstName: ' + canvasDetails.context.user.firstName);
});


app.post('/', function(req,res){
    sftools.canvasCallback(req.body, SF_CANVASAPP_CLIENT_SECRET, function(error, canvasRequest){
       // if(error){
       //     res.statusCode = 400;
       //     return res.render('error',{error: error});
       // }
        //saves the token details into session
    sftools.saveCanvasDetailsInSession(req,canvasRequest);
        return res.redirect('/');
    });
});

app.get('/connect/finish', function(req, res) {
	console.log('WORKING! ');

});

app.post('/connect/finish', function(req, res) {
      var sessionTokenObject = req.body;
  // grab client secret from app settings page and `sign` `sessionTokenObject` with it.
      
      sessionTokenObject.clientSecret = HUMANAPI_APP_SECRET;

	console.log('BEFORE SENDING REQUEST ' + JSON.stringify(sessionTokenObject, null, 2) );

	conn.sobject("User").update({ Id : sfuserId, HumanAPI_ID__c : sessionTokenObject.userId },function(err, ret) {
		  if (err || !ret.success) { return console.error(err, ret); }
  		console.log('Updated Successfully : ' + ret.id);
	  }); // eof update

    request({uri: 'https://user.humanapi.co/v1/connect/tokens', method: 'POST',json: sessionTokenObject},
		function(err, res, body){
			if(err){console.log('I AM AN ERROR AT callout to humanAPI POST ' + err); return res.send(422);}
		// do stuff
		console.log('SUCCESS? ' + JSON.stringify(body, null,2));
	
	// write to DB
	writeNewDB(sessionTokenObject, body, sfuserId)
	conn.sobject("User").retrieve(sfuserId, function(err, user) {
  		if (err) { return console.error(err); }
  		console.log("Name : " + user.Name);
        	}); // eof sf query
	}); // eof request
}); // eof post



// Calling close works well when the authentication flow is opened up in a popup or modal window
//app.get('/close', function(req, res){
//  res.render('close');
//});


// GET /auth/humanapi
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in HumanAPI authentication will involve
//   redirecting the user to humanapi.com.  After authorization, HumanAPI will
//   redirect the user back to this application at /auth/humanapi/callback


app.get('/auth/humanapi',
  passport.authenticate('humanapi'),
  function(req, res){
    // The request will be redirected to HumanAPI for authentication, so this
    // function will not be called.
  });

// GET /auth/humanapi/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/humanapi/callback',
  passport.authenticate('humanapi', { failureRedirect: '/close' }),
  function(req, res) {
    // Call /close if the auth process is opened in a popup
    res.redirect('/close'); 
    // otherwise call the home page etc.
    // res.redirect('/');
  });

//app.get('/logout', function(req, res){
//   req.logout();
//  res.redirect('/');
//});
// sample Node.js code that uses Express.js framework and request library

exports.server = app.listen(PORT, function() {
    console.log("LISTENING ON: " + PORT );
});


//app.listen(PORT, function(){
//  console.log("[HUMANAPI-EXAMPLE-APP] Express server listening on port " + PORT);
//});

function ensureAuthenticated(req, res, next) {
  console.log(req.user)
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
function writeNewDB(sessionObject, returnObject, sfuserd) {
	var userdbInfo = { "session" : sessionObject, "return" : returnObject, "sfuserId" : sfuserId}
	db.users.save( userdbInfo );
} 
function writeToDB(accessToken, refreshToken, profile, sfuserId) {
   var userInfo = { "accessToken" : accessToken, "profile" : profile , "sfuserId" : sfuserId}
   db.users.save( userInfo )
   console.log("WRITE TO DB...HUMAN API PROFILE DATA")
   console.log("Access Token:\t" + accessToken)
   console.log("Refresh Token:\t" +  refreshToken)
   console.log(profile)
   console.log(sfuserId);
}

var writeLastDataAccessTimeCB = function writeRunStatsToDB() {
   var moment = require('moment');
  // var lastRunStats ;

  // var lastRunStats = db.runStats.findOne() ;
   var collection = db.collection('runStats');
   
   // changed to pass lastRunStats in anonymous function
   //collection.findOne(lastRunStats, function(lastRunStats, err, result){
   //   console.log("lastRunStats ..." + lastRunStats);
   //});

   console.log ( 'Setting this time into the database') ;
   var curTime = moment.utc().format('YYYYMMDDThhmmss');
   lastDataRetrievedTs = curTime ;
   console.log ("lastDataRetrievedTs ..."+lastDataRetrievedTs);
   // should insert row into db

   var Count = 0;
        collection.count(function(err, Count) {
               console.log("Count ..."+Count);

         if ( Count == 0 )
         {
            var curTime = moment.utc().format('YYYYMMDDThhmmss');
            var runStats = { "lastDataRetrievedTime" : curTime }
            db.runStats.save( runStats )
           // db.runStats.save({"_id" : 100, "lastDataRetrievedTime" : curTime } ) 
	} else {
            // To Change .. Get Last Updated Ts from the database
        //    var lastRunStats = db.runStats.findOne() ;
            //console.log ( 'This is what I got from db' + lastRunStats.['lastDataRetrievedTime']) ;
            //console.log(JSON.stringify(lastRunStats , null, 2));
            var curTime = moment.utc().format('YYYYMMDDThhmmss');
            //var runStats = { "lastDataRetrievedTime" : curTime }
            //db.runStats.save( runStats )
            lastDataRetrievedTs = curTime ;
	    
	db.runStats.update({}, { $set: { "lastDataRetrievedTime" : lastDataRetrievedTs } }, function(err,result){
	if(err) console.log('I am an error ...'+err);
	// some stuff
	});
         }

        });
}

var callHealth = require('./callHealth.js');
//callHealth.getHealthData();
/*
var myCb = function ( lastDataAccessTime ) {
   console.log('Last fetch time stamp' + lastDataAccessTime );
   //Get Health API data
   callHealth.getHealthData(lastDataAccessTime, writeLastDataAccessTimeCB);
};
// adding var lastDataAccessTime = ...
var lastDataAccessTime = getLastDataAccessTimeFromDatabase(myCb) ;
*/

//callHealth.getHealthData();
//Scheduler

var schedule = require('node-schedule');
var rule = new schedule.RecurrenceRule();
var callHealth = require('./callHealth.js');

// only push once a day...11:59pm UTC
 rule.dayOfWeek = [0, new schedule.Range(0, 6)];
 rule.hour = 15;
 rule.minute = 15;

//   rule.minute = new schedule.Range(0, 59, 1);

schedule.scheduleJob(rule, function() {
    console.log(rule);
    console.log('Today is recognized by Rebecca Black!-----------');

    // New code...was without arguments
callHealth.getHealthData(lastDataRetrievedTs, writeLastDataAccessTimeCB);
}); 

/**
 * Get last Data Access Time 
 */
function getLastDataAccessTimeFromDatabase( myCb ) {

   //If lastDataRetrievedTs is null get data from the last 10 days..
   if ( lastDataRetrievedTs  == null ) {

	//var Count =  db.runStats.count() ;
	var collection = db.collection('runStats');

	var Count = 0 ;
	 collection.count(function(err, Count) {
	    console.log( "Count ..." + Count ) ;
          });
	//var count =  0 ; //db.runStats.count() ;

	var moment = require('moment');

	if ( Count == 0 ) 
	{
	    console.log( "Starting for the very first time..." ) ;
	    var curTime = moment.utc().format('YYYYMMDDThhmmss');
	    console.log( "Returning time from Database" ) ;
	    var runStats = { "lastDataRetrievedTime" : curTime }
            //db.runStats.save( runStats )
	    myCb(curTime);
	} else {
	    // To Change .. Get Last Updated Ts from the database
            var lastRunStats = db.runStats.findOne() ;
	    //console.log ( 'This is what I got from db' + lastRunStats.['lastDataRetrievedTime']) ;
	    console.log(JSON.stringify(lastRunStats , null, 2));
	    var curTime = moment.utc().format('YYYYMMDDThhmmss');
	    var runStats = { "lastDataRetrievedTime" : curTime }
            //db.runStats.save( runStats )
	    lastDataRetrievedTs = curTime ;
	    myCb(curTime);
	}
   }
   else {
	console.log( "Returning Last data retrieved time" ) ;
        myCb(lastDataRetrievedTs);
   }
}
