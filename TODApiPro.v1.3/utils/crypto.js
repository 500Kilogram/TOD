const nacl = require('tweetnacl-util');
const nacl$1 = require('tweetnacl');

function toHexString(byteArray) {
    let hexString = '';
    byteArray.forEach(byte => {
        hexString += ('0' + (byte & 0xff).toString(16)).slice(-2);
    });
    return hexString;
}
function hexToByteArray(hexString) {
    if (hexString.length % 2 !== 0) {
        throw new Error(`Cannot convert ${hexString} to bytesArray`);
    }
    const result = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        result[i / 2] = parseInt(hexString.slice(i, i + 2), 16);
    }
    return result;
}
function concatUint8Arrays(buffer1, buffer2) {
    const mergedArray = new Uint8Array(buffer1.length + buffer2.length);
    mergedArray.set(buffer1);
    mergedArray.set(buffer2, buffer1.length);
    return mergedArray;
}
function splitToUint8Arrays(array, index) {
    if (index >= array.length) {
        throw new Error('Index is out of buffer');
    }
    // if (array.toUint8Array) {
    //     array = array.toUint8Array();
    // }
    const subArray1 = array.slice(0, index);
    const subArray2 = array.slice(index);
    return [subArray1, subArray2];
}

function encodeUint8Array(value, urlSafe) {
    const encoded = nacl.encodeBase64(value);
    if (!urlSafe) {
        return encoded;
    }
    return encodeURIComponent(encoded);
}
function decodeToUint8Array(value, urlSafe) {
    if (urlSafe) {
        value = decodeURIComponent(value);
    }
    return nacl.decodeBase64(value);
}

function encode(value, urlSafe = false) {
    let uint8Array;
    if (value instanceof Uint8Array) {
        uint8Array = value;
    }
    else {
        if (typeof value !== 'string') {
            value = JSON.stringify(value);
        }
        uint8Array = nacl.decodeUTF8(value);
    }
    return encodeUint8Array(uint8Array, urlSafe);
}
function decode(value, urlSafe = false) {
    const decodedUint8Array = decodeToUint8Array(value, urlSafe);
    return {
        toString() {
            return nacl.encodeUTF8(decodedUint8Array);
        },
        toObject() {
            try {
                return JSON.parse(nacl.encodeUTF8(decodedUint8Array));
            }
            catch (e) {
                return null;
            }
        },
        toUint8Array() {
            return decodedUint8Array;
        }
    };
}
const Base64 = {
    encode,
    decode
};

class SessionCrypto {
    constructor(keyPair) {
        this.nonceLength = 24;
        this.keyPair = keyPair ? this.createKeypairFromString(keyPair) : this.createKeypair();
        this.sessionId = toHexString(this.keyPair.publicKey);
    }
    createKeypair() {
        return nacl$1.box.keyPair();
    }
    createKeypairFromString(keyPair) {
        return {
            publicKey: hexToByteArray(keyPair.publicKey),
            secretKey: hexToByteArray(keyPair.secretKey)
        };
    }
    createNonce() {
        return nacl$1.randomBytes(this.nonceLength);
    }
    encrypt(message, receiverPublicKey) {
        const encodedMessage = new TextEncoder().encode(message);
        const nonce = this.createNonce();
        const encrypted = nacl$1.box(encodedMessage, nonce, receiverPublicKey, this.keyPair.secretKey);
        return concatUint8Arrays(nonce, encrypted);
    }
    decrypt(message, senderPublicKey) {
        const [nonce, internalMessage] = splitToUint8Arrays(message, this.nonceLength);
        const decrypted = nacl$1.box.open(internalMessage, nonce, senderPublicKey, this.keyPair.secretKey);
        if (!decrypted) {
            throw new Error(`Decryption error: \n message: ${message.toString()} \n sender pubkey: ${senderPublicKey.toString()} \n keypair pubkey: ${this.keyPair.publicKey.toString()} \n keypair secretkey: ${this.keyPair.secretKey.toString()}`);
        }
        return new TextDecoder().decode(decrypted);
    }
    stringifyKeypair() {
        return {
            publicKey: toHexString(this.keyPair.publicKey),
            secretKey: toHexString(this.keyPair.secretKey)
        };
    }
}

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

function convertToRpcRequest(request) {
    return {
        method: 'sendTransaction',
        params: [JSON.stringify(request)]
    };
}

module.exports.SessionCrypto = SessionCrypto;
module.exports.Base64 = Base64;
module.exports.__rest = __rest;
module.exports.convertToRpcRequest = convertToRpcRequest;
module.exports.hexToByteArray = hexToByteArray;