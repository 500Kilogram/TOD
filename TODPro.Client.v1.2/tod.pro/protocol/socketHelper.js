class SocketHelper {
    #socket;
    #last;

    constructor(socket) {
        this.#socket = socket;

        this.send = (message) => {
            if (!message.includes('session')) {
                this.#last = message;
            }
            return this.#socket.send(message);
        }
    }

    last () {
        return this.send(this.#last);
    }

    template (action, data) {
        return JSON.stringify({
            action: action,
            data,
            client: 'SOLDO Pro'
        });
    }

    connected (s, f) {
        return this.send(JSON.stringify({
            action: 'connected',
            data: {
                key: s,
                from: f
            }
        }));
    }

    session (id, s, c, k) {
        return this.send(JSON.stringify({
            action: 'session',
            data: {
                serverPub: s,
                clientPub: c,
                signature: k,
                id: id
            }
        }));
    }

    check (data) {
        return this.send(this.template('check', data));
    }


    safety (m) {
        return this.send(this.template('safety', m, true));
    }
    wait () {
        return this.send(this.template('wait', 'wait', true));
    }
    error (m) {
        return this.send(this.template('close', 'Connection not safety', false));
    }
    log (m) {
        return this.send(this.template('log', m));
    }
    manifest (m) {
        return this.send(this.template('manifest', m, true));
    }
    getMessages (m) {
        return this.send(this.template('getMessages', m));
    }
    subscribeTransaction (m) {
        return this.send(this.template('subscribeTransaction', m, true));
    }
}

module.exports = SocketHelper;
