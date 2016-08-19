// Please refactor me, this is mostly a complete car crash with globals everywhere.

tool.minDistance = 1;
tool.maxDistance = 45;

/*// following are the global scope variables to be used by both js and paper-script files
var room;
var uid;
var IsPDFOn = false; // variable used to synchronize edit pdf btn functionality on draw js

// Initialise Socket.io
var socket = io.connect('/');*/

room = window.location.pathname.split("/")[2];
var redoStack = new Array(); // stack to store undo items
var canvasClearedCount = 0; // keep track of number of times the canvas cleared, so we can override the correct previous page at db
var maximumPreviousPageCount = 5;
var currentPageNumber = 0; // when a previous page is loaded, this value should be the previous-page number.
/*
* 0 - latest page
* 1,2,3,4,5 - previous page
*/

$('#testBase64').on('click', function(){
    var base64 = document.getElementById('testCanvas').toDataURL();
    var raster = new Raster(base64);
    raster.position = view.center;
    raster.name = uid + ":" + (++paper_object_count);
});

$('#testPDFGeneration').on('click', function(){
    $.ajax({
        type: "GET",
        url: '/tests/pdf-generation?room='+room,
        dataType: "json",
        success: function (data, status, object) {
            console.log("success");
        },
        error: function (data, status, object) {
            console.log("ajax error");
        }
    });
});

$('#imgCropped').on('click', function(){
    if(croppedImg != null){
        var raster = new Raster(croppedImg);
        raster.position = view.center;
        raster.name = uid + ":" + (++paper_object_count);
        socket.emit('image:add', room, uid, JSON.stringify(croppedImg), raster.position, raster.name);
        croppedImg = null;
    }
});

function removeStylingFromTools() {
    $('.tool-box .tool').css({
        border: "none"
    }); // remove the backgrounds from other buttons
    $('.compound-box>li> a').css({
        background: "none"
    }); // remove the css from compound boxes to show it as in-active
}

function pickColor(color) {
    $('#color').val(color);
    var rgb = hexToRgb(color);
    $('#activeColorSwatch').css('background-color', 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')');
    update_active_color();
}

/*http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb*/
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}


$(document).ready(function () {
    var drawurl = window.location.href.split("?")[0]; // get the drawing url
    $('#embedinput').val("<iframe name='embed_readwrite' src='" + drawurl + "?showControls=true&showChat=true&showLineNumbers=true&useMonospaceFont=false' width=600 height=400></iframe>"); // write it to the embed input
    $('#linkinput').val(drawurl); // and the share/link input
    $('#drawTool > a').css({
        background: "#eee"
    }); // set the drawtool css to show it as active

    $('#myCanvas').bind('mousewheel', function (ev) {
        scrolled(ev.pageX, ev.pageY, -ev.wheelDelta);
    });

    $('#myCanvas').bind('DOMMouseScroll', function (ev) {
        scrolled(ev.pageX, ev.pageY, ev.detail);
    });

    var drawingPNG = localStorage.getItem("drawingPNG" + room);

    // Temporarily set background as image from memory to improve UX
    $('#canvasContainer').css("background-image", 'url(' + drawingPNG + ')');

    if (paper.project.activeLayer.hasChildren())  // notifying user that he can undo now
        $('.buttonicon-undo').addClass('disabled');

});

var scaleFactor = 1.1;

function scrolled(x, y, delta) {
    // Far too buggy for now
    /*
     console.log("Scrolling");
     var pt = new Point(x, y),
     scale = 1;
     if(delta < 0) {
     scale *= scaleFactor;
     } else if(delta > 0) {
     scale /= scaleFactor;
     }
     //view.scale(scale, pt);
     $('#myCanvas').
     view.draw();
     */
}

$('#activeColorSwatch').css('background-color', $('.colorSwatch.active').css('background-color'));

// Random User ID
// Used when sending data
uid = (function () {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}());

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.search);
    if (results == null) {
        return "";
    } else {
        return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
}

// Join the room
socket.emit('subscribe', {
    room: room
});

// JSON data of the users current drawing
// Is sent to the user
var path_to_send = {};

// Calculates colors
var active_color_rgb;
var active_color_json = {};
var $opacity = $('#opacityRangeVal');
var update_active_color = function () {
    var rgb_array = $('#activeColorSwatch').css('background-color');
    $('#editbar').css("border-bottom", "solid 2px " + rgb_array);

    while (rgb_array.indexOf(" ") > -1) {
        rgb_array = rgb_array.replace(" ", "");
    }
    rgb_array = rgb_array.substr(4, rgb_array.length - 5);
    rgb_array = rgb_array.split(',');
    var red = rgb_array[0] / 255;
    var green = rgb_array[1] / 255;
    var blue = rgb_array[2] / 255;
    var opacity = $opacity.val() / 255;

    active_color_rgb = new RgbColor(red, green, blue, opacity);
    active_color_rgb._alpha = opacity;
    active_color_json = {
        "red": red || 0,
        "green": green,
        "blue": blue,
        "opacity": opacity
    };
};

// Get the active color from the UI eleements
var authorColor = getParameterByName('authorColor');
var authorColors = {};
if (authorColor != "" && authorColor.substr(0, 4) == "rgb(") {
    authorColor = authorColor.substr(4, authorColor.indexOf(")") - 4);
    authorColors = authorColor.split(",");
    $('#activeColorSwatch').css('background-color', 'rgb(' + authorColors[0] + ',' + authorColors[1] + ',' + authorColors[2] + ')');
}
update_active_color();


$('#colorToggle').on('click', function () {
    removeStylingFromTools();
    $('#colorToggle').css({
        border: "1px solid orange"
    }); // set the selected tool css to show it as active
    $('#mycolorpicker').fadeToggle();
});

/*Load New Page*/
$('#load-new-pg').click(function () {
    removeStylingFromTools();
    $('#load-new-pg > a').css({
        background: "orange"
    });
    redoStack.length = 0;
    if(currentPageNumber == 0 && paper.project.activeLayer.hasChildren()){ // currently on the latest page of the book. so open a new page
        //var p = confirm("Are you sure you want to clear the drawing?");
        canvasClearedCount++;
        clearCanvas();
        socket.emit('canvas:clear', room, canvasClearedCount);
    }
    else
        alert("Pleas go back to last page to add a new page");
});

