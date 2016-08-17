/**
 * Created by thilina on 8/17/16.
 */
var croppedImg = null;

$('.img-container > img').cropper({
    viewMode: 1,
    dragMode: 'move',
    built: function () {

    }
});

function getCroppedImage(){
    var cropBox = $('#croppingImg').cropper('getCropBoxData');
    var canvas = $('#croppingImg').cropper('getCroppedCanvas',{
        width: cropBox.width,
        height: cropBox.height
    });
    croppedImg = canvas.toDataURL();
    $('#imgCropped').trigger('click');
    $('#imgCroppingModal').modal('hide');
}

function updateCropperCanvas(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();

        reader.onload = function (e) {
            $('#croppingImg').attr('src', e.target.result);
            $('#croppingImg').cropper('getCroppedCanvas');
        };

        reader.readAsDataURL(input.files[0]);
    }
}