(function () {
    'use strict';

    var showPriority = {
        'offline': 0,
        'away': 1,
        'busy': 2,
        'available': 3
    };

    function alphabeticSort(a, b) {
        var aValue = a.name || a.email;
        var bValue = b.name || b.email;

        if (aValue < bValue) {
            return -1;
        } else if (aValue > bValue) {
            return 1;
        } else {
            return 0;
        }
    };

    function showSort(a, b) {
        if (showPriority[a.show] != showPriority[b.show]) {
            // Larger priorities are shown first
            return (showPriority[a.show] > showPriority[b.show]) ? -1 : 1;
        } else {
            return alphabeticSort(a, b);
        }
    };

    var Roster = WinJS.Class.define(
    function (gtalk) {
        this.roster = {};
        this.gtalk = gtalk;
    },
    {
        update: function (data) {
            var self = this;

            return new WinJS.Promise(function (b, e, p) {
                var email = data.jid.split('/')[0];

                if (!self.roster[email]) {
                    self.roster[email] = {
                        email: email,
                        photoUrl: "/images/user.png",
                        sessions: {},
                        notifications: [],
                        notificationsCount: 0,
                        notificationsDisplay: 'none'
                    };
                }

                var previousShow = self.roster[email].show;

                self.roster[email].sessions[data.jid] = {
                    show: data.show || 'offline',
                    status: data.status || '',
                    priority : data.priority || 0
                };

                self.roster[email].show = 'offline';
                self.roster[email].status = '';
                self.roster[email].showImage = '/images/offline.png';
                self.roster[email].priority = -100;

                for (var e in self.roster[email].sessions) {
                    if (!self.roster[email].sessions.hasOwnProperty(e)) continue;

                    if (showPriority[self.roster[email].sessions[e].show] > showPriority[self.roster[email].show] ||
                        (
                            showPriority[self.roster[email].sessions[e].show] == showPriority[self.roster[email].show] &&
                            self.roster[email].sessions[e].priority > self.roster[email].priority
                        )
                    ) {
                        self.roster[email].show = self.roster[email].sessions[e].show;
                        self.roster[email].status = self.roster[email].sessions[e].status;
                        self.roster[email].priority = self.roster[email].sessions[e].priority;
                        self.roster[email].showImage = '/images/' + self.roster[email].sessions[e].show  + '.png';
                    }
                }

                self.roster[email].showChanged = self.roster[email].show != previousShow;

                if (data.name) self.roster[email].name = data.name;
                if (data.photo && self.roster[email].photo != data.photo) {
                    self.roster[email].photo = data.photo;

                    self.updatePhoto(data.jid, data.photo + ".jpg").then(function (photoUrl) {
                        Console.log("The photo url has been updated: " + photoUrl);
                        self.roster[email].photoUrl = photoUrl;
                        b(self.roster[email]);
                    }, e, p);
                } else {
                    b(self.roster[email]);
                }
            });
        },

        get: function (jid) {
            var idx = jid.indexOf('/');

            if (idx !== -1) {
                jid = jid.substring(0, idx);
            }

            return this.roster[jid] || {};
        },

        getList: function (listType) {
            var result = [];

            for (var email in this.roster) {
                if (this.roster.hasOwnProperty(email) && (listType === 'all' || this.roster[email].show != 'offline')) {
                    result.push(this.roster[email]);
                }
            }

            if (listType == 'all') {
                result.sort(alphabeticSort);
            } else if (listType == 'online') {
                result.sort(showSort);
            }

            return result;
        },

        clearNotifications: function (email) {
            this.roster[email].notifications = [];
            this.roster[email].notificationsCount = 0;
            this.roster[email].notificationsDisplay = 'none';
        },

        addNotification: function (email, notification) {
            this.roster[email].notifications.push(notification);
            this.roster[email].notificationsCount++;
            this.roster[email].notificationsDisplay = 'block';
        },

        updatePhoto: function (jid, fileName) {
            var self = this;

            Console.log("Getting picture for " + jid + ", " + fileName);

            return new WinJS.Promise(function (b, e, p) {
                self.gtalk.photo(jid).then(function (picData) {
                    Windows.Storage.ApplicationData.current.localFolder.createFileAsync(
                        fileName,
                        Windows.Storage.CreationCollisionOption.failIfExists
                    ).then(function (photoFile) {
                        photoFile.openAsync(Windows.Storage.FileAccessMode.readWrite).then(function (stream) {
                            var outputStream = stream.getOutputStreamAt(0);
                            var writer = new Windows.Storage.Streams.DataWriter(outputStream);

                            var picBuffer = Windows.Security.Cryptography.CryptographicBuffer.decodeFromBase64String(picData);

                            writer.writeBytes(Windows.Security.Cryptography.CryptographicBuffer.copyToByteArray(picBuffer));
                            writer.storeAsync().then(function () {
                                outputStream.flushAsync().then(function () {
                                    b(URL.createObjectURL(photoFile));
                                }, e);
                            }, e);
                        }, e);
                    }, function (err) {
                        Windows.Storage.ApplicationData.current.localFolder.createFileAsync(
                            fileName,
                            Windows.Storage.CreationCollisionOption.openIfExists
                        ).then(function (photoFile) {
                            b(URL.createObjectURL(photoFile));
                        }, e);
                    });
                }, e);
            });
        },

        search: function (query, maxResults) {
            var result = [];

            for (var email in this.roster) {
                if (this.roster.hasOwnProperty(email) && (email.toLocaleLowerCase().indexOf(query) !== -1 || this.roster[email].name.toLocaleLowerCase().indexOf(query) !== -1)) {
                    result.push(this.roster[email]);

                    if (maxResults && result.length == maxResults) {
                        break;
                    }
                }
            }

            result.sort(alphabeticSort);

            return result;
        },

        save: function (settings) {
            settings['roster'] = JSON.stringify(this.roster);
        },

        restore: function (settings) {
            this.roster = JSON.parse(settings['roster'] || "{}");

            var self = this;
            var remaining = 0;
            
            for (var email in self.roster) {
                if (!self.roster.hasOwnProperty(email)) continue;
                
                if (self.roster[email].photo) {
                    remaining++;
                }
            }

            return new WinJS.Promise(function (s, e, p) {
                if (remaining == 0) {
                    s();
                } else {
                    for (var email in self.roster) {
                        if (!self.roster.hasOwnProperty(email)) continue;

                        self.roster[email].photoUrl = "/images/user.png";

                        if (self.roster[email].photo) {
                            (function (user) {
                                Windows.Storage.ApplicationData.current.localFolder.createFileAsync(
                                user.photo + ".jpg",
                                Windows.Storage.CreationCollisionOption.openIfExists
                            ).then(function (photoFile) {
                                    user.photoUrl = URL.createObjectURL(photoFile);

                                    if (--remaining == 0) {
                                        s();
                                    }
                                }, function (err) {
                                    if (--remaining == 0) {
                                        s();
                                    }
                                });
                            })(self.roster[email]);
                        }
                    }
                }
            });
        }
    });

    WinJS.Namespace.define('Kupo', {
        Roster: Roster
    });
})();