/**
 * Created by buddhikajay on 5/25/16.
 * This file is used to customize functions of PDFJS's viewer
 * the variable DEFAULT_URL is defined in viewer.js
 */

// this is a useful link : https://www.sitepoint.com/custom-pdf-rendering/

// following are the global scope variables to be used by both js and paper-script files
var room;
var role;
var uid;

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

var DEFAULT_URL = ''; // name of the selected pdf
var file_path = '';  // absolute path of the selected pdf
var parentDirectory = '';

$(function() {
    $('#container').jstree({
        'core' : {
            'data' : {
                "url" : location.protocol+"//"+location.host+"/tree/",
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
            file_path = data.instance.get_path(data.node,'/');
            console.log(file_path);
            console.log(data.instance.get_parent(data.node,'../'));
            parentDirectory = "batch-12-Module-CS2036";
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

        $('body').css('background-color', '#404040');
        if(role == "tutor")
            $('.pdf-controllers-container').css('display', 'block');
        $('#fileBrowserModal').modal('hide');
        setupPDFRendering(DEFAULT_URL, function(){
            if(!pdfPageCount.hasOwnProperty(DEFAULT_URL)){  //  loading a new pdf
                pdfPageCount[DEFAULT_URL] = 0;
                renderPage(pageNum);
                //alert('set up n render from pdf js');
                socket.emit('pdf:load', room, uid, "batch-12-Module-CS2036", DEFAULT_URL);
            } else{ // loading a previously opened pdf
                //alert('set up n render from db');
                socket.emit('pdf:setUpPDFnRenderFromDB', room, uid, pageNum, pdfPageCount, DEFAULT_URL);
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
    //var url = location.protocol+"//"+location.host+"/files/"+url;
    var url = location.protocol+"//localhost:8080/api/"+parentDirectory+"/"+file;

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
    socket.emit('pdf:renderFromDB', room, uid, pageNum, pdfPageCount, parentDirectory, DEFAULT_URL);
}


/**
 * Displays next page.
 */
function onNextPage() {
    //console.log('current page number '+pageNum);
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    savePDFPage();
    if(pageNum >= pdfPageCount[DEFAULT_URL]) {  // render page using pdf js
        //alert('serve from pdf js');
        pdfPageCount[DEFAULT_URL]++;
        pageNum++;
        queueRenderPage(pageNum);
        socket.emit('pdf:pageChange', room, uid, pageNum, pdfPageCount, parentDirectory, DEFAULT_URL);
    } else{ // render the page using the state at back end
        pageNum++;
        socket.emit('pdf:renderFromDB', room, uid, pageNum, pdfPageCount, parentDirectory, DEFAULT_URL);
    }
}

function savePDFPage(){
    var base64 = document.getElementById('myCanvas').toDataURL();
    socket.emit('pdf:savePage', room, DEFAULT_URL, pageNum, base64);
    $('#canvasClear').trigger('click');
}