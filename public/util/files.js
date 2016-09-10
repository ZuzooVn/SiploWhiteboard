/**
 * Created by buddhikajay on 5/24/16.
 */

var fs = require('fs'),
    path = require('path');

exports.processPath = function(req, res, batchCode, moduleCode){

    var pathToProcess;
    var classRoomRootDirectory;
    if(req.query.id == '#'){
        classRoomRootDirectory = "batch-"+batchCode+"-Module-"+moduleCode;  // root directory belongs to classroom
        pathToProcess = path.resolve(__dirname, '..', '..', 'user_files', classRoomRootDirectory); //root directory of classroom can be identified using batch number n module-code
    }
    else {
        classRoomRootDirectory = req.query.id;
        pathToProcess = path.resolve(__dirname, '..', '..', 'user_files', req.query.id);
    }
    processRequest(pathToProcess, classRoomRootDirectory, res);
};

function processRequest(pathToProcess, classRoomRootDirectory, res) {
    var resp = [];
    fs.readdir(pathToProcess, function(err, list) {
        if(err){
            res.json('error');
        }
        else{
            for (var i = list.length - 1; i >= 0; i--) {
                resp.push(processNode(pathToProcess, classRoomRootDirectory, list[i]));
            }
            res.json(resp);
        }
    });
}

function processNode(pathToProcess, classRoomRootDirectory, text) {
    var s = fs.statSync(path.join(pathToProcess, text));
    return {
        "id": path.join(classRoomRootDirectory, text),
        "text": text,
        //"icon" : s.isDirectory() ? 'jstree-custom-folder' : 'jstree-custom-file',
        "state": {
            "opened": false,
            "disabled": false,
            "selected": false
        },
        "li_attr": {
            "base": path.join(classRoomRootDirectory, text),
            "isLeaf": !s.isDirectory()
        },
        "children": s.isDirectory()
    };
}