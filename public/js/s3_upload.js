function uploadToS3(file, signedRequest, url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', signedRequest);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                console.log('Upload success: ' + url);
                callback(url);
            } else {
                alert('Could not upload file.');
            }
        }
    };

    xhr.send(file);
}

function uploadFile(file, callback) {
    var xhr = new XMLHttpRequest();
    // Make unique filename (encoded with current time) and get signed request
    xhr.open('GET', `/sign-s3?file-name=${encodeURIComponent((new Date).getTime())}&file-type=${encodeURIComponent(file.type)}`);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                var response = JSON.parse(xhr.responseText);
                uploadToS3(file, response.signedRequest, response.url, callback);
            } else {
                alert('Could not get signed URL.');
            }
        }
    };

    xhr.send();
}
