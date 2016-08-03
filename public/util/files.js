/**
 * Created by buddhikajay on 5/24/16.
 */

var fs = require('fs'),
    path = require('path');

exports.processPath = function(req, res){

    var pathToProcess;
    console.log(__dirname);
    console.log(req.query.id);
    if(req.query.id == '#'){
        pathToProcess = path.resolve(__dirname, '..', '..', 'user_files');
    }
    else {
        pathToProcess = req.query.id;
    }
    //res.json('{}');
    processRequest(pathToProcess, res);
};

function processRequest(pathToProcess, res) {
    var resp = [];
    fs.readdir(pathToProcess, function(err, list) {
        if(err){
            res.json('error');
        }
        else{
            for (var i = list.length - 1; i >= 0; i--) {
                resp.push(processNode(pathToProcess, list[i]));
            }
            res.json(resp);
        }
    });
}

function processNode(pathToProcess, text) {
    var s = fs.statSync(path.join(pathToProcess, text));
    return {
        "id": path.join(pathToProcess, text),
        "text": text,
        //"icon" : s.isDirectory() ? 'jstree-custom-folder' : 'jstree-custom-file',
        "state": {
            "opened": false,
            "disabled": false,
            "selected": false
        },
        "li_attr": {
            "base": path.join(pathToProcess, text),
            "isLeaf": !s.isDirectory()
        },
        "children": s.isDirectory()
    };
}