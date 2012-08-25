(function () {
    'use strict';

    WinJS.Namespace.define('Console', {
        init: function () {
            var con = document.createElement('div');
            con.id = 'console';
            con.style.position = 'fixed';
            con.style.bottom = '0';
            con.style.left = '0';
            con.style.width = '100%';
            con.style.height = '250px';
            con.style.background = '#111';
            con.style.color = '#4cff00';
            con.style.width = '100%';
            con.style.height = '240px';
            con.style.overflowY = 'scroll';
            con.style.display = 'none';
            con.style.borderTop = '1px solid #444';
            con.style.opacity = '0.95';
            con.style.fontFamily = 'monospace';
            con.style.zIndex = 9001;

            document.body.appendChild(con);

            con.appendChild(document.createTextNode("Kupo console"));
            con.appendChild(document.createElement("br"));
            con.appendChild(document.createElement("br"));

            document.addEventListener('keyup', function (evt) {
                // F12, just like in Quake!
                if (event.keyCode == 123) {
                    document.getElementById('console').style.display = (document.getElementById('console').style.display == 'none') ? 'block' : 'none';
                    document.getElementById('console').scrollTop = document.getElementById('console').scrollHeight;
                }
            });
        },

        log: function (msg) {
            if (!document.getElementById('console')) {
                Console.init();
            }

            window.console.log(msg);

            var console = document.getElementById('console');
            msg = ("" + msg).split("\n");
            console.appendChild(document.createTextNode("> " + (msg[0])));
            for (var i = 1; i < msg.length; i++) {
                console.appendChild(document.createElement("br"));
                console.appendChild(document.createTextNode("  " + (msg[i])));
            }
            console.appendChild(document.createElement("br"));
            console.style.display = 'block';
            console.scrollTop = console.scrollHeight;
        }
    });
})();