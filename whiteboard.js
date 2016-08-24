/**
 * Module dependencies.
 */

var settings = require('./public/util/Settings.js'),
    tests = require('./public/util/tests.js'),
    draw = require('./public/util/draw.js'),
    projects = require('./public/util/projects.js'),
    db = require('./public/util/db.js'),
    files = require("./public/util/files.js"),
    express = require("express"),
    paper = require('paper'),
    socket = require('socket.io'),
    async = require('async'),
    fs = require('fs'),
    http = require('http'),
    https = require('https'),
    redis = require('redis'),
    Cookies = require( "cookies"),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    errorHandler = require('errorhandler'),
    Canvas = require('canvas');


/** 
 * SSL Logic and Server bindings
 */ 
if(settings.ssl){
  console.log("SSL Enabled");
  console.log("SSL Key File" + settings.ssl.key);
  console.log("SSL Cert Auth File" + settings.ssl.cert);

  var options = {
    key: fs.readFileSync(settings.ssl.key),
    cert: fs.readFileSync(settings.ssl.cert)
  };
  var app = express(options);
  var server = https.createServer(options, app).listen(settings.port);
}else{
  var app = express();
  var server = app.listen(settings.port);
}

/** 
 * Build Client Settings that we will send to the client
 */
var clientSettings = {
  "tool": settings.tool
};

var env = process.env.NODE_ENV || 'development';

// Config Express to server static files from /
//app.configure(function(){
  app.use(express.static(__dirname + '/'));
//});

// Sessions
app.use(cookieParser());
app.use(session({
  secret: 'secret',
  key: 'express.sid',
  resave: true,
  saveUninitialized: true})
);

// Development mode setting
if ('development' == env) {
  app.use(errorHandler({ dumpExceptions: true, showStack: true }));
}
//app.configure('development', function(){
//  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
//});

// Production mode setting
if ('production' == env) {
  app.use(errorHandler());
}
//app.configure('production', function(){
//  app.use(express.errorHandler());
//});

//setup view engine

app.set('view engine', 'pug');
app.set('views', __dirname + '/views');


// ROUTES
// Index page
app.get('/', function(req, res){

  //res.sendFile(__dirname + '/views/index.html');
  //res.render('index', {});
  res.render('index.jade',
      {
        //pagename: 'awesome people',
        //authors: ['Paul', 'Jim', 'Jane']
      }
  );
});

// Drawings
//Use this part for authentication
app.get('/whiteboard/*', function(req, res){

  //res.sendFile(__dirname + '/views/draw.html');

  res.render('whiteboard.jade',
      {
        //pagename: 'awesome people',
        //authors: ['Paul', 'Jim', 'Jane']
      }
  );

  //var cookies = new Cookies( req, res, "PHPSESSID" )
  //    , unsigned, signed, tampered;
  //var clientSession = new redis.createClient();
  //
  //clientSession.get("foo:"+cookies.get("PHPSESSID"), function(error, result){
  //  if(error){
  //    console.log("error : "+error);
  //    //if the session cookie is not found. Display not authorized page
  //    res.sendFile(__dirname + '/views/not_authorized.html');
  //  }
  //  if(result != null){
  //    console.log("result exist");
  //    console.log(result);
  //
  //    //if the session cookie is found, go to the class room
  //    res.sendFile(__dirname + '/views/draw.html');
  //  }else{
  //    console.log("session does not exist");
  //  }
  //});


});

//pdf viewer page
app.get('/pdf', function(req, res){

  res.sendFile(__dirname + '/views/pdf_viewer.html');
  res.render('pdf_viewer', {});
});

//app.get('/files', function(req, res){
//  res.sendFile(__dirname + '/views/files_tree.html');
//});

app.get('/tree', function(req, res){
  files.processPath(req, res);
});

// Front-end tests
app.get('/tests/frontend/specs_list.js', function(req, res){
  tests.specsList(function(tests){
    res.send("var specs_list = " + JSON.stringify(tests) + ";\n");
  });
});

// Used for front-end tests
app.get('/tests/frontend', function (req, res) {
  res.redirect('/tests/frontend/');
});

// Testing PDF generation
app.get('/tests/pdf-generation', function (req, res) {
  var room = req.query.room;
  var Image = Canvas.Image;
  var canvas = new Canvas(1366, 612, 'pdf');
  var ctx = canvas.getContext('2d');

  var x, y;

  function reset () {
    x = 0;
    y = 0;
  }
  function img (src) {
    var img = new Image();
    img.src = src;
    ctx.drawImage(img, 0, 0, img.width, img.height);
  }

  db.getPDFPageCount(room,function(count){
    var receivedPageCount = 0;
    for(var x = 1; x <= count; x++){
      db.getPDFPage(room,x, function(page){
        receivedPageCount++;
        reset();
        img(page);
        ctx.addPage();
        if(receivedPageCount == count){
          fs.writeFile('out.pdf', canvas.toBuffer(), function (err) {
            if (err) throw err;
            console.log('created out.pdf')
          });
        }
      });
    }
  });
});