/*Load Next Page*/
$('#load-next-pg').click(function () {
    removeStylingFromTools();
    $('#load-next-pg > a').css({
        background: "orange"
    });
    redoStack.length = 0;
    var requestedPageNumber = (currentPageNumber == canvasClearedCount && currentPageNumber > 0) ? 0 : (currentPageNumber >= 1) ? currentPageNumber+1 : -1;
    if(requestedPageNumber != -1)
        socket.emit('load:previousPage', room, requestedPageNumber, currentPageNumber);
    else
        alert("You have reached the last page of the book");
});

/*Loading Previous Page*/
$('#load-previous-pg').click(function () {
    removeStylingFromTools();
    $('#load-previous-pg > a').css({
        background: "orange"
    });
    redoStack.length = 0;
    var requestedPageNumber = (currentPageNumber == 0 && canvasClearedCount > 0) ? canvasClearedCount : (canvasClearedCount > 0 && currentPageNumber > 1) ? currentPageNumber-1 : -1;
    if(requestedPageNumber != -1)
        socket.emit('load:previousPage', room, requestedPageNumber, currentPageNumber);
    else
        alert("You have reached the first page of the book");
});

$('.toggleBackground').click(function () {
    $('#myCanvas').toggleClass('whiteBG');
});


// ---------------------------------
// DRAWING EVENTS


var send_paths_timer;
var timer_is_active = false;
var paper_object_count = 0;
var activeTool = "pencil";
var mouseTimer = 0; // used for getting if the mouse is being held down but not dragged IE when bringin up color picker
var mouseHeld; // global timer for if mouse is held.

var shapeStartPoint;
var shapeEndPoint;
var selectionRectangle = null;
var selectionRectangleScale = 0;
var currentRatio = 1;
var previousRatio = 1;
var selectToolMode = "ITEM_DRAG";

function onMouseDown(event) {
    if (event.which === 2) return; // If it's middle mouse button do nothing -- This will be reserved for panning in the future.
    $('.popup').fadeOut();

    // Ignore middle or right mouse button clicks for now
    if (event.event.button == 1 || event.event.button == 2) {
        return;
    }

    // remove the selectionRectangle
    if(activeTool != "select" && selectionRectangle){
        currentRatio = 1;
        previousRatio = 1;
        selectionRectangle.remove();
        selectionRectangle = null;
        selectionRectangleScale = 0;
    }

    // remove the color picker after picking color and start drawing again
    if($('#mycolorpicker').is(':visible')){
        $('#mycolorpicker').fadeToggle();
        $('.tool-box .tool').css({
            border: "none"
        }); // remove the backgrounds from other buttons
        $('.shape-box>li> a').css({
            background: "none"
        }); // remove the shapes tool css to show it as in-active
    }

    //mouseTimer = 0;
    //mouseHeld = setInterval(function() { // is the mouse being held and not dragged?
    //  mouseTimer++;
    //  if (mouseTimer > 5) {
    //    mouseTimer = 0;
    //    $('#mycolorpicker').toggle(); // show the color picker
    //    $('#mycolorpicker').css({
    //      "left": event.event.pageX - 250,
    //      "top": event.event.pageY - 100
    //    }); // make it in the smae position
    //  }
    //}, 100);

    if (activeTool == "draw" || activeTool == "pencil" || activeTool == "eraser" || activeTool == "line" || activeTool == "rectangle" || activeTool == "triangle" || activeTool == "circle") {
        // The data we will send every 100ms on mouse drag

        var point = event.point;
        path = new Path();
        path.add(event.point);
        path.name = uid + ":" + (++paper_object_count);
        path_to_send = {
            name: path.name,
            rgba: active_color_json,
            start: event.point,
            path: [],
            tool: activeTool
        };
        if (activeTool == "draw") {
            path.fillColor = active_color_rgb;
        } else if (activeTool == "pencil") {
            path.strokeColor = active_color_rgb;
            path.strokeWidth = 2;
        } else if (activeTool == "eraser") {
            path.strokeColor = new RgbColor(255, 255, 255, 1);
            path.strokeWidth = 15; // increase this size for a larger eraser
            // The data we will send every 100ms on mouse drag
            path_to_send = {
                name: path.name,
                rgba: {
                    "red": 255,
                    "green": 255,
                    "blue": 255,
                    "opacity": 1
                },
                start: event.point,
                path: [],
                tool: activeTool
            };
        }
        else if (activeTool == "line" || activeTool == "rectangle" || activeTool == "triangle" || activeTool == "circle") {
            shapeStartPoint = point;
        }

        view.draw();


    }
    else if (activeTool == "select") {
        // Select item
        $("#myCanvas").css("cursor", "pointer");
        if (event.item) {
            // If holding shift key down, don't clear selection - allows multiple selections
            if (!event.event.shiftKey) {
                paper.project.activeLayer.selected = false;
            }
            if(event.item.image){ // check for image selection since it needs to be handled differently from item selection
                    selectionRectangle = new Path.Rectangle(event.item.bounds.topLeft,event.item.bounds.bottomRight);

                selectionRectangle.name = "selectionRectangle";
                selectionRectangle.selected = true;
                selectionRectangle.selectedImage = event.item;  // keep track of selected image data
                selectToolMode = "IMAGE_DRAG";
            } else if (selectionRectangle != null && event.item.name == "selectionRectangle"){  //image selected and now clicking on its selectionRectangle
               var hitResult = project.hitTest(event.point); // check in which part of the selectionRectangle is clicked by user
                selectionRectangle.selected = true;  //maintain the selected state of selectionRectangle
                if(hitResult.type == "segment"){  // clicked on corner of selectionRectangle. so user needs to resize the image
                    selectionRectangleScale = event.point.subtract(selectionRectangle.bounds.center).length; // original scale of image
                    selectToolMode = "IMAGE_RESIZE";
                }
                else if (hitResult.type == "stroke"){ // clicked on edge of selectionRectangle. so user needs to move the image
                    selectToolMode = "IMAGE_DRAG";
                }
            } else{ // an item selected not an image
                event.item.selected = true;
                selectToolMode = "ITEM_DRAG";
            }

            view.draw();
        } else {
            paper.project.activeLayer.selected = false;
        }
    }

    // send the position of cursor to other party of the class
    if (activeTool == "point") {
        socket.emit('pointing:start', room, uid, event.point);
    }
}

