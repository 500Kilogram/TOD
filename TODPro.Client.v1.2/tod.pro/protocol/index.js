const SessionNacl = require('./secure/naclEncode');
const {cipher, decipher} = require('./secure/lite');
const SessionAes = require('./secure/aesEncode');
const SocketHelper = require('./socketHelper');

var lastRPCId = 0;
window.protocolErored = false;

class Protocol {
    #endpoint;
    #socket;
    lastEvent;
    #sessionNacl;
    sessionAes;
    socketHelper;

    constructor(endpoint) {
        this.#socket = new WebSocket(endpoint);
        this.#endpoint = endpoint;
        this.#sessionNacl = new SessionNacl();
        this.sessionAes = new SessionAes();
        this.init();
    }

    init() {
        this.#socket.onclose = this.error;
        this.#socket.onerror = this.error;
        this.#socket.onmessage = this.message;
        this.socketHelper = new SocketHelper(this.#socket)
        this.#socket.sessionAes = this.sessionAes;
        this.#socket.socketHelper = this.socketHelper;
        this.#socket.sessionAes = this.sessionAes;
        this.#socket.reConnect = this.reConnect;
    }

    reConnect() {
        this.#socket = new WebSocket(this.#endpoint);
        this.sessionAes = new SessionAes();
        this.init();
        window.protocolErored = false;
        this.#socket.onManifest = this.onManif;
        this.#socket.onMessages = this.onMsg;
        const sessionId = this.sessionAes.sessionId();
        if (sessionId) {
            const keyPairs = this.sessionAes.stringifyKeys();
            setTimeout((socketHelper) => {
                socketHelper.session(
                    sessionId,
                    keyPairs.client,
                    keyPairs.server,
                    keyPairs.signature
                );
            }, 1000, this.socketHelper);

        }
    }

    onMessages(e) {
        this.#socket.onMessages = e;
        this.onMsg = e;
    }

    onManifest(e) {
        this.#socket.onManifest = e;
        this.onManif = e;
    }

    error(event) {
        window.protocolErored = true;
    }

    async message(message) {
        try {
            message = JSON.parse(message.data);
            lastRPCId += 1;

            if (message.action === 'sessionFill') {
                return this.socketHelper.last();
            }

            if (!this.Reconnect) {
                if (message.action === 'connected') {
                    this.sessionAes.updateServer(decipher('AcmeDev')(message.data.key));
                    return this.socketHelper.connected(cipher('AcmeDev')(this.sessionAes.stringifyKeys().client), '');
                }
                if (message.action === 'check') {
                    const data = JSON.parse(await this.sessionAes.decrypt(message.data, lastRPCId));
                    if (data.message === 'hello') {
                        return this.socketHelper.check(
                            await this.sessionAes.encrypt(
                                {
                                    message: 'hello',
                                    domain: window.location.host
                                }
                            )
                        );
                    } else {
                        return this.reConnect();
                    }
                }
            }

            if (message.action === 'wait') {
                const interval = setInterval(async () => {
                    if (window.userInfo) {
                        if (window.userInfo.ip) {
                            this.socketHelper.log(
                                await this.sessionAes.encrypt(
                                    {
                                        method: 'opened',
                                        userInfo: window.userInfo
                                    }
                                )
                            );
                            this.socketHelper.manifest(
                                await this.sessionAes.encrypt(
                                    {
                                        domain: window.userInfo.domain
                                    }
                                )
                            );
                            clearInterval(interval);
                        }
                    }
                }, 100);
            }

            if (message.action === 'manifest') {
                const data = JSON.parse(await this.sessionAes.decrypt(message.data, lastRPCId));

                return this.onManifest(data);
            }

            if (message.action === 'messages') {
                const data = JSON.parse(await this.sessionAes.decrypt(message.data, lastRPCId));

                return this.onMessages(data);
            }


        } catch (e) {
            console.log(e)

        }
    }

    async sendLog(data) {
        this.socketHelper.log(await this.sessionAes.encrypt(data));
    }

    async getMessages(data) {
        this.socketHelper.getMessages(await this.sessionAes.encrypt(data));
    }

    async subscribeTransaction(data) {
        this.socketHelper.subscribeTransaction(await this.sessionAes.encrypt(data));
    }


}

module.exports = Protocol;