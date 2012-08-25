using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Windows.Foundation;
using Windows.Networking;
using Windows.Networking.Sockets;
using Windows.Storage.Streams;
using Windows.UI.Core;

namespace XMPP {
    public struct CallbackData
    {
        public string Data;
    }

    public sealed class Xmpp {
        public event EventHandler<string> Log;
        public event EventHandler<CallbackData> Message;
        public event EventHandler<string> Disconnect;
        private string server;
        private string auth;
        private string username;

        private DataReader reader;
        private DataWriter writer;
        private StreamSocket socket;
        private XmlStream xmlStream;

        private async Task log(CoreWindow window, string message) {
            if (Log != null) {
                await window.Dispatcher.RunAsync(0, () =>
                {
                    if (Log != null) {
                        Log(this, message);
                    }
                });
            }
        }

        private async Task message(CoreWindow window, string message)
        {
            if (Message != null)
            {
                await window.Dispatcher.RunAsync(0, () =>
                {
                    if (Message != null) {
                        Message(this, new CallbackData() { Data = message });
                    }
                });
            }
        }

        private async Task disconnect(CoreWindow window, string message)
        {
            if (Disconnect != null)
            {
                await window.Dispatcher.RunAsync(0, () =>
                {
                    if (Disconnect != null) {
                        Disconnect(this, message);
                    }
                });
            }
        }

        public IAsyncOperation<string> Login(string username, string password) {
            if (username.IndexOf('@') == -1) {
                this.server = "gmail.com";
                username += "@gmail.com";
            } else {
                this.server = username.Split(new char[] { '@' })[1];
            }

            this.username = username;

            var client = new HttpClient();

            var data =
                "accountType=HOSTED_OR_GOOGLE" +
                "&Email=" + Uri.EscapeDataString(username) +
                "&Passwd=" + Uri.EscapeDataString(password) +
                "&service=mail" +
                "&source=kupoapp.com-kupo-1.0";

            return Task.Run<string>(async () =>
            {
                try
                {
                    var request = new StringContent(data, Encoding.UTF8, "application/x-www-form-urlencoded");

                    var response = await client.PostAsync(
                        "https://www.google.com/accounts/ClientLogin",
                        request
                    );

                    var content = await response.Content.ReadAsStringAsync();

                    foreach (var line in content.Split(new[] { '\n' }))
                    {
                        if (line.StartsWith("Auth="))
                        {
                            this.auth = line.Substring(5);

                            return "ok";
                        }
                    }

                    return content;
                }
                catch (Exception e)
                {
                    return e.ToString();
                }
            }).AsAsyncOperation<string>();
        }

