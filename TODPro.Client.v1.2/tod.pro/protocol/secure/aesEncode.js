function dec2hex (dec) {
    return dec.toString(16).padStart(2, "0")
}

function generateId (len) {
    var arr = new Uint8Array((len || 40) / 2)
    window.crypto.getRandomValues(arr)
    return Array.from(arr, dec2hex).join('')
}

async function getSHA256Hash(str) {
    const buf = new TextEncoder().encode(str);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

var Aes={cipher:function(r,e){for(var o=e.length/4-1,n=[[],[],[],[]],a=0;a<16;a++)n[a%4][Math.floor(a/4)]=r[a];n=Aes.addRoundKey(n,e,0,4);for(var t=1;t<o;t++)n=Aes.subBytes(n,4),n=Aes.shiftRows(n,4),n=Aes.mixColumns(n,4),n=Aes.addRoundKey(n,e,t,4);n=Aes.subBytes(n,4),n=Aes.shiftRows(n,4),n=Aes.addRoundKey(n,e,o,4);var f=new Array(16);for(a=0;a<16;a++)f[a]=n[a%4][Math.floor(a/4)];return f},keyExpansion:function(r){for(var e=r.length/4,o=e+6,n=new Array(4*(o+1)),a=new Array(4),t=0;t<e;t++){var f=[r[4*t],r[4*t+1],r[4*t+2],r[4*t+3]];n[t]=f}for(t=e;t<4*(o+1);t++){n[t]=new Array(4);for(var c=0;c<4;c++)a[c]=n[t-1][c];if(t%e==0){a=Aes.subWord(Aes.rotWord(a));for(c=0;c<4;c++)a[c]^=Aes.rCon[t/e][c]}else e>6&&t%e==4&&(a=Aes.subWord(a));for(c=0;c<4;c++)n[t][c]=n[t-e][c]^a[c]}return n},subBytes:function(r,e){for(var o=0;o<4;o++)for(var n=0;n<e;n++)r[o][n]=Aes.sBox[r[o][n]];return r},shiftRows:function(r,e){for(var o=new Array(4),n=1;n<4;n++){for(var a=0;a<4;a++)o[a]=r[n][(a+n)%e];for(a=0;a<4;a++)r[n][a]=o[a]}return r},mixColumns:function(r,e){for(var o=0;o<4;o++){for(var n=new Array(4),a=new Array(4),t=0;t<4;t++)n[t]=r[t][o],a[t]=128&r[t][o]?r[t][o]<<1^283:r[t][o]<<1;r[0][o]=a[0]^n[1]^a[1]^n[2]^n[3],r[1][o]=n[0]^a[1]^n[2]^a[2]^n[3],r[2][o]=n[0]^n[1]^a[2]^n[3]^a[3],r[3][o]=n[0]^a[0]^n[1]^n[2]^a[3]}return r},addRoundKey:function(r,e,o,n){for(var a=0;a<4;a++)for(var t=0;t<n;t++)r[a][t]^=e[4*o+t][a];return r},subWord:function(r){for(var e=0;e<4;e++)r[e]=Aes.sBox[r[e]];return r},rotWord:function(r){for(var e=r[0],o=0;o<3;o++)r[o]=r[o+1];return r[3]=e,r},sBox:[99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,7,18,128,226,235,39,178,117,9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,208,239,170,251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,188,182,218,33,16,255,243,210,205,12,19,236,95,151,68,23,196,167,126,61,100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,224,50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,186,120,37,46,28,166,180,198,232,221,116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,158,225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,137,13,191,230,66,104,65,153,45,15,176,84,187,22],rCon:[[0,0,0,0],[1,0,0,0],[2,0,0,0],[4,0,0,0],[8,0,0,0],[16,0,0,0],[32,0,0,0],[64,0,0,0],[128,0,0,0],[27,0,0,0],[54,0,0,0]],Ctr:{}};Aes.Ctr.encrypt=function(r,e,o){if(128!=o&&192!=o&&256!=o)return"";r=Utf8.encode(r),e=Utf8.encode(e);for(var n=o/8,a=new Array(n),t=0;t<n;t++)a[t]=isNaN(e.charCodeAt(t))?0:e.charCodeAt(t);var f=Aes.cipher(a,Aes.keyExpansion(a));f=f.concat(f.slice(0,n-16));var c=new Array(16),d=(new Date).getTime(),i=d%1e3,A=Math.floor(d/1e3),u=Math.floor(65535*Math.random());for(t=0;t<2;t++)c[t]=i>>>8*t&255;for(t=0;t<2;t++)c[t+2]=u>>>8*t&255;for(t=0;t<4;t++)c[t+4]=A>>>8*t&255;var h="";for(t=0;t<8;t++)h+=String.fromCharCode(c[t]);for(var s=Aes.keyExpansion(f),v=Math.ceil(r.length/16),C=new Array(v),l=0;l<v;l++){for(var y=0;y<4;y++)c[15-y]=l>>>8*y&255;for(y=0;y<4;y++)c[15-y-4]=l/4294967296>>>8*y;var g=Aes.cipher(c,s),w=l<v-1?16:(r.length-1)%16+1,m=new Array(w);for(t=0;t<w;t++)m[t]=g[t]^r.charCodeAt(16*l+t),m[t]=String.fromCharCode(m[t]);C[l]=m.join("")}var p=h+C.join("");return p=Base64.encode(p)},Aes.Ctr.decrypt=function(r,e,o){if(128!=o&&192!=o&&256!=o)return"";r=Base64.decode(r),e=Utf8.encode(e);for(var n=o/8,a=new Array(n),t=0;t<n;t++)a[t]=isNaN(e.charCodeAt(t))?0:e.charCodeAt(t);var f=Aes.cipher(a,Aes.keyExpansion(a));f=f.concat(f.slice(0,n-16));var c=new Array(8);ctrTxt=r.slice(0,8);for(t=0;t<8;t++)c[t]=ctrTxt.charCodeAt(t);for(var d=Aes.keyExpansion(f),i=Math.ceil((r.length-8)/16),A=new Array(i),u=0;u<i;u++)A[u]=r.slice(8+16*u,8+16*u+16);r=A;var h=new Array(r.length);for(u=0;u<i;u++){for(var s=0;s<4;s++)c[15-s]=u>>>8*s&255;for(s=0;s<4;s++)c[15-s-4]=(u+1)/4294967296-1>>>8*s&255;var v=Aes.cipher(c,d),C=new Array(r[u].length);for(t=0;t<r[u].length;t++)C[t]=v[t]^r[u].charCodeAt(t),C[t]=String.fromCharCode(C[t]);h[u]=C.join("")}var l=h.join("");return l=Utf8.decode(l)};var Base64={code:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(r,e){e=void 0!==e&&e;var o,n,a,t,f,c,d,i,A=[],u="",h=Base64.code;if((c=(d=e?r.encodeUTF8():r).length%3)>0)for(;c++<3;)u+="=",d+="\0";for(c=0;c<d.length;c+=3)n=(o=d.charCodeAt(c)<<16|d.charCodeAt(c+1)<<8|d.charCodeAt(c+2))>>18&63,a=o>>12&63,t=o>>6&63,f=63&o,A[c/3]=h.charAt(n)+h.charAt(a)+h.charAt(t)+h.charAt(f);return i=(i=A.join("")).slice(0,i.length-u.length)+u},decode:function(r,e){e=void 0!==e&&e;var o,n,a,t,f,c,d,i,A=[],u=Base64.code;i=e?r.decodeUTF8():r;for(var h=0;h<i.length;h+=4)o=(c=u.indexOf(i.charAt(h))<<18|u.indexOf(i.charAt(h+1))<<12|(t=u.indexOf(i.charAt(h+2)))<<6|(f=u.indexOf(i.charAt(h+3))))>>>16&255,n=c>>>8&255,a=255&c,A[h/4]=String.fromCharCode(o,n,a),64==f&&(A[h/4]=String.fromCharCode(o,n)),64==t&&(A[h/4]=String.fromCharCode(o));return d=A.join(""),e?d.decodeUTF8():d}},Utf8={encode:function(r){var e=r.replace(/[\u0080-\u07ff]/g,function(r){var e=r.charCodeAt(0);return String.fromCharCode(192|e>>6,128|63&e)});return e=e.replace(/[\u0800-\uffff]/g,function(r){var e=r.charCodeAt(0);return String.fromCharCode(224|e>>12,128|e>>6&63,128|63&e)})},decode:function(r){var e=r.replace(/[\u00e0-\u00ef][\u0080-\u00bf][\u0080-\u00bf]/g,function(r){var e=(15&r.charCodeAt(0))<<12|(63&r.charCodeAt(1))<<6|63&r.charCodeAt(2);return String.fromCharCode(e)});return e=e.replace(/[\u00c0-\u00df][\u0080-\u00bf]/g,function(r){var e=(31&r.charCodeAt(0))<<6|63&r.charCodeAt(1);return String.fromCharCode(e)})}};

class SessionAes {
    #serverPub;
    #clientPub;
    #signatureKey;

    constructor(clientPub) {
        if (!clientPub) {
            this.#clientPub = generateId(32);
        } else {
            this.#clientPub = clientPub;
        }
    }

    updateServer (serverPub) {
        this.#serverPub = serverPub;
        this.#signatureKey = this.#clientPub.split('').slice(0, 12).join('') + this.#serverPub.split('').slice(0, 12).join('');
    }

    sessionId () {
        try {
            const sessionId = this.#clientPub.split('').slice(0, 12).join('') + this.#serverPub.split('').slice(0, 12).join('') + this.#signatureKey.split('').slice(0, 12).join('');
            if (sessionId.length !== 36) {
                return undefined;
            }
            return sessionId;
        } catch (e) {
            console.log(e, this.stringifyKeys())
        }
    }

    stringifyKeys () {
        return {
            client: this.#clientPub,
            server: this.#serverPub || '',
            signature: this.#signatureKey || ''
        };
    }

    async encrypt (data) {
        data = JSON.stringify(data);
        return `${Aes.Ctr.encrypt(data, this.#clientPub, 256)}:${Aes.Ctr.encrypt(await getSHA256Hash(data), this.#signatureKey, 256)}`
    }

    async decrypt (encryption, id) {
        return Aes.Ctr.decrypt(encryption, this.#serverPub + await getSHA256Hash(id.toString()), 256);
    }
}

module.exports = SessionAes;