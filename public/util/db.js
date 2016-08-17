var settings = require('./Settings.js'),
    projects = require('./projects.js'),
     ueberDB = require('ueberDB');

// Database connection
var db = new ueberDB.database(settings.dbType, settings.dbSettings);

// Init..
db.init(function(err){
  if(err){
    console.error(err);
  }
});

// Write to database
exports.storeProject = function(room) {
  var project = projects.projects[room].project;
  var json = project.exportJSON();
  db.set(room, {project: json});
};

// Loading a class for the first time
exports.load = function(room, socket) {
  if (projects.projects[room] && projects.projects[room].project) {
    var project = projects.projects[room].project;
    db.get(room, function(err, value) {
        db.set(room+"PageCount", {count: 0});  // initialize the page count to zero
        db.set(room+"PDFPageCount", {count: 0});  // initialize the pdf page count to zero
        if (value && project && project.activeLayer) {
        socket.emit('loading:start');
        project.activeLayer.remove();
        project.importJSON(value.project);
        socket.emit('project:load', value);
      }
      socket.emit('loading:end');
    });
    socket.emit('loading:end'); // used for sending back a blank database in case we try to load from DB but no project exists
  } else {
    loadError(socket);
  }
};

// Write clearing page to db, so we can load it later as a previous page
exports.storeAsPreviousPage = function(room, canvasClearedCount) {
    if (projects.projects[room] && projects.projects[room].project) {
        var project = projects.projects[room].project;
        var json = project.exportJSON();
        db.get(room+"PageCount", function(err, value) {
            if (value && value.count < canvasClearedCount && project && project.activeLayer) {
                db.set(room+"PageCount", {count: canvasClearedCount});  // update the page count
            }
        });

        db.set(room+canvasClearedCount, {project: json});
    }
};

// load previous page from db
exports.loadPreviousPage = function(room, requestedPageNumber, currentPageNumber, callback) {
  if (projects.projects[room] && projects.projects[room].project) {
    var project = projects.projects[room].project;
    var json = project.exportJSON();
    db.set(room+currentPageNumber, {project: json});
    db.get(room+requestedPageNumber, function(err, value) {
      if (value && project && project.activeLayer) {
          project.activeLayer.remove();
          project.importJSON(value.project);
          callback(value);
      }
    });
  }
};

// This method is called when a class is loaded from memory or db
exports.loadFromMemoryOrDB = function(room, socket, clientSettings) {
    var project = projects.projects[room].project;
    if (!project) { // Additional backup check, just in case
        db.load(room, socket);
        return;
    }
    socket.emit('loading:start');
    var stateInMemory = project.exportJSON();  // state of the project in memory
    project.activeLayer.remove();
    db.get(room+"PageCount", function(err, pageCount) {
        db.get(room+"0", function(err, stateInDB) {
            if (stateInDB != null) {// state of the project in db
                project.importJSON(stateInDB.project);
                socket.emit('project:load', stateInDB, pageCount.count);
            }
            else {
                project.importJSON(stateInMemory);
                socket.emit('project:load', {project: stateInMemory}, pageCount.count);
            }
        });
    });

    socket.emit('settings', clientSettings);
    socket.emit('loading:end');
};

// store the whiteboard state at the point of PDF is loaded
exports.storeStateAtPDFLoad = function(room) {
    if (projects.projects[room] && projects.projects[room].project) {
        var project = projects.projects[room].project;
        var json = project.exportJSON();
        db.set(room+"StateAtPDFLoad", {project: json});  // update the page count
    }
};

// restore the whiteboard state at the point of PDF is loaded
exports.restoreStateAtPDFLoad = function(room, callback) {
    if (projects.projects[room] && projects.projects[room].project) {
        var project = projects.projects[room].project;
        db.get(room+"StateAtPDFLoad", function(err, value) {
            if (value && project && project.activeLayer) {
                project.activeLayer.remove();
                project.importJSON(value.project);
                callback(value);
            }
        });
    }
};

// store the pdf page
exports.savePDFPage = function(room,pageNum,page) {
    if (projects.projects[room] && projects.projects[room].project) {
        db.get(room+"PDFPageCount", function(err, value) {
            if (value && value.count < pageNum-1) {
                db.set(room+"PDFPageCount", {count: pageNum-1});  // update the pdf page count
            }
        });
        db.set(room+"PDFPage"+Number(pageNum-1), page);
    }
};

// get pdf page count
exports.getPDFPageCount = function(room, callback) {
    db.get(room+"PDFPageCount", function(err, value) {
        if (value) {
            callback(value.count);
        } else
            callback(0);
    });
};

// get pdf page
exports.getPDFPage = function(room, pageNum,callback) {
    db.get(room+"PDFPage"+pageNum, function(err, page) {
        if (page) {
            callback(page);
        } else
            callback(null);
    });
};

// Recover from image cropping
exports.recover = function(room, data) {
    var project = projects.projects[room].project;
    db.set(room, {project: data});
    db.get(room, function(err, value) {
        if (value) {
            project.activeLayer.remove();
            project.importJSON(value.project);
        }
    });
};


exports.db = db;