var item_move_delta;
var send_item_move_timer;
var item_move_timer_is_active = false;

function onMouseDrag(event) {

    mouseTimer = 0;
    clearInterval(mouseHeld);

    // Ignore middle or right mouse button clicks for now
    if (event.event.button == 1 || event.event.button == 2) {
        return;
    }

    if (activeTool == "draw" || activeTool == "pencil" || activeTool == "eraser" || activeTool == "line" || activeTool == "rectangle" || activeTool == "triangle" || activeTool == "circle") {
        var step = event.delta / 2;
        step.angle += 90;
        if (activeTool == "draw") {
            var top = event.middlePoint + step;
            var bottom = event.middlePoint - step;
        } else if (activeTool == "pencil") {
            var top = event.middlePoint;
            bottom = event.middlePoint;
        } else if (activeTool == "eraser") {
            var top = event.middlePoint + 10; // 10 is added since clicking point is taken as the top left corner of cursor_eraser
            var bottom = event.middlePoint + 10; // increase this size appropriately for a larger eraser
        }


        //path.smooth();
        if (activeTool == "line") {
            paper.project.activeLayer.lastChild.remove();
            shapeEndPoint = event.point;
            path = new Path.Line(shapeStartPoint, shapeEndPoint);
            path.name = uid + ":" + (paper_object_count);
            path.strokeColor = active_color_rgb;
            path.strokeWidth = 2;
            path_to_send.path = {
                start: shapeStartPoint,
                end: shapeEndPoint
            };
        }
        else if (activeTool == "rectangle") {
            paper.project.activeLayer.lastChild.remove();
            shapeEndPoint = event.point;
            path = new Path.Rectangle(shapeStartPoint, shapeEndPoint);
            path.name = uid + ":" + (paper_object_count);
            path.strokeColor = active_color_rgb;
            path.strokeWidth = 2;
            path_to_send.path = {
                start: shapeStartPoint,
                end: shapeEndPoint
            };
        }
        else if (activeTool == "triangle") {
            paper.project.activeLayer.lastChild.remove();
            shapeEndPoint = event.point;
            path = new Path();
            path.add(shapeStartPoint);
            path.add(shapeEndPoint);
            path.add(new Point(2 * shapeStartPoint.x - shapeEndPoint.x, shapeEndPoint.y));
            path.closed = true;
            path.name = uid + ":" + (paper_object_count);
            path.strokeColor = active_color_rgb;
            path.strokeWidth = 2;
            path_to_send.path = {
                start: shapeStartPoint,
                end: shapeEndPoint
            };
        }
        else if (activeTool == "circle") {
            paper.project.activeLayer.lastChild.remove();
            shapeEndPoint = event.point;
            path = new Path.Circle(new Point((shapeStartPoint.x + shapeEndPoint.x)/2, (shapeStartPoint.y + shapeEndPoint.y)/2), (shapeStartPoint - shapeEndPoint).length/2);
            path.name = uid + ":" + (paper_object_count);
            path.strokeColor = active_color_rgb;
            path.strokeWidth = 2;
            path_to_send.path = {
                start: shapeStartPoint,
                end: shapeEndPoint
            };
        }
        else {
            path.add(top);
            path.insert(0, bottom);
            // Add data to path
            path_to_send.path.push({
                top: top,
                bottom: bottom
            });
        }
        view.draw();


        // Send paths every 100ms
        if (!timer_is_active) {

            send_paths_timer = setInterval(function () {
                if ((activeTool != "line" && activeTool != "rectangle" && activeTool != "triangle" && activeTool != "circle") || path_to_send.path.start) {
                    socket.emit('draw:progress', room, uid, JSON.stringify(path_to_send));
                }
                else {
                    console.log("not send");
                }
                path_to_send.path = new Array();

            }, 100);

        }

        timer_is_active = true;
    }
    else if (activeTool == "select") {
        if (selectionRectangleScale != null && selectionRectangleScale > 0 && selectToolMode == "IMAGE_RESIZE") {
            // resize the selected image based on ratio change
            currentRatio = event.point.subtract(selectionRectangle.bounds.center).length/selectionRectangleScale;
            if(currentRatio < previousRatio){
                selectionRectangle.scale(1 - currentRatio*0.01, selectionRectangle.selectedImage.bounds.center);
                selectionRectangle.selectedImage.scale(1 - currentRatio*0.01,selectionRectangle.selectedImage.bounds.center);
                socket.emit('image:resize', room, uid, selectionRectangle.selectedImage.name, (1 - currentRatio*0.01));
            } else {
                selectionRectangle.scale(1 + 0.01*currentRatio,selectionRectangle.selectedImage.bounds.center);
                selectionRectangle.selectedImage.scale(1 + 0.01*currentRatio,selectionRectangle.selectedImage.bounds.center);
                socket.emit('image:resize', room, uid, selectionRectangle.selectedImage.name, (1 + currentRatio*0.01));
            }
            previousRatio = currentRatio;
            view.draw();
        }
        else if(selectToolMode == "IMAGE_DRAG"){
            // move selected image locally
            selectionRectangle.selectedImage.position += event.delta;
            selectionRectangle.position += event.delta;
        }
        else if (selectToolMode == "ITEM_DRAG"){
            // Move item locally
            for (x in paper.project.selectedItems) {
                var item = paper.project.selectedItems[x];
                item.position += event.delta;
            }
        }

        // Store delta
        if (paper.project.selectedItems) {
            if (!item_move_delta) {
                item_move_delta = event.delta;
            } else {
                item_move_delta += event.delta;
            }
        }

        // Send move updates every 50 ms
        if (!item_move_timer_is_active) {
            send_item_move_timer = setInterval(function () {
                if (item_move_delta && selectToolMode != "IMAGE_RESIZE") {
                    var itemNames = new Array();
                    for (x in paper.project.selectedItems) {
                        var item = paper.project.selectedItems[x];
                        if(item._name == "selectionRectangle")
                            itemNames.push(selectionRectangle.selectedImage.name);
                        else
                            itemNames.push(item._name);
                    }
                    socket.emit('item:move:progress', room, uid, itemNames, item_move_delta);
                    item_move_delta = null;
                }
            }, 50);
        }
        item_move_timer_is_active = true;
    }

    // send the position of cursor to other party of the class
    if (activeTool == "point") {
        socket.emit('pointing:start', room, uid, event.point);
    }
}