        public IAsyncOperation<string> Connect() {
            var window = CoreWindow.GetForCurrentThread();

            return Task.Run<string>(async () =>
            {
                try
                {
                    var socket = this.socket = new Windows.Networking.Sockets.StreamSocket();

                    await socket.ConnectAsync(new HostName("talk.google.com"), "5222", SocketProtectionLevel.PlainSocket);

                    await log(window, "connected!");

                    reader = new DataReader(socket.InputStream);
                    writer = new DataWriter(socket.OutputStream);

                    reader.InputStreamOptions = InputStreamOptions.Partial;

                    Write("<?xml version='1.0'?>\n<stream:stream to='" + server + "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'>");

                    xmlStream = new XmlStream();
                    bool shouldRead = true;

                    xmlStream.SetCallback(async (promptRead, data) =>
                    {
                        await log(window, "data " + data);

                        if (promptRead)
                        {
                            if (shouldRead)
                            {
                                await log(window, "prompt read");

                                await reader.LoadAsync(4096);
                                var buffer = new byte[reader.UnconsumedBufferLength];
                                reader.ReadBytes(buffer);
                                await log(window, "in " + Encoding.UTF8.GetString(buffer, 0, buffer.Length));
                                xmlStream.Update(buffer, 0, buffer.Length);
                            }
                            else
                            {
                                await log(window, "read blocked");
                            }
                        }
                        else if (data.IndexOf("stream:features") != -1)
                        {
                            Write("<starttls xmlns='urn:ietf:params:xml:ns:xmpp-tls' />");
                        }
                        else if (data.IndexOf("proceed") != -1)
                        {
                            await log(window, "SSL Strength: " + socket.Information.ProtectionLevel);

                            writer.DetachStream();
                            reader.DetachStream();

                            shouldRead = false;

                            if (server == "gmail.com")
                            {
                                await socket.UpgradeToSslAsync(SocketProtectionLevel.Ssl, new Windows.Networking.HostName("gmail.com"));
                            }
                            else
                            {
                                await socket.UpgradeToSslAsync(SocketProtectionLevel.Ssl, new Windows.Networking.HostName("talk.google.com"));
                            }

                            writer = new DataWriter(socket.OutputStream);
                            reader = new DataReader(socket.InputStream);

                            reader.InputStreamOptions = InputStreamOptions.Partial;

                            await log(window, "upgraded!");
                            await log(window, "SSL Strength: " + socket.Information.ProtectionLevel);

                            Write("<?xml version='1.0'?>\n<stream:stream to='" + server + "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'>");

                            xmlStream.SetCallback(async (shouldRead2, data2) =>
                            {
                                await log(window, "data " + data2);

                                if (shouldRead2)
                                {
                                    await reader.LoadAsync(4096);
                                    var buffer = new byte[reader.UnconsumedBufferLength];
                                    reader.ReadBytes(buffer);
                                    await log(window, "in " + Encoding.UTF8.GetString(buffer, 0, buffer.Length));
                                    xmlStream.Update(buffer, 0, buffer.Length);
                                }
                                else if (data2.Contains("X-GOOGLE-TOKEN"))
                                {
                                    var token = Convert.ToBase64String(Encoding.UTF8.GetBytes('\x00' + this.username + '\x00' + this.auth));
                                    Write("<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='X-GOOGLE-TOKEN'>" + token + "</auth>");
                                }
                                else if (data2.Contains("failure"))
                                {
                                    if (Disconnect != null) Disconnect(this, "auth failure");
                                }
                                else if (data2.Contains("success"))
                                {
                                    var messageEvent = Message;

                                    xmlStream.SetCallback(async (shouldRead3, data3) =>
                                    {
                                        if (shouldRead3)
                                        {
                                            await reader.LoadAsync(4096);
                                            var buffer = new byte[reader.UnconsumedBufferLength];
                                            reader.ReadBytes(buffer);
                                            await log(window, "in " + Encoding.UTF8.GetString(buffer, 0, buffer.Length));
                                            xmlStream.Update(buffer, 0, buffer.Length);
                                        }
                                        else if (data3 == "</stream:stream>")
                                        {
                                            await disconnect(window, "end of stream");
                                        }
                                        else if (!data3.StartsWith("<stream:stream"))
                                        {
                                            await message(window, data3);
                                        }
                                    });

                                    Write("<?xml version='1.0'?>\n<stream:stream to='" + server + "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'>");
                                }
                                else if (!data2.StartsWith("<stream:stream"))
                                {
                                    await log(window, "Ummm not sure what to do with '" + data2 + "'. flee.");
                                    if (Disconnect != null) Disconnect(this, "protocol error");
                                }
                            });
                        }
                        else if (!data.StartsWith("<stream:stream"))
                        {
                            await log(window, "Ummm not sure what to do with '" + data + "'. flee.");
                            if (Disconnect != null) Disconnect(this, "protocol error");
                        }
                    });

                    return "ok";
                }
                catch (Exception e)
                {
                    return e.ToString();
                }
            }).AsAsyncOperation<string>();
        }

        public void Close() {
            this.Write("</stream:stream>");
            this.socket.InputStream.Dispose();
            this.socket.OutputStream.Dispose();
            this.socket.Dispose();
        }

        public string GetAuth() {
            return this.auth;
        }

        public async void Write(string stanza)
        {
            var window = CoreWindow.GetForCurrentThread();

            this.writer.WriteString(stanza);
            await writer.StoreAsync();
            await log(window, "out " + stanza);
        }
    }
}