// Static files IE Javascript and CSS
//app.use("/static", express.static(__dirname + '/public/static'));
app.use("/wb_assets/static", express.static(__dirname + '/public/static'));
app.use("/build", express.static(__dirname + '/public/static/pdfjs/build'));
app.use("/web", express.static(__dirname + '/public/static/pdfjs/web'));
app.use("/files", express.static(__dirname + '/user_files'));




// LISTEN FOR REQUESTS
var io = socket.listen(server);
io.sockets.setMaxListeners(0);

console.log("Access Etherdraw at http://127.0.0.1:"+settings.port);

// SOCKET IO
io.sockets.on('connection', function (socket) {
  console.log("Socket connected: "+socket);
  socket.on('disconnect', function () {
    console.log("Socket disconnected: "+socket);
    // TODO: We should have logic here to remove a drawing from memory as we did previously
  });

  // EVENT: User stops drawing something
  // Having room as a parameter is not good for secure rooms
  socket.on('draw:progress', function (room, uid, co_ordinates) {
    if (!projects.projects[room] || !projects.projects[room].project) {
      //console.log("Socket Error! room:"+room+" uid:"+uid+" coordinates:"+co_ordinates);
      loadError(socket);
      return;
    }
    io.in(room).emit('draw:progress', uid, co_ordinates);
    draw.progressExternalPath(room, JSON.parse(co_ordinates), uid);
  });

  // EVENT: User stops drawing something
  // Having room as a parameter is not good for secure rooms
  socket.on('draw:end', function (room, uid, co_ordinates, pageNum) {
    if (!projects.projects[room] || !projects.projects[room].project) {
      loadError(socket);
      return;
    }
    io.in(room).emit('draw:end', uid, co_ordinates);
    draw.endExternalPath(room, JSON.parse(co_ordinates), uid, pageNum);
  });

  // User joins a room
  socket.on('subscribe', function(data) {
    subscribe(socket, data);
  });

  // User loads new page
  socket.on('load:newPage', function(room, pageNum, canvasClearedCount) {
    if (!projects.projects[room] || !projects.projects[room].project) {
      loadError(socket);
      return;
    }
    draw.setupNewPage(room, pageNum);
    var state = {
      "type": "WHITEBOARD",
      "page": Number(pageNum)+1
    };
    db.updateLatestState(room, state);
    io.in(room).emit('load:newPage', pageNum, canvasClearedCount); // emit back the new-page event so both teacher and student will be in sync
  });

  // Load a previous page
  socket.on('load:previousPage', function(room, pageNum) {
    draw.cleanRedoStack(room);
    var state = {
      "type": "WHITEBOARD",
      "page": Number(pageNum)
    };
    db.updateLatestState(room, state);
    db.loadPreviousPage(room, pageNum, function(project){
      io.sockets.in(room).emit('load:previousPage', project, pageNum);
    });
  });

  // User clear
  socket.on('clear', function(room, uid, pageNum) {
    if (!projects.projects[room] || !projects.projects[room].project) {
      loadError(socket);
      return;
    }
    draw.clear(room, pageNum);
    io.in(room).emit('clear', uid); // emit back the cleared count so both teacher and student will be in sync
  });

  // User removes an item
  socket.on('item:remove', function(room, uid, itemName, pageNum) {
    draw.removeItem(room, uid, itemName, pageNum);
    io.sockets.in(room).emit('item:remove', uid, itemName);
  });

  // User moves one or more items on their canvas - progress
  socket.on('item:move:progress', function(room, uid, itemNames, delta) {
    draw.moveItemsProgress(room, uid, itemNames, delta);
      if (itemNames) {
        io.sockets.in(room).emit('item:move', uid, itemNames, delta);
    }
  });

  // User moves one or more items on their canvas - end
  socket.on('item:move:end', function(room, uid, itemNames, delta, pageNum) {
    draw.moveItemsEnd(room, uid, itemNames, delta, pageNum);
    if (itemNames) {
      io.sockets.in(room).emit('item:move', uid, itemNames, delta);
    }
  });

  // User adds a raster image
  socket.on('image:add', function(room, uid, data, position, name, pageNum) {
    draw.addImage(room, uid, data, position, name, pageNum);
    io.sockets.in(room).emit('image:add', uid, data, position, name);
  });

  // User performs UNDO
  socket.on('undo', function(room, uid, pageNum) {
    draw.undoItem(room, pageNum);
    io.sockets.in(room).emit('undo', uid);
  });

  // User performs REDO
  socket.on('redo', function(room, uid, pageNum) {
    draw.redoItem(room, pageNum);
    io.sockets.in(room).emit('redo', uid);
  });

  // User performs Resizing image
  socket.on('image:resize', function(room, uid, image, scalingFactor, pageNum) {
    draw.resizeImage(room,image,scalingFactor, pageNum);
    io.sockets.in(room).emit('image:resize', uid, image, scalingFactor);
  });

  // Start using pointer tool. show writer's cursor to other party of the class
  socket.on('pointing:start', function(room, uid, position) {
    io.sockets.in(room).emit('pointing:start', uid, position);
  });

  // End using pointer tool. hide writer's cursor from other party of the class
  socket.on('pointing:end', function(room, uid) {
    io.sockets.in(room).emit('pointing:end', uid);
  });

  // Load PDF file from server
  socket.on('pdf:load', function(room, uid, file) {
    db.storeStateAtPDFLoad(room, function(){
      var state = {
        "type": "PDF",
        "page": 1,
        "file": file
      };
      db.updateLatestState(room, state);
    });
    io.sockets.in(room).emit('pdf:load', uid, file);
  });

  //Hide PDF Viewer
  socket.on('pdf:hide', function(room, uid) {
    db.restoreStateAtPDFLoad(room, function(project, state, pageCount){
      db.updateLatestState(room, state);
      io.sockets.in(room).emit('pdf:hide', project, state.page, pageCount);
    });
  });

  // Go to given page of the loaded PDF file
  socket.on('pdf:pageChange', function(room, uid, page, file) {
    var state = {
      "type": "PDF",
      "page": Number(page),
      "file": file
    };
    db.updateLatestState(room, state);
    io.sockets.in(room).emit('pdf:pageChange', uid, page);
  });

  // Zoom In/Out
  socket.on('pdf:zoom', function(room, uid, scale) {
    io.sockets.in(room).emit('pdf:zoom', uid, scale);
  });

  // Go to presentation mode
  socket.on('pdf:presentationMode', function(room, uid) {
    io.sockets.in(room).emit('pdf:presentationMode', uid);
  });

  // Toggle from PDF to Whiteboard
  socket.on('pdf:to:whiteboard', function(room, canvas) {
    db.setPDFContentAtToggleToWhiteboard(room, canvas, function(project, state, pageCount){
      db.updateLatestState(room, state);
      io.sockets.in(room).emit('pdf:to:whiteboard', project, state.page, pageCount);
    });
  });

  // Toggle from Whiteboard to PDF
  socket.on('whiteboard:to:pdf', function(room, page, file) {
    db.storeStateAtPDFLoad(room, function(){
      var state = {
        "type": "PDF",
        "page": page,
        "file": file
      };
      db.updateLatestState(room, state);
    });
    db.getPDFContentAtToggleToWhiteboard(room, function(canvas){
      io.sockets.in(room).emit('whiteboard:to:pdf', canvas);
    });
  });

  // Save PDF page
  socket.on('pdf:savePage', function(room, pageNum, page) {
    db.savePDFPage(room, pageNum, page);
  });

  // Enable toolbox
  socket.on('enable:toolbox', function(room, uid) {
    io.sockets.in(room).emit('enable:toolbox', uid);
  });

  // Disable toolbox
  socket.on('disable:toolbox', function(room, uid) {
    io.sockets.in(room).emit('disable:toolbox', uid);
  });

});

