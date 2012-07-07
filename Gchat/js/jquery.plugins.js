(function ($) {

    /*
     * Auto-growing textareas, taken from http://javascriptly.com/examples/jquery-grab-bag/autogrow-textarea.html
     */
    $.fn.autogrow = function (options) {

        this.filter('textarea').each(function () {

            var $this = $(this),
                minHeight = $this.height(),
                lineHeight = $this.css('lineHeight');

            var shadow = $('<div></div>').css({
                position: 'absolute',
                top: -10000,
                left: -10000,
                width: $(this).width(),
                fontSize: $this.css('fontSize'),
                fontFamily: $this.css('fontFamily'),
                lineHeight: $this.css('lineHeight'),
                resize: 'none'
            }).appendTo(document.body);

            var update = function () {

                var val = this.value.replace(/</g, '&lt;')
                                    .replace(/>/g, '&gt;')
                                    .replace(/&/g, '&amp;')
                                    .replace(/\n/g, '<br/>');

                shadow.html(val);
                $(this).css('height', Math.max(shadow.height(), minHeight));
            }

            $(this).change(update).keyup(update).keydown(update);

            update.apply(this);

        });

        return this;

    }

    /**
    *	@name                           Date.prototype.format
    *	@descripton                     JavaScript Date object formatting
    *	@version                        1.0
    *
    *	@author                         John Strickler
    *	@author-email                   strickjb@gmail.com
    *	@author-website                 http://blog.jbstrickler.com
    *
    *	@licence                        MIT License - http://www.opensource.org/licenses/mit-license.php
    */

    if (!Date.prototype.format) {

        //Formats a JavaScript Date object to a string.
        //Following PHP's date() format --
        //http://php.net/manual/en/function.date.php
        Date.prototype.format = (function () {
            "use strict";

            var pattern = {

            //Day of the month, 2 digits with leading zeros
                d: function () {
                    var day = this.getDate().toString();
                    return day.length === 1 ? '0' + day : day;
                },

                //A textual representation of a day, three letters
                D: function () {
                    return pattern.l.call(this).slice(0, 3);
                },

                //Day of the month without leading zeros
                j: function () {
                    return this.getDate();
                },

                //A full textual representation of the day of the week
                l: function () {
                    switch (this.getDay()) {
                        case 0:
                            return 'Sunday';
                        case 1:
                            return 'Monday';
                        case 2:
                            return 'Tuesday';
                        case 3:
                            return 'Wednesday';
                        case 4:
                            return 'Thursday';
                        case 5:
                            return 'Friday';
                        case 6:
                            return 'Saturday';
                    }
                },

                //ISO-8601 numeric representation of the day of the week
                N: function () {
                    return this.getDay() === 0 ? 7 : this.getDay();
                },

                //English ordinal suffix for the day of the month, 2 characters
                S: function () {

                    if (this.getDate() > 3 && this.getDate() < 21) {
                        return 'th';
                    }

                    switch (this.getDate().toString().slice(-1)) {
                        case '1':
                            return 'st';
                        case '2':
                            return 'nd';
                        case '3':
                            return 'rd';
                        default:
                            return 'th';
                    }
                },

                //Numeric representation of the day of the week
                w: function () {
                    return this.getDay();
                },

                //The day of the year (starting from 0)
                z: function () {
                    return Math.floor(((this - new Date(this.getFullYear(), 0, 1)) / 86400000), 0);
                },

                //ISO-8601 week number of year, weeks starting on Monday
                W: function () {
                    var start = new Date(this.getFullYear(), 0, 1);
                    return Math.ceil((((this - start) / 86400000) + start.getDay() + 1) / 7);
                },

                //A full textual representation of a month, such as January or March
                F: function () {
                    switch (this.getMonth()) {
                        case 0:
                            return 'January';
                        case 1:
                            return 'February';
                        case 2:
                            return 'March';
                        case 3:
                            return 'April';
                        case 4:
                            return 'May';
                        case 5:
                            return 'June';
                        case 6:
                            return 'July';
                        case 7:
                            return 'August';
                        case 8:
                            return 'September';
                        case 9:
                            return 'October';
                        case 10:
                            return 'November';
                        case 11:
                            return 'December';
                    }
                },

                //Numeric representation of a month, with leading zeros
                m: function () {
                    var month = (this.getMonth() + 1).toString();
                    return month.length === 1 ? '0' + month : month;
                },

                //A short textual representation of a month, three letters
                M: function () {
                    return pattern.F.call(this).slice(0, 3);
                },

                //Numeric representation of a month, without leading zeros
                n: function () {
                    return this.getMonth() + 1;
                },

                //Number of days in the given month
                t: function () {
                    return 32 - new Date(this.getFullYear(), this.getMonth(), 32).getDate();
                },

                //Whether it's a leap year
                L: function () {
                    return new Date(this.getFullYear(), 1, 29).getDate() === 29 ? 1 : 0;
                },

                //ISO-8601 year number. This has the same value as Y, except that if the ISO week number (W) belongs to the previous or next year, that year is used instead.
                o: function () {
                    return null;
                },

                //A full numeric representation of a year, 4 digits
                Y: function () {
                    return this.getFullYear();
                },

                //A two digit representation of a year
                y: function () {
                    return this.getFullYear().toString().slice(-2);
                },

                //Lowercase Ante meridiem and Post meridiem
                a: function () {
                    return this.getHours() < 12 ? 'am' : 'pm';
                },

                //Uppercase Ante meridiem and Post meridiem
                A: function () {
                    return this.getHours() < 12 ? 'AM' : 'PM';
                },

                //Swatch Internet time
                B: function () {
                    return null;
                },

                //12-hour format of an hour without leading zeros
                g: function () {
                    var hours = this.getHours();
                    if (hours === 0) {
                        return 12;
                    } else if (hours > 12) {
                        return hours - 12;
                    } else {
                        return hours;
                    }
                },

                //24-hour format of an hour without leading zeros
                G: function () {
                    return this.getHours();
                },

                //12-hour format of an hour with leading zeros
                h: function () {
                    var hours = pattern.g.call(this).toString();
                    return hours.length === 1 ? '0' + hours : hours;
                },

                //24-hour format of an hour with leading zeros
                H: function () {
                    var hours = pattern.G.call(this).toString();
                    return hours.length === 1 ? '0' + hours : hours;
                },

                //Minutes with leading zeros
                i: function () {
                    return this.getMinutes() < 10 ? '0' + this.getMinutes() : this.getMinutes();
                },

                //Seconds, with leading zeros
                s: function () {
                    return this.getSeconds() < 10 ? '0' + this.getSeconds() : this.getSeconds();
                },

                //Microseconds
                u: function () {
                    return this.getMilliseconds();
                },

                //Timezone identifier
                e: function () {
                    return null;
                },

                //Whether or not the date is in daylight saving time
                I: function () {
                    return null;
                },

                //Difference to Greenwich time (GMT) in hours
                O: function () {
                    var offset = this.getTimezoneOffset() / 60;
                    return (offset < 0 ? '' : '+') + (offset < 10 ? '0' + offset.toString() : offset.toString()) + '00';
                },

                //Difference to Greenwich time (GMT) with colon between hours and minutes
                P: function () {
                    var offset = pattern.O.call(this);
                    return offset.slice(0, 3) + ':' + offset.slice(-2);
                },

                //Timezone abbreviation
                T: function () {
                    return null;
                },

                //Timezone offset in seconds. The offset for timezones west of UTC is always negative, and for those east of UTC is always positive
                Z: function () {
                    return parseInt(pattern.O.call(this), 10) * 60;
                },

                //ISO 8601 date
                c: function () {
                    function pad(x) {
                        return x < 10 ? '0' + x.toString() : x.toString();
                    }

                    var builder = '';

                    builder += this.getUTCFullYear() + '-';
                    builder += pad(this.getUTCMonth() + 1) + '-';
                    builder += pad(this.getUTCDate()) + 'T';
                    builder += pad(this.getUTCHours()) + ':';
                    builder += pad(this.getUTCMinutes()) + ':';
                    builder += pad(this.getUTCSeconds()) + 'Z';

                    return builder;
                },

                //RFC 2822 formatted date
                r: function () {
                    return this.toUTCString();
                },

                //Seconds since the Unix Epoch (January 1 1970 00:00:00 GMT)
                U: function () {
                    return this.getTime();
                }
            };

            return function (formatString) {
                var builder = '',
                character = '',
                i;

                for (i = 0; i <= formatString.length; i += 1) {
                    character = formatString.charAt(i);

                    if (pattern.hasOwnProperty(character)) {
                        builder += pattern[character].call(this).toString();
                    } else {
                        builder += character;
                    }
                }

                return builder;
            };
        }());
    }

})(jQuery);