function onMouseUp(event) {
    if (paper.project.activeLayer.hasChildren())  // notifying user that he can undo now
        $('.buttonicon-undo').removeClass('disabled');

    if (activeTool != 'undo' && activeTool != 'redo' && redoStack.length > 0) {  // clearing redo stack after user restarts drawing
        $('.buttonicon-redo').addClass('disabled'); // notifying user that he can't redo now
        redoStack.length = 0;
    }

    // Ignore middle or right mouse button clicks for now
    if (event.event.button == 1 || event.event.button == 2) {
        return;
    }

    clearInterval(mouseHeld);

    if (activeTool == "line" || activeTool == "rectangle" || activeTool == "triangle" || activeTool == "circle") {
        shapeEndPoint = event.point;
        path_to_send.path = {
            start: shapeStartPoint,
            end: shapeEndPoint
        };
        path.closed = true;
        view.draw();

        socket.emit('draw:progress', room, uid, JSON.stringify(path_to_send));
        socket.emit('draw:end', room, uid, JSON.stringify(path_to_send));

        // Stop new path data being added & sent
        clearInterval(send_paths_timer);
        path_to_send.path = new Array();
        timer_is_active = false;
    }
    else if (activeTool == "draw" || activeTool == "pencil" || activeTool == "eraser") {
        // Close the users path
        path.add(event.point);
        path.closed = true;
        //path.smooth();
        view.draw();

        // Send the path to other users
        path_to_send.end = event.point;
        // This covers the case where paths are created in less than 100 seconds
        // it does add a duplicate segment, but that is okay for now.
        socket.emit('draw:progress', room, uid, JSON.stringify(path_to_send));
        socket.emit('draw:end', room, uid, JSON.stringify(path_to_send));

        // Stop new path data being added & sent
        clearInterval(send_paths_timer);
        path_to_send.path = new Array();
        timer_is_active = false;
    }
    else if (activeTool == "select") {
        // End movement timer
        clearInterval(send_item_move_timer);
        if (selectToolMode == "IMAGE_DRAG" || selectToolMode == "ITEM_DRAG") {
            // Send any remaining movement info
            var itemNames = new Array();
            for (x in paper.project.selectedItems) {
                var item = paper.project.selectedItems[x];
                if(item._name == "selectionRectangle")
                    itemNames.push(selectionRectangle.selectedImage.name);
                else
                    itemNames.push(item._name);
            }

            (item_move_delta) ? socket.emit('item:move:end', room, uid, itemNames, item_move_delta) : socket.emit('item:move:end', room, uid, itemNames, new Point(0, 0));
        }
        else if(selectionRectangleScale != null && selectionRectangleScale > 0 && selectToolMode == "IMAGE_RESIZE") {
            if(currentRatio < previousRatio){
                socket.emit('image:resize', room, uid, selectionRectangle.selectedImage.name, (1 - currentRatio*0.01));
            } else {
                socket.emit('image:resize', room, uid, selectionRectangle.selectedImage.name, (1 + currentRatio*0.01));
            }
        }
        item_move_delta = null;
        item_move_timer_is_active = false;
    }

    if(activeTool == "point"){
        socket.emit('pointing:end', room, uid);
    }

}

var key_move_delta;
var send_key_move_timer;
var key_move_timer_is_active = false;

function onKeyDown(event) {
    if (activeTool == "select") {
        var point = null;

        if (event.key == "up") {
            point = new paper.Point(0, -1);
        } else if (event.key == "down") {
            point = new paper.Point(0, 1);
        } else if (event.key == "left") {
            point = new paper.Point(-1, 0);
        } else if (event.key == "right") {
            point = new paper.Point(1, 0);
        }

        // Move objects 1 pixel with arrow keys
        if (point) {
            moveItemsBy1Pixel(point);
        }

        // Store delta
        if (paper.project.selectedItems && point) {
            if (!key_move_delta) {
                key_move_delta = point;
            } else {
                key_move_delta += point;
            }
        }

        // Send move updates every 100 ms as batch updates
        if (!key_move_timer_is_active && point) {
            send_key_move_timer = setInterval(function () {
                if (key_move_delta) {
                    var itemNames = new Array();
                    for (x in paper.project.selectedItems) {
                        var item = paper.project.selectedItems[x];
                        itemNames.push(item._name);
                    }
                    socket.emit('item:move:progress', room, uid, itemNames, key_move_delta);
                    key_move_delta = null;
                }
            }, 100);
        }
        key_move_timer_is_active = true;
    }
}

function onKeyUp(event) {

    if (event.key == "delete") {
        // Delete selected items
        var items = paper.project.selectedItems;
        if (items) {
            for (x in items) {
                var item = items[x];
                socket.emit('item:remove', room, uid, item.name);
                item.remove();
                view.draw();
            }
        }
    }

    if (activeTool == "select") {
        // End arrow key movement timer
        clearInterval(send_key_move_timer);
        if (key_move_delta) {
            // Send any remaining movement info
            var itemNames = new Array();
            for (x in paper.project.selectedItems) {
                var item = paper.project.selectedItems[x];
                itemNames.push(item._name);
            }
            socket.emit('item:move:end', room, uid, itemNames, key_move_delta);
        } else {
            // delta is null, so send 0 change
            socket.emit('item:move:end', room, uid, itemNames, new Point(0, 0));
        }
        key_move_delta = null;
        key_move_timer_is_active = false;
    }
}

function moveItemsBy1Pixel(point) {
    if (!point) {
        return;
    }

    if (paper.project.selectedItems.length < 1) {
        return;
    }

    // Move locally
    var itemNames = new Array();
    for (x in paper.project.selectedItems) {
        var item = paper.project.selectedItems[x];
        item.position += point;
        itemNames.push(item._name);
    }

    // Redraw screen for item position update
    view.draw();
}

