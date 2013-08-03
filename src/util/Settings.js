/*
 * Reads the settings from settings.json and supplies defaults for any
 * missing settings. 
 * */

var fs = require("fs");
var os = require("os");
require('./minify.json.js');

//defaults
exports.defaults = {
  //IP and port to bind to
  "ip": "0.0.0.0",
  "port" : 3000,
  //The Type of the database. You can choose between dirty, postgres, sqlite and mysql
  //You shouldn't use "dirty" for for anything else than testing or development
  "dbType" : "dirty",
  //the database specific settings
  "dbSettings" : {
                   "filename" : "var/dirty.db"
                 }
};



exports.loadSettings = function() {
	var settings_file = "../settings.json";
	var user_settings = {};
	try {
		  user_settings = fs.readFileSync(settings_file).toString();
		  //minify to remove comments and whitepsace before parsing
		  user_settings = JSON.parse(JSON.minify(settings));
	}
	catch(e){
		console.error('There was an error processing your settings.json file: '+e.message);
		process.exit(1);
	}
	
	exports = JSON.parse(JSON.stringify(exports.defaults)); //clone defaults
	
	//go through each key in the user supplied settings and replace the defaults
	//if a key is not in the defaults, warn the user and ignore it
	for(var k in user_settings) {
		if(k in exports){
            //overwrite it
            exports[k] = user_settings[k];
        }
        else
        {
            console.warn('Unknown settings parameter:'+k)
        }
	}

};

exports.loadSettings();