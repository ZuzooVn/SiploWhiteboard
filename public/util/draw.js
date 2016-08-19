var paper = require('paper');
var projects = require('./projects.js');
var db = require('./db.js');

var redoStack = {}; // json object to store redo stacks

projects = projects.projects;

// Create an in memory paper canvas
var drawing = paper.setup(new paper.Canvas(1920, 1080));

// Continues to draw a path in real time
exports.progressExternalPath = function (room, points, artist) {
    var color = new drawing.Color(points.rgba.red, points.rgba.green, points.rgba.blue, points.rgba.opacity);
    var project = projects[room].project;
    project.activate();
    var path = projects[room].external_paths[artist];
    if (points.tool == "line") {
        if (!path) {
            projects[room].external_paths[artist] = new drawing.Path();
            path = projects[room].external_paths[artist];
        }
        path.strokeColor = color;
        path.strokeWidth = 2;
        path.name = points.name;
        path.add(new drawing.Line(new drawing.Point(points.path.start[1], points.path.start[2]), new drawing.Point(points.path.end[1], points.path.end[2])));
        project.view.draw();
    }
    else if (points.tool == "rectangle") {
        if (!path) {
            projects[room].external_paths[artist] = new drawing.Path();
            path = projects[room].external_paths[artist];
        }
        path.strokeColor = color;
        path.strokeWidth = 2;
        path.name = points.name;
        path.add(new drawing.Rectangle(new drawing.Point(points.path.start[1], points.path.start[2]), new drawing.Point(points.path.end[1], points.path.end[2])));
        project.view.draw();
    }
    else if (points.tool == "triangle") {
        //project.activeLayer.lastChild.remove();
        if (!path) {
            projects[room].external_paths[artist] = new drawing.Path();
            path = projects[room].external_paths[artist];
        }
        path.strokeColor = color;
        path.strokeWidth = 2;
        path.name = points.name;
        //path.add(new drawing.Point(points.path.start[1], points.path.start[2]));
        //path.add(new drawing.Point(points.path.end[1], points.path.end[2]));
        //path.add(new drawing.Point(2 * points.path.start[1] - points.path.end[1], points.path.end[2]));
        project.view.draw();
    }
    else if (points.tool == "circle") {
        if (!path) {
            projects[room].external_paths[artist] = new drawing.Path();
            path = projects[room].external_paths[artist];
        }
        path.strokeColor = color;
        path.strokeWidth = 2;
        path.name = points.name;
        path.add(new drawing.Path.Circle(new drawing.Point((points.path.start[1] + points.path.end[1]) / 2, (points.path.start[2] + points.path.end[2]) / 2), (new drawing.Point(points.path.start[1], points.path.start[2]) - new drawing.Point(points.path.end[1], points.path.end[2])).length / 2));
        project.view.draw();
    }
    else {


        // The path hasn't already been started
        // So start it
        if (!path) {
            projects[room].external_paths[artist] = new drawing.Path();
            path = projects[room].external_paths[artist];

            // Starts the path
            var start_point = new drawing.Point(points.start[1], points.start[2]);

            if (points.tool == "draw") {
                path.fillColor = color;
            }
            else if (points.tool == "pencil") {
                path.strokeColor = color;
                path.strokeWidth = 2;
            } else if (points.tool == "eraser") {
                path.strokeColor = color;
                path.strokeWidth = 15;
            }
            else { // assume tool is not supplied, set to 'draw' as default
                path.fillColor = color;
            }
            path.name = points.name;
            path.add(start_point);
        }

        // Draw all the points along the length of the path

        else {
            var paths = points.path;
            var length = paths.length;
            for (var i = 0; i < length; i++) {
                path.add(new drawing.Point(paths[i].top[1], paths[i].top[2]));
                path.insert(0, new drawing.Point(paths[i].bottom[1], paths[i].bottom[2]));
            }
        }

        //path.smooth();
        project.view.draw();
    }
};

// finished drawing an object. save the object to db
exports.endExternalPath = function (room, points, artist) {
    var project = projects[room].project;
    project.activate();
    var path = projects[room].external_paths[artist];
    if (path) {
        // Close the path
        if (points.tool == "line") {
            //path.add(new drawing.Path.Line(new drawing.Point(points.path.start[1], points.path.start[2]), new drawing.Point(points.path.end[1], points.path.end[2])));
            path.add(new drawing.Point(points.path.start[1], points.path.start[2]));
            path.add(new drawing.Point(points.path.end[1], points.path.end[2]));
        }
        else if (points.tool == "rectangle") {
            path.add(new drawing.Point(points.path.start[1], points.path.start[2]));
            path.add(new drawing.Point(points.path.end[1], points.path.start[2]));
            path.add(new drawing.Point(points.path.end[1], points.path.end[2]));
            path.add(new drawing.Point(points.path.start[1], points.path.end[2]));
        }
        else if (points.tool == "triangle") {
            path.add(new drawing.Point(points.path.start[1], points.path.start[2]));
            path.add(new drawing.Point(points.path.end[1], points.path.end[2]));
            path.add(new drawing.Point(2 * points.path.start[1] - points.path.end[1] , points.path.end[2]));
        }
        else if (points.tool == "circle") {
            // TODO :  need to debug here
            path.add(new drawing.Path.Circle(new drawing.Point((points.path.start[1] + points.path.end[1]) / 2, (points.path.start[2] + points.path.end[2]) / 2), (new drawing.Point(points.path.start[1], points.path.start[2]) - new drawing.Point(points.path.end[1], points.path.end[2])).length / 2));
        }
        else {
            path.add(new drawing.Point(points.end[1], points.end[2]));
        }
        path.closed = true;
        //path.smooth();
        project.view.draw();
        // Remove the old data
        projects[room].external_paths[artist] = false;
    }
    db.storeProject(room);
};