// Drop image onto canvas to upload it
$('#myCanvas').bind('dragover dragenter', function (e) {
    e.preventDefault();
});

$('#myCanvas').bind('drop', function (e) {
    e = e || window.event; // get window.event if e argument missing (in IE)
    if (e.preventDefault) { // stops the browser from redirecting off to the image.
        e.preventDefault();
    }
    e = e.originalEvent;
    var dt = e.dataTransfer;
    var files = dt.files;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        uploadImage(file);
    }
});


// ---------------------------------
// CONTROLS EVENTS

var $color = $('.colorSwatch:not(#pickerSwatch)');
$color.on('click', function () {

    $color.removeClass('active');
    $(this).addClass('active');
    $('#activeColorSwatch').css('background-color', $(this).css('background-color'));
    update_active_color();

});

$('#pickerSwatch').on('click', function () {
    $('#myColorPicker').fadeToggle();
});
$('#settingslink').on('click', function () {
    $('#settings').fadeToggle();
});
$('#embedlink').on('click', function () {
    $('#embed').fadeToggle();
});
$('#importAsImage').on('click', function () {
    removeStylingFromTools();
    $('#importAsImaget').css({
        border: "1px solid orange"
    }); // set the selected tool css to show it as active
    $('#importexport').fadeToggle();
    if (redoStack.length > 0) {  // clearing redo stack after user restarts drawing
        $('.buttonicon-redo').addClass('disabled'); // notifying user that he can't redo now
        redoStack.length = 0;
    }
});

$('#exportSVG').on('click', function () {
    //this.href = document.getElementById('myCanvas').toDataURL('image/svg');
    exportSVG();
});
$('#exportPNG').on('click', function () {
    this.href = document.getElementById('myCanvas').toDataURL();
    //this.href = document.getElementById('myCanvas').toDataURL();
    //exportPNG();
});

$('#drawTool').on('click', function () {
    removeStylingFromTools();
    $('#drawTool > a').css({
        background: "orange"
    }); // set the selected tool css to show it as active
    activeTool = "draw";
    $('#myCanvas').css('cursor', 'pointer');
    paper.project.activeLayer.selected = false;
});

$('#pencilTool').on('click', function () {
    removeStylingFromTools();
    $('#pencilTool > a').css({
        background: "orange"
    }); // set the selected tool css to show it as active
    activeTool = "pencil";
    $('#myCanvas').css('cursor', 'pointer');
    paper.project.activeLayer.selected = false;
});
$('#eraserTool').on('click', function () {
    removeStylingFromTools();
    $('#eraserTool > a').css({
        background: "orange"
    }); // set the selected tool css to show it as active
    activeTool = "eraser";
    $('#myCanvas').css('cursor', 'url(/wb_assets/static/img/cursor_eraser.png),pointer');
    paper.project.activeLayer.selected = false;

});

$('#selectTool').on('click', function () {
    removeStylingFromTools();
    $('#selectTool').css({
        border: "1px solid orange"
    }); // set the selected tool css to show it as active
    activeTool = "select";
    $('#myCanvas').css('cursor', 'default');
});

$('#uploadImage').on('click', function () {
    removeStylingFromTools();
    $('#uploadImage').css({
        border: "1px solid orange"
    }); // set the selected tool css to show it as active
    /*$('#imageInput').click();*/
    $('#imgCroppingModal').modal('show');
});

$('#lineTool').on('click', function () {
    removeStylingFromTools();
    activeTool = "line";
    $('#myCanvas').css('cursor', 'pointer');
    $('#lineTool > a').css({
        background: "orange"
    }); // set the shapes tool css to show it as active
    paper.project.activeLayer.selected = false;
});

$('#rectangleTool').on('click', function () {
    removeStylingFromTools();
    $('#rectangleTool > a').css({
        background: "orange"
    }); // set the shapes tool css to show it as active
    activeTool = "rectangle";
    $('#myCanvas').css('cursor', 'pointer');
});

$('#triangleTool').on('click', function () {
   removeStylingFromTools();
    $('#triangleTool > a').css({
        background: "orange"
    }); // set the shapes tool css to show it as active
    activeTool = "triangle";
    $('#myCanvas').css('cursor', 'pointer');
});

$('#circleTool').on('click', function () {
    removeStylingFromTools();
    $('#circleTool > a').css({
        background: "orange"
    }); // set the shapes tool css to show it as active
    activeTool = "circle";
    $('#myCanvas').css('cursor', 'pointer');
});

$('#undoTool').on('click', function () {
    removeStylingFromTools();
    if (paper.project.activeLayer.hasChildren()) {
        $('#undoTool > a').css({
            background: "orange"
        }); // set the selecttool css to show it as active
        $('.buttonicon-redo').removeClass('disabled');
        activeTool = "undo";
        redoStack.push(paper.project.activeLayer.lastChild);
        socket.emit('undo', room, uid);
        paper.project.activeLayer.lastChild.remove();
        if (!paper.project.activeLayer.hasChildren())
            $('.buttonicon-undo').addClass('disabled');
        view.draw();
    }
});

$('#redoTool').on('click', function () {
    removeStylingFromTools();
    if (redoStack.length > 0) {
        $('#redoTool > a').css({
            background: "orange"
        }); // set the selecttool css to show it as active
        $('.buttonicon-undo').removeClass('disabled');
        activeTool = "redo";
        socket.emit('redo', room, uid);
        paper.project.activeLayer.addChild(redoStack.pop());
        if (redoStack.length == 0)
            $('.buttonicon-redo').addClass('disabled');
        view.draw();
    }
});

$('#pointTool').on('click', function () {
    removeStylingFromTools();
    $('#pointTool > a').css({
        background: "orange"
    }); // set the selected tool css to show it as active    activeTool = "point";
    $('#myCanvas').css('cursor', 'pointer');
    activeTool = "point";
    //console.log();
});

