/*
 * Reads the settings from settings.json and supplies defaults for any
 * missing settings. 
 * */

var fs = require("fs");
var os = require("os");
var jsonminify = require('jsonminify');
var env_settings = {};

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
                 },
  "ssl": false,
  "tool": "brush",
};



exports.loadSettings = function() {
  var settings_file = "settings.json";
  var user_settings = {};
  try {
    user_settings = fs.readFileSync(settings_file).toString();
    //minify to remove comments and whitepsace before parsing
    user_settings = JSON.parse(JSON.minify(user_settings));
  }
  catch(e){
    console.error('There was an error processing your settings.json file: '+e.message);
    process.exit(1);
  }

  try {
    env_settings['dbType'] = process.env.DB_TYPE;
    var db_settings={};
    db_settings.user = process.env.DB_USER;
    db_settings.password = process.env.DB_PASSWORD;
    db_settings.host = process.env.DB_HOST;
    db_settings.database = process.env.DB_NAME;
    env_settings.dbSettings= db_settings;
  }
  catch (e){
    console.error('There was an error retrieving environment variables '+e.message)
  }

  //copy over defaults
  for(var k in exports.defaults){
    exports[k] = exports.defaults[k]
  }

  //go through each key in the user supplied settings and replace the defaults
  //if a key is not in the defaults, warn the user and ignore it
  for(var k in user_settings) {
    if(k in exports.defaults){
      //overwrite it
      exports[k] = user_settings[k];
    }else{
      console.warn("'Unknown Setting: '" + k + "'. This setting doesn't exist or it was removed");
    }
  }

  //go through each key in environmental settings and replace the user settings
  //if a key is not in the defaults, warn the user and ignore it
  for(var k in env_settings) {
    if(k in exports.defaults){
      //overwrite it
      exports[k] = env_settings[k];
    }else{
      console.warn("'Unknown Setting: '" + k + "'. This setting doesn't exist or it was removed");
    }
  }

  //settings specific warnings
  if(exports.dbType === "dirty"){
    console.warn("DirtyDB is used. This is fine for testing but not recommended for production.");
  }

};

exports.loadSettings();
