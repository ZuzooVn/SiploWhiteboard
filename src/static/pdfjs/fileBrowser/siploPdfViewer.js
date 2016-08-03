/**
 * Created by buddhikajay on 5/25/16.
 * This file is used to customize functions of PDFJS's viewer
 */

// following are the global scope variables to be used by both js and paper-script files
var room;
var uid;

// Initialise Socket.io
var socket = io.connect('/');

$(function() {
    $('#container').jstree({
        'core' : {
            'data' : {
                "url" : "http://localhost:9002/tree/",
                "data" : function (node) {
                    return { "id" : node.id };
                }
            }
        }
    });
});

/* Select PDF file from file directory*/

$(function(){
    $('#container').on("changed.jstree", function (e, data) {
        //console.log(data.instance.get_selected(true)[0].text);
        //console.log(data.instance.get_node(data.selected[0]).li_attr.isLeaf);

        //if the selected node is a leaf node -> enable the open button
        var openFileButton = $('#openFileButton')
        if(data.instance.get_node(data.selected[0]).li_attr.isLeaf){
            openFileButton.prop('disabled', false);
            openFileButton.click(function(){
                console.log('openning ' + data.instance.get_selected(true)[0].text);
                //PDFViewerApplication is an object defined in viewer.js
                //PDFViewerApplication.open('/web/compressed.tracemonkey-pldi-09.pdf');
                $('#fileBrowserModal').modal('hide');
                PDFViewerApplication.open('/files/'+data.instance.get_selected(true)[0].text);
                socket.emit('pdf:load', room, uid, data.instance.get_selected(true)[0].text);
            });
        }
        else {
            $('#openFileButton').prop('disabled', true);
        }
    });
});

$(function(){
    $('#browsFiles').on('click', function(){
        console.log('Can Browse Files');
        $('#fileBrowserModal').modal('show');
    });
});

/* Go to next page of the loaded PDF file*/

$(function(){
    $('#toolbarViewerLeft .toolbarButton.pageDown').click(function(){
        socket.emit('pdf:nextPage', room, uid);
    });
});

/* Go to previous page of the loaded PDF file*/

$(function(){
    $('#toolbarViewerLeft .toolbarButton.pageUp').click(function(){
        socket.emit('pdf:previousPage', room, uid);
    });
});