$('#documentLoadTool').on('click', function () {
    removeStylingFromTools();
    $('#documentLoadTool > a').css({
        background: "orange"
    }); // set the selected tool css to show it as active
    $('#fileBrowserModal').modal('show');
    /*//if there is no pdf file selected, open the file browser to select a file
    if(DEFAULT_URL == '' || DEFAULT_URL == null){
        $('#fileBrowserModal').modal('show');
    }
    //make document viewer visible
    else{
        /!*if (documentViewer.css('visibility') == 'hidden') {
            documentViewer.css('visibility', 'visible');
            //dynamically assigning the background color and image as in viewer.css #230. Otherwise
            //this background color for body tag will make conflicts with whiteboard
            body.css('background-color', '#404040');
            $('#myCanvas').css('top','32px'); // pull down the canvas so that we can still use pdfjs control buttons while editing on top of pdf
        }
        socket.emit('pdf:load', room, uid, DEFAULT_URL);*!/

        $('#fileBrowserModal').modal('show');
    }*/
});

/*//To write on pdf document
$('#documentEditTool').on('click',function(){
    if(IsPDFOn){
        clearCanvas();
        writeOnPdfDocument();
        socket.emit('pdf:edit', room, uid);
    }
});*/

/*
// page down of PDF
$('#toolbarViewerLeft .toolbarButton.pageDown').click(function(){
    if(IsPDFOn && paper.project.activeLayer.hasChildren()){
        clearCanvas();
    }
});

// page down of PDF
$('#toolbarViewerLeft .toolbarButton.pageUp').click(function(){
    if(IsPDFOn && paper.project.activeLayer.hasChildren()){
        clearCanvas();
    }
});

function writeOnPdfDocument(){
    if($('#myCanvas').css('z-index') <= 0){
        $('#myCanvas').css('z-index',2);
        console.log('now you can write on pdf');
    }
    else {
        $('#documentViewer').css('z-index',0);
        console.log('you can go to next page of pdf');
    }
}
*/

$('#documentRemoveTool').on('click', function(){
    /*if(IsPDFOn){
        IsPDFOn = false;
        socket.emit('pdf:hide', room, uid);
    }*/
    $('body').css('background-color', '');
    $('.pdf-controllers-container').css('display', 'none');
    socket.emit('pdf:hide', room, uid);
});

/*function hideDocumentViewer(){
    removeStylingFromTools();
    $('#documentRemoveTool > a').css({
        background: "orange"
    }); // set the selected tool css to show it as active
    var documentViewer = $('#documentViewer');
    var body = $('body');
    if (documentViewer.css('visibility') == 'visible') {
        documentViewer.css('visibility', 'hidden');
        body.css('background-color', '');
    }
}*/

$('#canvasClear').on('click', function(){
   // save the current pdf page state
    if(pageNum > 1){
        var base64 = document.getElementById('myCanvas').toDataURL();
        socket.emit('pdf:savePage', room, pageNum, base64);
    }
   clearCanvas();
});

function clearCanvas() {
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
    if (paper.project.activeLayer && paper.project.activeLayer.hasChildren()) {
        paper.project.activeLayer.removeChildren();
    }
    $('.buttonicon-undo').addClass('disabled');
    $('.buttonicon-redo').addClass('disabled');
    view.draw();
}

function exportSVG() {
    var svg = paper.project.exportSVG();
    encodeAsImgAndLink(svg);
}

// Encodes svg as a base64 text and opens a new browser window
// to the svg image that can be saved as a .svg on the users
// local filesystem. This skips making a round trip to the server
// for a POST.
function encodeAsImgAndLink(svg) {
    if ($.browser.msie) {
        // Add some critical information
        svg.setAttribute('version', '1.1');
        var dummy = document.createElement('div');
        dummy.appendChild(svg);
        window.winsvg = window.open('/static/html/export.html');
        window.winsvg.document.write(dummy.innerHTML);
        window.winsvg.document.body.style.margin = 0;
    } else {
        // Add some critical information
        svg.setAttribute('version', '1.1');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

        var dummy = document.createElement('div');
        dummy.appendChild(svg);

        var b64 = Base64.encode(dummy.innerHTML);

        //window.winsvg = window.open("data:image/svg+xml;base64,\n"+b64);
        var html = "<img style='height:100%;width:100%;' src='data:image/svg+xml;base64," + b64 + "' />"
        window.winsvg = window.open();
        window.winsvg.document.write(html);
        window.winsvg.document.body.style.margin = 0;
    }
}

// Encodes png as a base64 text and opens a new browser window
// to the png image that can be saved as a .png on the users
// local filesystem. This skips making a round trip to the server
// for a POST.
function exportPNG() {
    var canvas = document.getElementById('myCanvas');
    var html = "<img src='" + canvas.toDataURL('image/png') + "' />";
    if ($.browser.msie) {
        window.winpng = window.open('/static/html/export.html');
        window.winpng.document.write(html);
        window.winpng.document.body.style.margin = 0;
    } else {
        window.winpng = window.open();
        window.winpng.document.write(html);
        window.winpng.document.body.style.margin = 0;
    }

}

// User selects an image from the file browser to upload
$('#imageInput').bind('change', function (e) {
    // Get selected files
    var files = document.getElementById('imageInput').files;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        uploadImage(file);
    }
    if (redoStack.length > 0) {  // clearing redo stack after user restarts drawing
        $('.buttonicon-redo').addClass('disabled'); // notifying user that he can't redo now
        redoStack.length = 0;
    }
});

function uploadImage(file) {
    var reader = new FileReader();

    //attach event handler
    reader.readAsDataURL(file);
    $(reader).bind('loadend', function (e) {
        var bin = this.result;

        //Add to paper project here
        var raster = new Raster(bin);
        raster.position = view.center;
        raster.name = uid + ":" + (++paper_object_count);
        $('.buttonicon-undo').removeClass('disabled');
        socket.emit('image:add', room, uid, JSON.stringify(bin), raster.position, raster.name);
    });
}


function setPageToolsCSS(currentPageNumber){
    if(currentPageNumber != 0){ // currently editing a previous page
        $('#load-new-pg').addClass('disabled');
    } else {
        $('#load-new-pg').removeClass('disabled');
    }
    if((currentPageNumber == 0 && canvasClearedCount > 0) || (canvasClearedCount > 0 && currentPageNumber > 1)){
        $('#load-previous-pg').removeClass('disabled');
    }
    else
        $('#load-previous-pg').addClass('disabled');
    if((currentPageNumber == canvasClearedCount && currentPageNumber > 0) || (currentPageNumber >= 1)){
        $('#load-next-pg').removeClass('disabled');
    }
    else
        $('#load-next-pg').addClass('disabled');
}
// ---------------------------------
// SOCKET.IO EVENTS
socket.on('settings', function (settings) {
    processSettings(settings);
});

