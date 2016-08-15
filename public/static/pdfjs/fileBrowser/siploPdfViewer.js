/**
 * Created by buddhikajay on 5/25/16.
 * This file is used to customize functions of PDFJS's viewer
 * the variable DEFAULT_URL is defined in viewer.js
 */

// this is a useful linl : https://www.sitepoint.com/custom-pdf-rendering/

// following are the global scope variables to be used by both js and paper-script files
var room;
var uid;

// Initialise Socket.io
var socket = io.connect('/');

var DEFAULT_URL = ''; // added from Viewer.js

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
        /*//PDFViewerApplication is an object defined in viewer.js
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
        socket.emit('pdf:load', room, uid, DEFAULT_URL);*/

        $('body').css('background-color', '#404040');
        $('.pdf-controllers-container').css('display', 'block');
        $('#fileBrowserModal').modal('hide');
        testPDFInSameCanvas(DEFAULT_URL);
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
});

function testPDFInSameCanvas(url){

    //
    // If absolute URL from the remote server is provided, configure the CORS
    // header on that server.
    //
    var url = "http://localhost:9002/files/"+url;


    //
    // Disable workers to avoid yet another cross-origin issue (workers need
    // the URL of the script to be loaded, and dynamically loading a cross-origin
    // script does not work).
    //
    // PDFJS.disableWorker = true;

    //
    // In cases when the pdf.worker.js is located at the different folder than the
    // pdf.js's one, or the pdf.js is executed via eval(), the workerSrc property
    // shall be specified.
    //
    // PDFJS.workerSrc = '../../build/pdf.worker.js';

    var pdfDoc = null,
        pageNum = 1,
        pageRendering = false,
        pageNumPending = null,
        scale = 1.5,
        canvas = document.getElementById('testCanvas'),
        ctx = canvas.getContext('2d');

    /**
     * Get page info from document, resize canvas accordingly, and render page.
     * @param num Page number.
     */
    function renderPage(num) {
        pageRendering = true;
        // Using promise to fetch the page
        pdfDoc.getPage(num).then(function(page) {
            var viewport = page.getViewport(scale);
            //canvas.height = viewport.height;
            //canvas.width = viewport.width;

            // Render PDF page into canvas context
            var renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            var renderTask = page.render(renderContext);

            // Wait for rendering to finish
            renderTask.promise.then(function () {
                $('#testBase64').trigger('click');
                pageRendering = false;
                if (pageNumPending !== null) {
                    // New page rendering is pending
                    renderPage(pageNumPending);
                    pageNumPending = null;
                }
            });
        });

        // Update page counters
        document.getElementById('page_num').textContent = pageNum;
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
        if (pageNum <= 1) {
            return;
        }
        pageNum--;
        queueRenderPage(pageNum);
    }
    document.getElementById('prev').addEventListener('click', onPrevPage);

    /**
     * Displays next page.
     */
    function onNextPage() {
        if (pageNum >= pdfDoc.numPages) {
            return;
        }
        pageNum++;
        queueRenderPage(pageNum);
    }
    document.getElementById('next').addEventListener('click', onNextPage);

    /**
     * Asynchronously downloads PDF.
     */
    PDFJS.getDocument(url).then(function (pdfDoc_) {
        pdfDoc = pdfDoc_;
        document.getElementById('page_count').textContent = pdfDoc.numPages;

        // Initial/first page rendering
        renderPage(pageNum);
    });

}
