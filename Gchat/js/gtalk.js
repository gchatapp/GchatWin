(function () {
    'use strict';

    function xmlEscape(str) {
        return str.replace(/&/g, '&amp;')
		    .replace(/'/g, '&apos;')
		    .replace(/"/g, '&quot;')
		    .replace(/</g, '&lt;')
		    .replace(/>/g, '&gt;');
    }

    var Gtalk = WinJS.Class.define(function () {
        this.jid = null;
        this.username = null;
        this.server = null;
        this.rosterListeners = [];
        this.messageListeners = [];
        this.statusListeners = [];
        this.gtalk = null;
        this.iqCallbacks = {};
        this.iqCounter = 0;
        this.roster = new Kupo.Roster(this);
        this.conversations = {};
        this.sharedStatus = {};
    }, {
        addEventListener: function (name, callback) {
            if (name == 'roster') {
                if (this.rosterListeners.indexOf(callback) == -1) {
                    this.rosterListeners.push(callback);
                }
            } else if (name == 'message') {
                if (this.messageListeners.indexOf(callback) == -1) {
                    this.messageListeners.push(callback);
                }
            } else if (name == 'status') {
                if (this.statusListeners.indexOf(callback) == -1) {
                    this.statusListeners.push(callback);
                }
            }
        },

        sendMessage: function (to, message) {
            if (message.otr) {
                this.gtalk.write("<message type='chat' from='" + this.jid + "' to='" + to + "'><active xmlns='http://jabber.org/protocol/chatstates'/><body>" + xmlEscape(message.message) + "</body><nos:x value='enabled' xmlns:nos='google:nosave' /><arc:record otr='true' xmlns:arc='http://jabber.org/protocol/archive' /></message>");
            } else {
                this.gtalk.write("<message type='chat' from='" + this.jid + "' to='" + to + "'><active xmlns='http://jabber.org/protocol/chatstates'/><body>" + xmlEscape(message.message) + "</body><nos:x value='disabled' xmlns:nos='google:nosave' /><arc:record otr='false' xmlns:arc='http://jabber.org/protocol/archive' /></message>");
            }
        },

        otr: function (jid, enabled) {
            var id = "otr_" + (this.iqCounter++);
            this.gtalk.write("<iq type='set' to='" + this.username + "' id='" + id + "'><query xmlns='google:nosave'><item xmlns='google:nosave' jid='" + jid + "' value='" + (enabled ? "enabled" : "disabled") + "'/></query></iq>");
        },

        login: function (username, password) {
            var gtalk = this.gtalk = new XMPP.Xmpp();

            var first = true;
            var self = this;
        
            return new WinJS.Promise(function (s, e, p) {
                gtalk.addEventListener('log', Console.log);
                gtalk.addEventListener('message', function (str) {
                    if (first) {
                        first = false;
                        gtalk.write("<iq type='set' id='bind_resource'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><resource>kupo.</resource></bind></iq>");
                    }

                    Console.log(str);

                    var doc = $(str);
                    var tagName = doc.get(0).tagName

                    if (tagName == 'IQ') {
                        var iq = doc.first('iq');
                        var id = iq.attr('id');

                        if (id == "bind_resource") {
                            self.jid = (doc.find('bind jid').get(0).innerText);
                            self.username = self.jid.split('/')[0];
                            self.server = self.username.split('@')[1];

                            gtalk.write("<iq to='" + self.server + "' type='set' id='session'><session xmlns='urn:ietf:params:xml:ns:xmpp-session'/></iq>");
                        } else if (id == 'session') {
                            gtalk.write("<iq type='get' id='roster'><query xmlns='jabber:iq:roster'/></iq>");
                        } else if (id == 'roster') {
                            var items = iq.find('item');

                            for (var i = 0; i < items.length; i++) {
                                var rosterEvent = {
                                    jid: items.get(i).attributes.jid.value,
                                    name: items.get(i).attributes.name ? items.get(i).attributes.name.value : items.get(i).attributes.jid.value.split("/")[0],
                                    show: 'offline',
                                    status: '',
                                    otr: false,
                                    photo: null
                                };

                                self.roster.update(rosterEvent).then(function (data) {
                                    for (var j = 0; j < self.rosterListeners.length; j++) {
                                        self.rosterListeners[j](data);
                                    }
                                }, Console.log);
                            }

                            gtalk.write("<iq type='get' to='" + self.username + "' id='shared-status'><query xmlns='google:shared-status' version='2'/></iq>");
                            gtalk.write("<iq type='get' to='" + self.username + "' id='otr'><query xmlns='google:nosave'/></iq>");
                        } else if (id == 'otr') {
                            var items = iq.get(0).getElementsByTagName('nos:item');

                            for (var i = 0; i < items.length; i++) {
                                self.roster.get(items[i].attributes.jid.value).otr = items[i].attributes.value.value == 'enabled';

                                if (self.roster.get(items[i].attributes.jid.value).otr) {
                                    var message = {
                                        date: new Date(),
                                        event: 'otr ' + items[i].attributes.value.value,
                                        from: items[i].attributes.jid.value
                                    };

                                    self.conversation(items[i].attributes.jid.value).push(message);
                                }
                            }

                            gtalk.write("<iq type='get' to='" + self.server + "' id='disco'><query xmlns='http://jabber.org/protocol/disco#info'/></iq>");
                        } else if (id == 'disco') {
                            gtalk.write("<iq type='get' to='" + self.username + "' id='jingle-request'><query xmlns='google:jingleinfo'/></iq>");
                        } else if (id == 'jingle-request') {
                            gtalk.write("<presence><caps:c node=\"http://mail.google.com/xmpp/client/caps\" ver=\"1.1\" ext=\"voice-v1\" xmlns:caps=\"http://jabber.org/protocol/caps\" /></presence>");
                        } else if (self.iqCallbacks[id]) {
                            self.iqCallbacks[id](doc);
                            delete self.iqCallbacks[id];
                        } else if (iq.find('query').length != 0) {
                            if (iq.find('query').attr('xmlns') == 'google:nosave') {
                                var items = iq.find('item');

                                for (var i = 0; i < items.length; i++) {
                                    var enabled = items[i].attributes.value.value == 'enabled';

                                    if (self.roster.get(items[i].attributes.jid.value).otr != enabled) {
                                        self.roster.get(items[i].attributes.jid.value).otr = enabled;

                                        var message = {
                                            date: new Date(),
                                            event: 'otr ' + items[i].attributes.value.value,
                                            from: items[i].attributes.jid.value
                                        };

                                        self.conversation(items[i].attributes.jid.value).push(message);

                                        for (var j = 0; j < self.messageListeners.length; j++) {
                                            self.messageListeners[j](message);
                                        }
                                    }
                                }
                            } else if (iq.find('query').attr('xmlns') == 'google:shared-status') {
                                self.sharedStatus.status = iq.find('query > status').html();
                                self.sharedStatus.show = iq.find('query > show').html();
                                self.sharedStatus.invisible = iq.find('invisible').attr('value') == 'true';
                                self.sharedStatus.default = iq.find('status-list[show="default"] status').map(function (idx, elm) {
                                    return elm.firstChild ? elm.firstChild.nodeValue : '';
                                }).get();
                                self.sharedStatus.dnd = iq.find('status-list[show="dnd"] status').map(function (idx, elm) {
                                    return elm.firstChild ? elm.firstChild.nodeValue : '';
                                }).get();

                                if (self.sharedStatus.invisible) {
                                    self.sharedStatus.image = '/images/offline.png';
                                } else if (self.sharedStatus.image != '/images/away.png') {
                                    if (self.sharedStatus.show == 'dnd') {
                                        self.sharedStatus.image = '/images/busy.png';
                                    } else {
                                        self.sharedStatus.image = '/images/available.png';
                                    }
                                }

                                for (var i = 0; i < self.statusListeners.length; i++) {
                                    self.statusListeners[i](self.sharedStatus);
                                }
                            }
                        }
                    } else if (tagName == 'MESSAGE') {
                        var message = {
                            from: doc.attr('from'),
                            to: doc.attr('to'),
                            date: new Date(),
                            direction: 'in',
                            message: doc.get(0).firstChild.nodeValue,
                            otr: (doc.get(0).getElementsByTagName('arc:record').length != 0 && doc.get(0).getElementsByTagName('arc:record')[0].attributes.otr) ? doc.get(0).getElementsByTagName('arc:record')[0].attributes.otr.value : false
                        };

                        self.conversation(message.from).push(message);

                        for (var j = 0; j < self.messageListeners.length; j++) {
                            self.messageListeners[j](message, doc);
                        }
                    } else if (tagName == 'PRESENCE') {
                        var presenceEvent = {
                            jid: doc.attr('from'),
                            show: (doc.attr('type') == 'unavailable') ? 'offline' : ((doc.find('show').length && doc.find('show').get(0).firstChild) ? doc.find('show').get(0).firstChild.nodeValue : 'available'),
                            status: (doc.find('status').length && doc.find('status').get(0).firstChild) ? doc.find('status').get(0).firstChild.nodeValue : '',
                            photo: (doc.find('photo').length && doc.find('photo').get(0).firstChild) ? doc.find('photo').get(0).firstChild.nodeValue : null,
                            priority: (doc.find('priority').length && doc.find('priority').get(0).firstChild) ? doc.find('priority').get(0).firstChild.nodeValue : 0
                        };

                        if (presenceEvent.show == 'default') {
                            presenceEvent.show = 'available';
                        } else if (presenceEvent.show == 'dnd') {
                            presenceEvent.show = 'busy';
                        } else if (presenceEvent.show == 'xa') {
                            presenceEvent.show = 'away';
                        }

                        if (presenceEvent.jid.indexOf(self.username) != 0) {
                            self.roster.update(presenceEvent).then(function (data) {
                                for (var j = 0; j < self.rosterListeners.length; j++) {
                                    self.rosterListeners[j](data);
                                }
                            }, Console.log);
                        }
                    }
                });

                gtalk.addEventListener('disconnect', function (str) {
                    Console.log(str);
                });

                gtalk.login(username, password).then(function (err) {
                    if (err == "ok") {
                        gtalk.connect().then(function (err) {
                            if (err == "ok") {
                                s();
                            } else {
                                e("connect " + err);
                            }
                        });
                    } else {
                        e(err);
                    }
                });
            });
        },

        logout: function () {
            this.gtalk.close();
            this.gtalk = null;
        },

        photo: function (jid) {
            var self = this;

            return new WinJS.Promise(function (s, e, p) {
                var id = "photo_" + (self.iqCounter++);

                var msg = "<iq to='" + jid + "' type='get' id='" + id + "'><vCard xmlns='vcard-temp'/></iq>";

                Console.log("sending vcard request " + msg);

                self.iqCallbacks[id] = function (iq) {
                    if (iq.attr('type') == 'error' || !iq.find('BINVAL').length) {
                        Console.log("invalid vCard" + iq.vCard);
                        e();
                    } else {
                        s(iq.find('BINVAL').get(0).innerText);
                    }
                };

                self.gtalk.write(msg);
            });
        },

        conversation: function (email) {
            var idx = email.indexOf('/');
            if (idx != -1) {
                email = email.substring(0, idx);
            }

            if (!this.conversations[email]) {
                this.conversations[email] = [];
            }

            return this.conversations[email];
        },

        save: function (settings) {
            settings['gtalk_conversations'] = JSON.stringify(this.conversations);
            this.roster.save(settings);
        },

        restore: function (settings) {
            this.conversations = JSON.parse(settings['gtalk_conversations'] || "{}");
            return this.roster.restore(settings);
        },

        status: function (show, status) {
            if (status !== null) {
                this.sharedStatus.status = status;

                var source;
                if (show == 'busy') {
                    source = this.sharedStatus.dnd;
                } else {
                    source = this.sharedStatus.default;
                }

                var idx = source.indexOf(status);

                if (idx != 0) {
                    if (idx > 0) {
                        source.splice(idx, 1);
                    }
                    source.unshift(status);
                    if (source.length > 5) {
                        source.pop();
                    }
                }
            }

            if (show !== null) {
                this.sharedStatus.invisible = false;
                this.sharedStatus.presence = '';
                this.sharedStatus.image = undefined;

                if (show == 'away') {
                    this.sharedStatus.presence = 'away';
                    this.sharedStatus.image = '/images/away.png';

                    this.gtalk.write('<presence><show>away</show></presence>');
                } else {
                    if (show == 'available') {
                        this.sharedStatus.show = 'default';
                    } else if (show == 'busy') {
                        this.sharedStatus.show = 'dnd';
                    } else if (show == 'invisible') {
                        this.sharedStatus.invisible = true;
                    }

                    this.gtalk.write('<presence />');
                }
            }

            var id = "ss_" + (this.iqCounter++);
            var msg = "<iq type='set' id='" + id + "'><query xmlns='google:shared-status' version='2'>" +
            "<status>" + xmlEscape(this.sharedStatus.status) + "</status>" +
            "<show>" + xmlEscape(this.sharedStatus.show) + "</show>" +
            "<status-list show='default'>" + this.sharedStatus.default.map(function (elm) { return "<status>" + xmlEscape(elm) + "</status>"; }).join("") + "</status-list>" +
            "<status-list show='dnd'>" + this.sharedStatus.dnd.map(function (elm) { return "<status>" + xmlEscape(elm) + "</status>"; }).join("") + "</status-list>" +
            "<invisible value='" + this.sharedStatus.invisible + "'/>" +
            "</query></iq>";

            this.gtalk.write(msg);
        },

        register: function (username, uri) {
            var requestString = 'as=0123456789abcdef0123456789abcdef&username=' + escape(username) + '&auth=' + escape(this.gtalk.getAuth()) + '&url=' + escape(uri);

            return WinJS.xhr({
                type: 'POST',
                url: 'http://gtalkjsonproxy.lhchavez.com:12345/register',
                headers: { 'Content-Length': requestString.length, 'Content-Type': "application/x-www-form-urlencoded" },
                data: requestString
            });
        },

        offlineMessages: function (token) {
            var requestString = 'token=' + escape(token);

            return WinJS.xhr({
                type: 'POST',
                url: 'http://gtalkjsonproxy.lhchavez.com:12345/messagequeue',
                headers: { 'Content-Length': requestString.length, 'Content-Type': "application/x-www-form-urlencoded" },
                data: requestString
            });
        }
    });

    WinJS.Namespace.define('Kupo', {
        Gtalk: Gtalk
    });
})();