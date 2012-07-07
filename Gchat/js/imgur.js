(function () {
    var key = "93eb20147bc8173d58e9a3aa72b927b0";
    var uploadUrl = "http://api.imgur.com/2/upload.json";
    var Imaging = Windows.Graphics.Imaging;
    var maxWidth = 640;
    var maxHeight = 480;

    function resize(file, size, contentType, rawStream) {
        // Keep data in-scope across multiple asynchronous methods
        var bitmapEncoder;
        var bitmapDecoder;
        var fileStream;

        var scaledWidth, scaledHeight;

        return new WinJS.Promise(function (s, e, p) {
            var memoryStream = new Windows.Storage.Streams.InMemoryRandomAccessStream();

            var decoderPromise;
            
            if (rawStream) {
                fileStream = file;
                decoderPromise = Imaging.BitmapDecoder.createAsync(file);
            } else {
                decoderPromise = file.openAsync(Windows.Storage.FileAccessMode.read).then(function (stream) {
                    fileStream = stream;
                    return Imaging.BitmapDecoder.createAsync(stream);
                }, e);
            }
            
            return decoderPromise.then(function (decoder) {
                bitmapDecoder = decoder;

                if (bitmapDecoder.pixelWidth <= maxWidth && bitmapDecoder.pixelHeight <= maxHeight) {
                    s({ type: file.contentType, stream: fileStream });
                } else {
                    scaledWidth = Math.min(maxWidth, bitmapDecoder.pixelWidth);
                    scaledHeight = bitmapDecoder.pixelHeight * scaledWidth / bitmapDecoder.pixelWidth;

                    if (scaledHeight > maxHeight) {
                        scaledHeight = maxHeight;
                        scaledWidth = bitmapDecoder.pixelWidth * scaledHeight / bitmapDecoder.pixelHeight;
                    }

                    Imaging.BitmapEncoder.createForTranscodingAsync(memoryStream, decoder).then(function (encoder) {
                        bitmapEncoder = encoder;

                        bitmapEncoder.bitmapTransform.scaledWidth = scaledWidth;
                        bitmapEncoder.bitmapTransform.scaledHeight = scaledHeight;

                        bitmapEncoder.flushAsync().then(function () {
                            if (memoryStream.size < size) {
                                s({ type: "image/jpeg", stream: memoryStream });
                            } else {
                                s({ type: contentType, stream: fileStream });
                            }
                        }, function (err) {
                            Console.log("Resize failed. try doing it");
                            s({ type: file.contentType, stream: fileStream });
                        });
                    }, e);
                }
            }, e);
        });
    };

    WinJS.Namespace.define('Kupo.Imgur', {
        upload: function (file, size, contentType) {
            var reader;
            var image;
            return new WinJS.Promise(function (s, e, p) {
                resize(file, size || file.size, contentType || file.contentType, !!size && !!contentType).then(function (img) {
                    image = img;
                    reader = new Windows.Storage.Streams.DataReader(image.stream.getInputStreamAt(0));

                    reader.loadAsync(image.stream.size).then(function () {
                        var buffer = reader.readBuffer(image.stream.size);

                        var requestString =
                            "image=" + encodeURIComponent(Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(buffer)) + "&" +
                            "type=" + encodeURIComponent(image.type) + "&" +
                            "key=" + encodeURIComponent(key);

                        WinJS.xhr({
                            type: 'POST',
                            url: uploadUrl,
                            headers: { 'Content-Length': requestString.length, 'Content-Type': "application/x-www-form-urlencoded" },
                            data: requestString
                        }).then(function (response) {
                            var json = JSON.parse(response.responseText);

                            s(json.upload.links);
                        }, e);
                    }, e);
                }, e);
            });
        }
    });
})();