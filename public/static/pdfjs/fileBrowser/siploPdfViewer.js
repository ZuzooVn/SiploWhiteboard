/**
 * Created by buddhikajay on 5/25/16.
 * This file is used to customize functions of PDFJS's
 */

// this is a useful link : https://www.sitepoint.com/custom-pdf-rendering/

// following are the global scope variables to be used by both js and paper-script files
var room;
var role;
var uid;
var IsPDFOn = false;  // true if a PDF is opened on whiteboard
var IsToggledToWhiteboardFromPDF = false;  // true if toggled from pdf-to-whiteboard

// Initialise Socket.io
var socket = io.connect('/');

// variables for pdf rendering
var pdfDoc,
    pageNum,
    pdfPageCount = {},// number of pages stored @ backend of each pdf
    pageRendering,
    pageNumPending,
    scale,
    canvas,
    ctx;

var selectedPDF = ''; // path to selected pdf file from root directory of js tree
var parentDirectory = '';


// initializing js tree with file directory assigned for classroom
$(function() {
    $('#container').jstree({
        'core' : {
            'data' : {
                // "url" : location.protocol+"//"+"localhost:5000"+"/tree?room=" + window.location.pathname.split("/")[2],  // send request to file server. change the url in production to correct sub-domain
                "url" :"https://whiteboard.siplo.lk/tree?room=" + window.location.pathname.split("/")[2],
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

        //if the selected node is a leaf node -> enable the open button
        var openFileButton = $('#openFileButton')
        if(data.instance.get_node(data.selected[0]).li_attr.isLeaf){
            openFileButton.prop('disabled', false);
            var filePath = data.instance.get_selected(true)[0].id;
            /*var direcories = filePath.split("/");
            console.log(filePath);
            console.log(data.instance.get_path(data.node,'/'));*/
            parentDirectory = filePath.split("/")[0];
            selectedPDF = data.instance.get_path(data.node,'/');   // path to selected pdf file from root directory of js tree
            
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
        $('body').css('background-color', '#404040');
        $('.pdf-controllers-container').css('display', 'block');
        $('#fileBrowserModal').modal('hide');
        setupPDFRendering(selectedPDF, function(){
            if(!pdfPageCount.hasOwnProperty(selectedPDF)){  //  loading a new pdf
                pdfPageCount[selectedPDF] = 0;
                renderPage(pageNum);
                socket.emit('pdf:load', room, uid, parentDirectory, selectedPDF);
            } else{ // loading a previously opened pdf
                socket.emit('pdf:setUpPDFnRenderFromDB', room, uid, pageNum, pdfPageCount, parentDirectory, selectedPDF);
            }
        });
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
});

function setupPDFRendering(file, callback){

    // If absolute URL from the remote server is provided, configure the CORS
    // header on that server.
    var url = "https://files.siplo.lk/api/"+file;
    // var url = location.protocol+"//localhost:5000/api/"+parentDirectory+"/"+file;

    pdfDoc = null;
    pageNum = 1;
    pageRendering = false;
    pageNumPending = null;
    scale = 1.5;
    canvas = document.getElementById('pdfCanvas');
    ctx = canvas.getContext('2d');

    /**
     * Asynchronously downloads PDF.
     */
    PDFJS.getDocument(url).then(function (pdfDoc_) {
        pdfDoc = pdfDoc_;
        document.getElementById('page_count').textContent = pdfDoc.numPages;
        callback();
    });
}

/**
 * Get page info from document, resize canvas accordingly, and render page.
 * @param num Page number.
 */
function renderPage(num) {
        //console.log(pdfPageCount);
    pageRendering = true;
    // Using promise to fetch the page
    pdfDoc.getPage(num).then(function(page) {
        var viewport = page.getViewport(scale);
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context
        var renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        var renderTask = page.render(renderContext);

        // Wait for rendering to finish
        renderTask.promise.then(function () {
            $('#pdfRenderEventEmitter').trigger('click');
            pageRendering = false;
            if (pageNumPending !== null) {
                // New page rendering is pending
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });

    // Update page counters
    document.getElementById('page_num').textContent = num;
    //console.log('displaying page number '+ pageNum);
}

/**
 * If another page rendering in progress, waits until the rendering is
 * finised. Otherwise, executes rendering immediately.
 */
function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

/**
 * Displays previous page.
 */
function onPrevPage() {
    //console.log('@ prev');
    if (pageNum <= 1) {
        return;
    }
    savePDFPage();
    pageNum--;
    socket.emit('pdf:renderFromDB', room, uid, pageNum, pdfPageCount, parentDirectory, selectedPDF);
}


/**
 * Displays next page.
 */
function onNextPage() {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    savePDFPage();
    if(pageNum >= pdfPageCount[selectedPDF]) {  // render page using pdf js
        pdfPageCount[selectedPDF]++;
        pageNum++;
        queueRenderPage(pageNum);
        socket.emit('pdf:pageChange', room, uid, pageNum, pdfPageCount, parentDirectory, selectedPDF);
    } else{ // render the page using the state at back end
        pageNum++;
        socket.emit('pdf:renderFromDB', room, uid, pageNum, pdfPageCount, parentDirectory, selectedPDF);
    }
}

function savePDFPage(){
    var base64 = document.getElementById('myCanvas').toDataURL();
    socket.emit('pdf:savePage', room, selectedPDF, pageNum, base64);
    $('#canvasClear').trigger('click');
}