exports.clearCanvas = function (room, canvasClearedCount) {
    var project = projects[room].project;
    db.storeAsPreviousPage(room, canvasClearedCount);
    redoStack[room].length = 0;
    if (project && project.activeLayer && project.activeLayer.hasChildren()) {
        // Remove all but the active layer
        if (project.layers.length > 1) {
            var activeLayerID = project.activeLayer._id;
            for (var i = 0; i < project.layers.length; i++) {
                if (project.layers[i]._id != activeLayerID) {
                    project.layers[i].remove();
                    i--;
                }
            }
        }
        // Remove all of the children from the active layer
        if (project && project.activeLayer && project.activeLayer.hasChildren()) {
            project.activeLayer.removeChildren();
        }
        db.storeProject(room);
    }
}

exports.cleanRedoStack = function(room){
    redoStack[room].length = 0;
}

// Remove an item from the canvas
exports.removeItem = function (room, artist, itemName) {
    var project = projects[room].project;
    if (project && project.activeLayer && project.activeLayer._namedChildren[itemName] && project.activeLayer._namedChildren[itemName][0]) {
        project.activeLayer._namedChildren[itemName][0].remove();
        db.storeProject(room);
    }
}

// Move one or more existing items on the canvas
exports.moveItemsProgress = function (room, artist, itemNames, delta) {
    var project = projects[room].project;
    if (project && project.activeLayer) {
        for (x in itemNames) {
            var itemName = itemNames[x];
            var namedChildren = project.activeLayer._namedChildren;
            if (namedChildren && namedChildren[itemName] && namedChildren[itemName][0]) {
                project.activeLayer._namedChildren[itemName][0].position.x += delta[1];
                project.activeLayer._namedChildren[itemName][0].position.y += delta[2];
            }
        }
    }
}

// Move one or more existing items on the canvas
// and write to DB
exports.moveItemsEnd = function (room, artist, itemNames, delta) {
    var project = projects[room].project;
    if (project && project.activeLayer) {
        for (x in itemNames) {
            var itemName = itemNames[x];
            var namedChildren = project.activeLayer._namedChildren;
            if (namedChildren && namedChildren[itemName] && namedChildren[itemName][0]) {
                project.activeLayer._namedChildren[itemName][0].position.x += delta[1];
                project.activeLayer._namedChildren[itemName][0].position.y += delta[2];
            }
        }
        db.storeProject(room);
    }
}

// Add image to canvas
exports.addImage = function (room, artist, data, position, name) {
    var project = projects[room].project;
    if (project && project.activeLayer) {
        var image = JSON.parse(data);
        var raster = new drawing.Raster(image);
        raster.position = new drawing.Point(position[1], position[2]);
        raster.name = name;
        db.storeProject(room);
    }
}

// check if a redo stack is already declared for a classroom
exports.hasDeclaredRedoStack = function (room) {
    return redoStack.hasOwnProperty(room);
}

// init a redo stack for a classroom
exports.initRedoStack = function (room) {
    redoStack[room] = new Array();
}

// TODO : call this method when class is done
// remove the redo stack declared for classroom
exports.removeRedoStack = function (room) {
   delete  redoStack[room];
}

// Undo an item from the canvas
exports.undoItem = function (room) {
    var project = projects[room].project;
    if (project && project.activeLayer && project.activeLayer.hasChildren()) {
        redoStack[room].push(project.activeLayer.lastChild);
        project.activeLayer.lastChild.remove();
        db.storeProject(room);
    }
}

// Redo an item from the canvas
exports.redoItem = function (room) {
    var project = projects[room].project;
    if (project && project.activeLayer && redoStack[room].length > 0) {
        project.activeLayer.addChild(redoStack[room].pop());
        db.storeProject(room);
    }
}

// Resize an image
exports.resizeImage = function (room,imageName, scalingFactor) {
    var project = projects[room].project;
    if (project && project.activeLayer && project.activeLayer._namedChildren[imageName] && project.activeLayer._namedChildren[imageName][0]) {
        var namedChildren = project.activeLayer._namedChildren;
        namedChildren[imageName][0].scale(scalingFactor);
        db.storeProject(room);
    }
}