// Subscribe a client to a room
function subscribe(socket, data) {
  var room = data.room;

  // Subscribe the client to the room
  socket.join(room);

  // declare a redo stack for classroom of it is not declared
  if(!draw.hasDeclaredRedoStack(room))
      draw.initRedoStack(room);
  // If the close timer is set, cancel it
  // if (closeTimer[room]) {
  //  clearTimeout(closeTimer[room]);
  // }

  // Create Paperjs instance for this room if it doesn't exist
  var project = projects.projects[room];
  if (!project) {
    console.log("made room");
    projects.projects[room] = {};
    // Use the view from the default project. This project is the default
    // one created when paper is instantiated. Nothing is ever written to
    // this project as each room has its own project. We share the View
    // object but that just helps it "draw" stuff to the invisible server
    // canvas.
    projects.projects[room].project = new paper.Project();
    projects.projects[room].external_paths = {};
    db.load(room, socket);
  } else { // Project exists in memory, no need to load from database
    db.loadFromMemoryOrDB(room, socket, clientSettings);
  }

  // Broadcast to room the new user count -- currently broken
  var rooms = socket.adapter.rooms[room]; 
  var roomUserCount = Object.keys(rooms).length;
  io.to(room).emit('user:connect', roomUserCount);
}

// Send current project to new client
function loadFromMemory(room, socket) {
  /*var project = projects.projects[room].project;
  if (!project) { // Additional backup check, just in case
    db.load(room, socket);
    return;
  }
  socket.emit('loading:start');
  var stateInMemory = project.exportJSON();  // state of the project in memory
  var stateInDB;
  if ((stateInDB = db.getStateOfProjectInDB(room)) != null) {// state of the project in db
    console.log("value from db to server" + JSON.stringify(stateInDB));
    socket.emit('project:load', {project: stateInDB});
  }
  else
    socket.emit('project:load', {project: stateInMemory});

  socket.emit('settings', clientSettings);
  socket.emit('loading:end');*/
}

function loadError(socket) {
  socket.emit('project:load:error');
}

