/**
 * Created by buddhikajay on 5/25/16.
 */

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
