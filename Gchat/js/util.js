(function () {
    function formatTime(date) {
        var time = new Date(date);
        var now = new Date(Date.now());
        var result = '';
        if (time.getDate() === now.getDate() && time.getMonth() === now.getMonth() && time.getFullYear() === now.getFullYear()) {
            // same day, just return time
            return time.format('g:ia');
        } else {
            return time.format('n/j g:ia');
        }
    }

    function format(text) {
        var italics = [-1];
        var bold = [-1];
        var pos = [0];

        var result = "";

        for (var i = 0; i < text.length; i++) {
            if (text[i] == '_') {
                result += formatHelper(text, i, italics, bold, pos, '_', italics);
            } else if (text[i] == '*') {
                result += formatHelper(text, i, italics, bold, pos, '*', bold);
            }
        }

        if (pos[0] <= text.length - 1) {
            result += text.substring(pos[0])
        }

        return result;
    }

    function formatHelper(text, i, italics, bold, pos, character, checking) {
        var open = " \n\t*_-";
        var close = " \n\t.,!*_-";

        var result = "";

        if (checking[0] == -1 && (i == 0 || open.indexOf(text[i - 1]) != -1)) {
            // good candidate for format-start!

            for (var j = i + 2; j < text.length; j++) {
                if (text[j] == character && (j == text.length - 1 || close.indexOf(text[j + 1]) != -1)) {
                    // i -> j is format.

                    if (italics[0] != -1 && bold[0] != -1) {
                        result = "<i><b>" + text.substring(pos[0], i) + "</b></i>";
                    } else if (italics[0] != -1) {
                        result = "<i>" + text.substring(pos[0], i) + "</i>";
                    } else if (bold[0] != -1) {
                        result = "<b>" + text.substring(pos[0], i) + "</b>";
                    } else {
                        result = text.substring(pos[0], i);
                    }

                    pos[0] = i + 1;
                    checking[0] = j;
                    break;
                }
            }
        } else if (i == checking[0]) {
            // end of format. flush the buffer.

            if (italics[0] != -1 && bold[0] != -1) {
                result = "<i><b>" + text.substring(pos[0], i) + "</b></i>";
            } else if (italics[0] != -1) {
                result = "<i>" + text.substring(pos[0], i) + "</i>";
            } else if (bold[0] != -1) {
                result = "<b>" + text.substring(pos[0], i) + "</b>";
            } else {
                result = text.substring(pos[0], i);
            }

            pos[0] = i + 1;
            checking[0] = -1;
        }

        return result;
    }

    WinJS.Namespace.define('Kupo', {
        unformatMessage: function (message) {
            var result = "";

            for (var i = 0; i < message.length; i++) {
                switch (message[i]) {
                    case "☺":
                        result += ":-)";
                        break;
                    case "☹":
                        result += ":-(";
                        break;
                    case "❤":
                        result += "<3";
                        break;
                    default:
                        if (message.charCodeAt(i) == 0xD83D && i < message.length - 1) {
                            // might be one of the faces!
                            switch (message.charCodeAt(i + 1)) {
                                case "😉".charCodeAt(1):
                                    result += ";-)";
                                    i++;
                                    break;
                                case "😁".charCodeAt(1):
                                    result += ":-D";
                                    i++;
                                    break;
                                case "😋".charCodeAt(1):
                                    result += ":-P";
                                    i++;
                                    break;
                                case "😖".charCodeAt(1):
                                    result += ":-S";
                                    i++;
                                    break;
                                case "😏".charCodeAt(1):
                                    result += ":-/";
                                    i++;
                                    break;
                                case "😐".charCodeAt(1):
                                    result += ":-|";
                                    i++;
                                    break;
                                case "😥".charCodeAt(1):
                                    result += ":'(";
                                    i++;
                                    break;
                                default:
                                    result += message[i];
                            }
                        } else {
                            result += message[i];
                        }
                        break;
                }
            }

            return result;
        },

        formatMessage: function (messageObject) {
            var paragraph = "";
            var last = 0;
            var m = null;
            var regexp = /(?:(\B(?:;-?\)|:-?\)|:-?D|:-?P|:-?S|:-?\/|:-?\||:'\(|:-?\(|<3))|(https?:\/\/)?(([0-9]{1-3}\.[0-9]{1-3}\.[0-9]{1-3}\.[0-9]{1-3})|([a-z0-9.-]+\.[a-z]{2,4}))(\/[-a-z0-9+&@#\\/%?=~_|!:,.;]*(?:\([-a-z0-9+&@#\\/%?=~_|!:,.;()]*[-a-z0-9+@#\\/%=~_|)]|[-a-z0-9+@#\\/%=~_|]))?)/ig;
            var message = messageObject.message;

            var imgurUris = [];

            while ((m = regexp.exec(message)) != null) {
                if (m.index > last) {
                    paragraph += format(message.substring(last, m.index));
                }

                if (m[1] !== undefined) {
                    var smiley = m[1].toUpperCase();

                    switch (smiley) {
                        case ":)":
                        case ":-)":
                            smiley = "☺";
                            break;
                        case ";)":
                        case ";-)":
                            smiley = "😉";
                            break;
                        case ":D":
                        case ":-D":
                            smiley = "😁";
                            break;
                        case ":P":
                        case ":-P":
                            smiley = "😋";
                            break;
                        case ":S":
                        case ":-S":
                            smiley = "😖";
                            break;
                        case ":/":
                        case ":-/":
                            smiley = "😏";
                            break;
                        case ":|":
                        case ":-|":
                            smiley = "😐";
                            break;
                        case ":'(":
                            smiley = "😥";
                            break;
                        case ":(":
                        case ":-(":
                            smiley = "☹";
                            break;
                        case"<3":
                            smiley = "❤";
                            break;
                    }

                    paragraph += smiley;
                } else {
                    var uri = m[0];

                    if (uri.indexOf("ra.ge/") == 0) {
                        var rageUri = "/images/ragefaces/emoticon.rage." + uri.substring(6).replace("!", "_") + ".png";
                        paragraph += "<img src=\"" + rageUri + "\" alt=\"" + uri.substring(6) + "\" />";
                    } else {
                        if (uri.indexOf("http://") != 0 && uri.indexOf("https://") != 0) {
                            uri = "http://" + uri;
                        }

                        // TODO: Investigate why this crashes instead of just ignoring the error.
                        paragraph += "<a href=\"" + uri + "\">" + m[0] + "</a>";

                        if (uri.indexOf("http://i.imgur.com/") == 0) {
                            imgurUris.push(uri);
                        }
                    }
                }

                last = m[0].length + m.index;
            }

            if (last != message.length) {
                paragraph += format(message.substring(last));
            }

            if (imgurUris.length > 0) {
                for (var i = 0; i < imgurUris.length; i++) {
                    var photoUri = imgurUris[i];

                    var uriString = photoUri;

                    if (uriString.Length == 28) {
                        uriString = uriString.substring(0, 24) + "s.jpg";
                    }

                    paragraph += "<a class=\"imgurThumbnail\" href=\"" + photoUri + "\"><img src=\"" + uriString + "\" alt=\"" + photoUri + "\" /></a>";
                }
            }

            paragraph += "<div class=\"date\">" + formatTime(messageObject.date) + "</div>";

            return paragraph;
        }
    });
})();