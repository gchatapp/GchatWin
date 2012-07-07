using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace XMPP {
    public delegate void XmppStanza(bool shouldRead, string stanza);

    public sealed class XmlStream {
        private string good = "";
        private string remaining = "";
        private int nesting = 0;
        private static Regex tag = new Regex(@"<(\/?)\s*([^ >/]+)[^>]*?(\/?)>", RegexOptions.Multiline);

        private SizedBuffer utf = new SizedBuffer(10240);
        private SizedBuffer nextUtf = new SizedBuffer(10);
        private SizedBuffer tmpBuf = new SizedBuffer(10250);

        private XmppStanza callback;

        public void SetCallback(XmppStanza callback) {
            this.callback = callback;

            callback(true, null);
        }

        public void Update([ReadOnlyArray] byte[] buf, int offset, int len) {
            if (len <= 0) return;

            if ((buf[offset + len - 1] & 0x80) != 0) {
                // oh oh, the last character may be an incomplete UTF8 character.

                var origLen = len;
                var utfCharStart = offset + (--len);

                while (utfCharStart >= offset && (buf[utfCharStart] & 0xC0) == 0x80) {
                    utfCharStart--;
                    len--;
                }

                if (utfCharStart < offset) {
                    utf.Append(buf, offset, origLen - offset);

                    callback(true, null);

                    return;
                } else {
                    nextUtf.Reset(buf, utfCharStart, origLen - utfCharStart);
                }
            }

            if (utf.Length == 0) {
                this.remaining += Encoding.UTF8.GetString(buf, offset, len);
            } else {
                tmpBuf.Reset(utf);
                tmpBuf.Append(buf, offset, len);

                this.remaining += tmpBuf.ToString();
            }

            utf.Reset(nextUtf);

            Match m;
            var begin = 0;
            var last = 0;

            while ((m = tag.Match(this.remaining, last)) != null && m.Success) {
                last = m.Index + m.Length;

                if (m.Groups[2].Value == "stream:stream") {
                    callback(false, this.remaining.Substring(begin, last - begin));
                    begin = last;
                    continue;
                } if (m.Groups[1].Value == "/") {
                    this.nesting--;
                } else if (m.Groups[3].Value != "/") {
                    this.nesting++;
                }

                if (this.nesting == 0) {
                    callback(false, this.good + this.remaining.Substring(begin, last - begin));

                    begin = last;
                    this.good = "";
                }
            }

            this.good += this.remaining.Substring(begin, last - begin);
            this.remaining = this.remaining.Substring(last);

            callback(true, null);
        }
    }

    class SizedBuffer {
        public byte[] Data;
        public int Length;

        public SizedBuffer(int size) {
            Data = new byte[size];
            Length = 0;
        }

        public byte this[int idx] {
            get { return Data[idx]; }
            set { Data[idx] = value; }
        }

        public void Reset(SizedBuffer buf) {
            if (buf.Length > Data.Length) {
                throw new ArgumentException("Origin buffer size exceeds destination's");
            }

            Array.Copy(buf.Data, Data, buf.Length);
            Length = buf.Length;
        }

        public void Reset(byte[] buf, int offset, int length) {
            if (length > Data.Length) {
                throw new ArgumentException("Origin buffer size exceeds destination's");
            }

            Array.Copy(buf, offset, Data, 0, length);
            Length = length;
        }

        public void Append(SizedBuffer buf) {
            if (buf.Length > Data.Length - Length) {
                throw new ArgumentException("Not enough space in buffer");
            }

            Array.Copy(buf.Data, 0, Data, Length, buf.Length);
            Length += buf.Length;
        }

        public void Append(byte[] buf, int offset, int length) {
            if (length > Data.Length - Length) {
                throw new ArgumentException("Not enough space in buffer");
            }

            Array.Copy(buf, offset, Data, Length, length);
            Length += length;
        }

        public override String ToString() {
            return Encoding.UTF8.GetString(Data, 0, Length);
        }
    }
}