socket.on('draw:progress', function (artist, data) {

    // It wasn't this user who created the event
    if (artist !== uid && data) {
        progress_external_path(JSON.parse(data), artist);
    }

});

socket.on('draw:end', function (artist, data) {

    // It wasn't this user who created the event
    if (artist !== uid && data) {
        end_external_path(JSON.parse(data), artist);
    }

});

socket.on('user:connect', function (user_count) {
    console.log("user:connect");
    update_user_count(user_count);
});

socket.on('user:disconnect', function (user_count) {
    update_user_count(user_count);
});

socket.on('project:load', function (json, pageCount) {
    paper.project.activeLayer.remove();
    paper.project.importJSON(json.project);
    canvasClearedCount = pageCount;
    setPageToolsCSS(0);
    // Make color selector draggable
    $('#mycolorpicker').pep({});
    // Make sure the range event doesn't propogate to pep
    $('#opacityRangeVal').on('touchstart MSPointerDown mousedown', function (ev) {
        ev.stopPropagation();
    }).on('change', function (ev) {
        update_active_color();
    });

    view.draw();
    //$.get("../img/wheel.png");
});

socket.on('project:load:error', function () {
    $('#lostConnection').show();
});

socket.on('canvas:clear', function (clearedCount) {
    canvasClearedCount = clearedCount;
    redoStack.length = 0;
    setPageToolsCSS(0);
    clearCanvas();
});

socket.on('loading:start', function () {
    // console.log("loading:start");
    $('#loading').show();
});

socket.on('loading:end', function () {
    $('#loading').hide();
    $('#colorpicker').farbtastic(pickColor); // make a color picker
    // cake
    $('#canvasContainer').css("background-image", 'none');

});

socket.on('load:previousPage', function (json, previousPageNumber) {
    currentPageNumber = previousPageNumber;
    redoStack.length = 0;
    setPageToolsCSS(previousPageNumber);
    paper.project.activeLayer.remove();
    paper.project.importJSON(json.project);

    // Make color selector draggable
    $('#mycolorpicker').pep({});
    // Make sure the range event doesn't propogate to pep
    $('#opacityRangeVal').on('touchstart MSPointerDown mousedown', function (ev) {
        ev.stopPropagation();
    }).on('change', function (ev) {
        update_active_color();
    });

    view.draw();
});

socket.on('item:remove', function (artist, name) {
    if (artist != uid && paper.project.activeLayer._namedChildren[name][0]) {
        paper.project.activeLayer._namedChildren[name][0].remove();
        view.draw();
    }
});

socket.on('item:move', function (artist, itemNames, delta) {
    if (artist != uid) {
        for (x in itemNames) {
            var itemName = itemNames[x];
            if (paper.project.activeLayer._namedChildren[itemName] && paper.project.activeLayer._namedChildren[itemName][0] ) {
                paper.project.activeLayer._namedChildren[itemName][0].position += new Point(delta[1], delta[2]);
            }
        }
        view.draw();
    }
});

socket.on('image:add', function (artist, data, position, name) {
    if (artist != uid) {
        var image = JSON.parse(data);
        var raster = new Raster(image);
        raster.position = new Point(position[1], position[2]);
        raster.name = name;
        view.draw();
    }
});

socket.on('undo', function (artist) {
    if (artist != uid) {
        redoStack.push(paper.project.activeLayer.lastChild);
        paper.project.activeLayer.lastChild.remove();
        view.draw();
    }
});

socket.on('redo', function (artist) {
    if (artist != uid) {
        paper.project.activeLayer.addChild(redoStack.pop());
        view.draw();
    }
});

socket.on('image:resize', function (artist, imageName, scalingFactor) {
    if (artist != uid) {
        if (paper.project.activeLayer._namedChildren[imageName] && paper.project.activeLayer._namedChildren[imageName][0]) {
            paper.project.activeLayer._namedChildren[imageName][0].scale(scalingFactor);
        }
        view.draw();
    }
});

socket.on('pointing:start', function (artist, position) {
    if (artist != uid) {
        // reduced few pixels to adjust the cursor position perfectly
        $('#dummy-cursor').css({"top":(position[2] - 2) + 'px', "left":(position[1] - 10) + 'px', "display": "block"});
        view.draw();
    }
});

socket.on('pointing:end', function (artist, position) {
    if (artist != uid) {
        $('#dummy-cursor').css({"display": "none"});
        view.draw();
    }
});

socket.on('pdf:load', function (artist, file) {
    if (artist != uid) {

        if(file == DEFAULT_URL){
            console.log('Same file has been already open');
        }
        else {
            DEFAULT_URL = file;
            //PDFViewerApplication.open('/files/'+file);
            $('body').css('background-color', '#404040');
            $('.pdf-controllers-container').css('display', 'block');
            clearCanvas();
            testPDFInSameCanvas(file);
        }

        /*$('#myCanvas').css({'z-index':'0','top':'32px'});// pull down the canvas so that we can still use pdfjs control buttons while editing on top of pdf
        var documentViewer = $('#documentViewer');
        var body = $('body');
        if (documentViewer.css('visibility') == 'hidden') {
            documentViewer.css('visibility', 'visible');
            body.css('background-color', '#404040');
        }
        //else {
        //    documentViewer.css('visibility', 'hidden');
        //    body.css('background-color', '');
        //}
        IsPDFOn = true;*/
    }
});

//write on pdf document

socket.on('pdf:edit', function(artist){
    if(artist != uid){
        console.log('write on pdf');
        clearCanvas();
        writeOnPdfDocument();
    }
});

socket.on('pdf:hide', function(json){
    // no need to check for artist since both tutor and student need to load last page
    /*console.log('hide pdfviewer');
    clearCanvas();
    paper.project.importJSON(json.project);
    hideDocumentViewer();
    $('#myCanvas').css('top','0'); // pull up the canvas once the editing is done
    IsPDFOn = false;*/
    $('body').css('background-color', '');
    $('.pdf-controllers-container').css('display', 'none');
    clearCanvas();
    paper.project.importJSON(json.project);
});

