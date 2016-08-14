/**
 * Created by buddhikajay on 5/25/16.
 * This file is used to customize functions of PDFJS's viewer
 * the variable DEFAULT_URL is defined in viewer.js
 */

// this is a useful linl : https://www.sitepoint.com/custom-pdf-rendering/

// following are the global scope variables to be used by both js and paper-script files
var room;
var uid;
var IsPDFOn = false; // variable used to synchronize edit pdf btn functionality on draw js

// Initialise Socket.io
var socket = io.connect('/');

$(function() {
    $('#container').jstree({
        'core' : {
            'data' : {
                //"url" : "https://"+location.host+"/tree/",
                "url" : "http://"+location.host+"/tree/",
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
            
            //following function is defined as a separate function to 'open pdf files' below
            
            //openFileButton.click(function(){
            //    console.log('openning ' + data.instance.get_selected(true)[0].text);
            //    //PDFViewerApplication is an object defined in viewer.js
            //    //PDFViewerApplication.open('/web/compressed.tracemonkey-pldi-09.pdf');
            //    $('#fileBrowserModal').modal('hide');
            //    PDFViewerApplication.open('/files/'+data.instance.get_selected(true)[0].text);
            //    socket.emit('pdf:load', room, uid, data.instance.get_selected(true)[0].text);
            //});
            
            DEFAULT_URL = data.instance.get_selected(true)[0].text;
            
        }
        else {
            $('#openFileButton').prop('disabled', true);
        }
    });
});

//show file browser moadal
$(function(){
    $('#browsFiles').on('click', function(){
        console.log('Can Browse Files');
        $('#fileBrowserModal').modal('show');
    });
});

//open pdf file
$(function(){
    $('#openFileButton').click(function(){
        console.log('openning ' + DEFAULT_URL);
        //PDFViewerApplication is an object defined in viewer.js
        //PDFViewerApplication.open('/web/compressed.tracemonkey-pldi-09.pdf');
        $('#fileBrowserModal').modal('hide');
        PDFViewerApplication.open('/files/'+DEFAULT_URL);
        var documentViewer = $('#documentViewer');
        if (documentViewer.css('visibility') == 'hidden') {
            documentViewer.css('visibility', 'visible');
            //dynamically assigning the background color and image as in viewer.css #230. Otherwise
            //this background color for body tag will make conflicts with whiteboard
            $('body').css('background-color', '#404040');
            $('#myCanvas').css('top','32px'); // pull down the canvas so that we can still use pdfjs control buttons while editing on top of pdf
        }
        IsPDFOn = true;
        console.log(DEFAULT_URL);
        socket.emit('pdf:load', room, uid, DEFAULT_URL);
    }); 
});

/* Go to next page of the loaded PDF file*/

$(function(){
    $('#toolbarViewerLeft .toolbarButton.pageDown').click(function(){
        socket.emit('pdf:pageChange', room, uid, PDFViewerApplication.page+1);
    });
});

/* Go to previous page of the loaded PDF file*/

$(function(){
    $('#toolbarViewerLeft .toolbarButton.pageUp').click(function(){
        socket.emit('pdf:pageChange', room, uid, PDFViewerApplication.page-1);
    });
});

/*Zoom In*/
$(function(){
    $('#zoomIn').click(function(){
        console.log('zooming in from '+PDFViewerApplication.pdfViewer.currentScaleValue);
        socket.emit('pdf:zoom', room, uid, PDFViewerApplication.pdfViewer.currentScaleValue+0.1);
    });
});

/*Zoom Out*/
$(function(){
    $('#zoomOut').click(function(){
        socket.emit('pdf:zoom', room, uid, PDFViewerApplication.pdfViewer.currentScaleValue-0.1);
    });
});

/*Presentation Mode*/
$(function (){
    $('#presentationMode').click(function(){
        console.log('Entering to presentation mode');
        socket.emit('pdf:presentationMode', room, uid);
    });
})
