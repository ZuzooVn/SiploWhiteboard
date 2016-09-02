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
exports.storeProject = function(room, pageNum) {
  var project = projects.projects[room].project;
  var json = project.exportJSON();
  db.set(room+pageNum, {project: json});
};

// Loading a class for the first time
exports.load = function(room, socket) {
  if (projects.projects[room] && projects.projects[room].project) {
    var project = projects.projects[room].project;
    db.get(room, function(err, value) {
        db.set(room+"PageCount", {count: 0});  // initialize the page count to zero
        db.set(room+"PDFPageCount", {count: 0});  // initialize the pdf page count to zero

        var state = {
            "type": "WHITEBOARD",
            "page": 1
        };
        db.set(room+"LatestState", state); // set the initial state of project

        if (value && project && project.activeLayer) {
        socket.emit('loading:start');
        project.activeLayer.remove();
        project.importJSON(value.project);
        socket.emit('project:load', value, 0, 1, {});
      }
      socket.emit('loading:end');
    });
    socket.emit('loading:end'); // used for sending back a blank database in case we try to load from DB but no project exists
  } else {
    loadError(socket);
  }
};

// update page count
exports.updatePageCount = function(room, pageNum) {
    if (projects.projects[room] && projects.projects[room].project) {
        db.set(room+"PageCount", {count: pageNum});
    }
};

// update latest state so that we can load the latest content to whiteboard at the event of browser-reload
/*
*  state = {
*       type = whiteboard,
*       page = pageNum
*  }
*  state = {
*       type = pdf,
*       page = pageNum,
*       file = fileName
*  }
*  */
exports.updateLatestState = function(room, state) {
    if (projects.projects[room] && projects.projects[room].project) {
        db.set(room+"LatestState", state);
    }
};

// load previous page from db
exports.loadPreviousPage = function(room, pageNum, callback) {
  if (projects.projects[room] && projects.projects[room].project) {
    var project = projects.projects[room].project;
    db.get(room+pageNum, function(err, value) {
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
        db.get(room+"PDFPageCount", function(err, pdfPageCount) {
            db.get(room + "LatestState", function (err, state) {
                if (state != null) { // latest state of project
                    if (state.type == "WHITEBOARD") {
                        db.get(room + state.page, function (err, stateInDB) {
                            if (stateInDB && project && project.activeLayer) {
                                project.importJSON(stateInDB.project);
                                socket.emit('project:load', stateInDB, pageCount.count, state.page, pdfPageCount);
                            } else if(stateInDB == null || err){
                                project.importJSON(null);
                                socket.emit('project:load', {project: null}, pageCount.count, state.page, pdfPageCount);
                            }
                        });
                    } else if (state.type == "PDF") {
                        db.get(room + "StateAtPDFLoad", function (err, stateAtPdfLoad) {
                            socket.emit('project:load:pdf', state.file, state.page, pageCount.count, stateAtPdfLoad.page, pdfPageCount);
                        });
                    }
                } else {
                    project.importJSON(stateInMemory);
                    socket.emit('project:load', {project: stateInMemory}, pageCount.count, state.page, pdfPageCount);
                }
            });
        });
    });

    socket.emit('settings', clientSettings);
    socket.emit('loading:end');
};

// store the whiteboard state at the point of PDF is loaded
exports.storeStateAtPDFLoad = function(room, callback) {
    if (projects.projects[room] && projects.projects[room].project) {
        db.get(room+"LatestState", function(err, state) {
            db.set(room+"StateAtPDFLoad", state);
            callback();
        });
    }
};

// restore the whiteboard state at the point of PDF is loaded
exports.restoreStateAtPDFLoad = function(room, callback) {
    if (projects.projects[room] && projects.projects[room].project) {
        var project = projects.projects[room].project;
        db.get(room+"PageCount", function(err, pageCount) {
            db.get(room + "StateAtPDFLoad", function (err, state) {
                db.get(room + state.page, function (err, value) {
                    if (value && project && project.activeLayer) {
                        project.activeLayer.remove();
                        project.importJSON(value.project);
                        callback(value, state, pageCount.count);
                    } else if(value == null || err){
                        project.activeLayer.remove();
                        project.importJSON(null);
                        callback({project: null}, state, pageCount.count);
                    }

                });
            });
        });
    }
};

// store the pdf page
exports.savePDFPage = function(room,file, pageNum,page) {
    if (projects.projects[room] && projects.projects[room].project) {
        db.get(room+"PDFPageCount", function(err, value) {
            if (value && value.hasOwnProperty(file) && value[file]< pageNum) {
                value[file] = pageNum;
                db.set(room+"PDFPageCount", value);  // update the pdf page count
            } else if (value && !value.hasOwnProperty(file)) {
                value[file] = pageNum;
                db.set(room+"PDFPageCount", value);  // update the pdf page count
            }

        });
        db.set(room+file+"PDFPage"+Number(pageNum), page);
    }
};

// get pdf page count
// need to be refactored to get the pdf name
exports.getPDFPageCount = function(room, callback) {
    db.get(room+"PDFPageCount", function(err, value) {
        if (value) {
            callback(value.count);
        } else
            callback(0);
    });
};

// get pdf page
// need to be refactored to get the pdf name
exports.getPDFPage = function(room, file, pageNum,callback) {
    db.get(room+file+"PDFPage"+pageNum, function(err, page) {
        if (page) {
            callback(page);
        } else
            callback(null);
    });
};

// set pdf content at toggle to whiteboard
exports.setPDFContentAtToggleToWhiteboard = function(room, canvas,callback) {
    if (projects.projects[room] && projects.projects[room].project) {
        var project = projects.projects[room].project;
        db.get(room + "PageCount", function (err, pageCount) {
            db.set(room + "PDFContentAtToggleToWhiteboard", {project: canvas});
            db.get(room + "StateAtPDFLoad", function (err, state) {
                db.get(room + state.page, function (err, value) {
                    if (value && project && project.activeLayer) {
                        project.activeLayer.remove();
                        project.importJSON(value.project);
                        callback(value, state, pageCount.count);
                    } else if(value == null || err){
                        project.activeLayer.remove();
                        project.importJSON(null);
                        callback({project: null}, state, pageCount.count);
                    }
                });
            });
        });
    }
};

// get pdf content at toggle to whiteboard
exports.getPDFContentAtToggleToWhiteboard = function(room, callback) {
    if (projects.projects[room] && projects.projects[room].project) {
        var project = projects.projects[room].project;
        db.get(room+"PDFContentAtToggleToWhiteboard", function(err, value) {
           callback(value);
        });
    }
};



exports.db = db;