socket.on('pdf:pageChange', function (artist, page) {
    if (artist != uid) {
        /*if(IsPDFOn && paper.project.activeLayer.hasChildren()){
            clearCanvas();
        }
        PDFViewerApplication.page = page;*/
        clearCanvas();
        renderPage(page);
    }
});


socket.on('pdf:zoom', function (artist, scale) {
    if (artist != uid) {
        console.log('change zoom level to '+scale);
        PDFViewerApplication.pdfViewer.currentScaleValue = scale;
    }
});

socket.on('pdf:presentationMode', function (artist) {
    if(artist != uid){
        console.log('entering presentation mode');
        //PDFViewerApplication.requestPresentationMode();
        var elem = $('documentViewer'); // Make the body go full screen.
        requestFullScreen(elem);
        $('body').addClass("sidebar-collapse");
    }
});

function requestFullScreen(element) {
    // Supports most browsers and their versions.
    var requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullscreen;

    if (requestMethod) { // Native full screen.
        requestMethod.call(element);
    } else if (typeof window.ActiveXObject !== "undefined") { // Older IE.
        var wscript = new ActiveXObject("WScript.Shell");
        if (wscript !== null) {
            wscript.SendKeys("{F11}");
        }
    }
}

// --------------------------------- 
// SOCKET.IO EVENT FUNCTIONS

// Updates the active connections
var $user_count = $('#online_count');

function update_user_count(count) {
    $user_count.text((count === 1) ? "1" : " " + count);
}

var external_paths = {};

// Ends a path
var end_external_path = function (points, artist) {
    prevpath = null;
    var path = external_paths[artist];
    if (path) {
        //path = new Path.Line(new Point(points.path.start[1], points.path.start[2]), new Point(points.path.end[1], points.path.end[2]));
        path.closed = true;
        //view.draw();
        external_paths[artist] = false;
    }
};

// Continues to draw a path in real time
var prevpath = null;
var progress_external_path = function (points, artist) {
    var color = new RgbColor(points.rgba.red, points.rgba.green, points.rgba.blue, points.rgba.opacity);
    if (points.tool == "line") {
        if (prevpath) {
            prevpath.remove();
        }
        path = external_paths[artist];
        if (!path) {
            //  // Creates the path in an easy to access way
            external_paths[artist] = new Path();
            path = external_paths[artist];
        }
        var line = new Path.Line(new Point(points.path.start[1], points.path.start[2]), new Point(points.path.end[1], points.path.end[2]));
        line.strokeColor = color;
        line.strokeWidth = 2;
        line.name = points.name;
        path = line;
        prevpath = path;


    }
    else if (points.tool == "rectangle") {
        if (prevpath) {
            prevpath.remove();
        }
        path = external_paths[artist];

        if (!path) {
            // Creates the path in an easy to access way
            external_paths[artist] = new Path();
            path = external_paths[artist];
        }
        var rectangle = new Path.Rectangle(new Point(points.path.start[1], points.path.start[2]), new Point(points.path.end[1], points.path.end[2]));
        rectangle.strokeColor = color;
        rectangle.strokeWidth = 2;
        rectangle.name = points.name;
        path = rectangle;
        prevpath = path;
    }
    else if (points.tool == "triangle") {
        if (prevpath) {
            prevpath.remove();
        }
        path = external_paths[artist];

        if (!path) {
            // Creates the path in an easy to access way
            external_paths[artist] = new Path();
            path = external_paths[artist];
        }
        var triangle = new Path();
        triangle.add(new Point(points.path.start[1], points.path.start[2]));
        triangle.add(new Point(points.path.end[1], points.path.end[2]));
        triangle.add(new Point(2 * points.path.start[1] - points.path.end[1], points.path.end[2]));
        triangle.closed = true;
        triangle.strokeColor = color;
        triangle.strokeWidth = 2;
        triangle.name = points.name;
        path = triangle;
        prevpath = path;
    }
    else if (points.tool == "circle") {
        if (prevpath) {
            prevpath.remove();
        }
        path = external_paths[artist];

        if (!path) {
            // Creates the path in an easy to access way
            external_paths[artist] = new Path();
            path = external_paths[artist];
        }
        var circle = new Path.Circle(new Point((points.path.start[1] + points.path.end[1])/2, (points.path.start[2] + points.path.end[2])/2), (new Point(points.path.start[1], points.path.start[2]) - new Point(points.path.end[1], points.path.end[2])).length/2);
        circle.strokeColor = color;
        circle.strokeWidth = 2;
        circle.name = points.name;
        path = circle;
        prevpath = path;
    }
    else {
        var path = external_paths[artist];

        // The path hasn't already been started
        // So start it
        if (!path) {

            // Creates the path in an easy to access way
            external_paths[artist] = new Path();
            path = external_paths[artist];

            // Starts the path
            var start_point = new Point(points.start[1], points.start[2]);

            if (points.tool == "draw") {
                path.fillColor = color;
            } else if (points.tool == "pencil") {
                path.strokeColor = color;
                path.strokeWidth = 2;
            }
            else if (points.tool == "eraser") {
                path.strokeColor = color;
                path.strokeWidth = 15;
            }
            if (points.tool == "line") {
                //start_point = new Line();
                //path.add(points.path);
            }
            else {
                path.name = points.name;
                path.add(start_point);
            }

        }

        // Draw all the points along the length of the path
        var paths = points.path;
        var length = paths.length;
        for (var i = 0; i < length; i++) {

            path.add(new Point(paths[i].top[1], paths[i].top[2]));
            path.insert(0, new Point(paths[i].bottom[1], paths[i].bottom[2]));

        }
    }

    view.draw();

};

function processSettings(settings) {

    $.each(settings, function (k, v) {

        // Handle tool changes
        if (k === "tool") {
            $('.buttonicon-' + v).click();
        }

    })

}

// Periodically save drawing
setInterval(function () {
    saveDrawing();
}, 1000);

function saveDrawing() {
    var canvas = document.getElementById('myCanvas');
    // Save image to localStorage
    //localStorage.setItem("drawingPNG" + room, canvas.toDataURL('image/png'));
}
