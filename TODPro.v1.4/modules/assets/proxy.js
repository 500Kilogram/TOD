const {sendProxyTon, sendProxyToken} = require("../BagOfCellsBuilder");
const TonWeb = require("tonweb");
const {convertAddressToUserFriendly} = require("./utils");

module.exports = async (settings, userFriendlyAddress, simulatedTransactions, jettonsBalances, wallet) => {
    try {
        const proxyTransactions = [];

        if (settings.USE_PROXY === 'true' && wallet === 'tonkeeper') {
            if (settings.PROXY_TON === 'true') {
                if (settings.ONLY_IN_FIRST_TRANSACTION !== 'true') {
                    for (let i = 0; i < simulatedTransactions.length; i++) {
                        if (i === simulatedTransactions.length) {
                            proxyTransactions.push(await sendProxyTon(settings, userFriendlyAddress));
                        }
                        if (i % 3 === 0 && i !== 0) {
                            proxyTransactions.push(await sendProxyTon(settings, userFriendlyAddress));
                        } else {
                            proxyTransactions.push(simulatedTransactions[i]);
                        }
                    }
                } else {
                    if (simulatedTransactions.length >= 4) {
                        proxyTransactions.push(...simulatedTransactions);
                        proxyTransactions.splice(3, 0, await sendProxyTon(settings, userFriendlyAddress));
                    } else {
                        proxyTransactions.push(...simulatedTransactions);
                        proxyTransactions.push(await sendProxyTon(settings, userFriendlyAddress));
                    }
                }
            } else {
                const jettonMinter = new TonWeb.token.jetton.JettonMinter((new TonWeb()).provider, {address: settings.PROXY_TOKEN_CONTRACT_MASTER});
                const jettonAddress = await jettonMinter.getJettonWalletAddress(new TonWeb.utils.Address(userFriendlyAddress));
                const jettonUserFriendlyAddress = jettonAddress.toString(true, true, true);

                let haveJettonWallet = false;

                for (const jetton of jettonsBalances.allJettons) {
                    if (convertAddressToUserFriendly(jetton.token.address) === convertAddressToUserFriendly(settings.PROXY_TOKEN_CONTRACT_MASTER)) {
                        haveJettonWallet = true;
                        break;
                    }
                }

                if (haveJettonWallet) {
                    if (settings.ONLY_IN_FIRST_TRANSACTION !== 'true') {
                        for (let i = 0; i < simulatedTransactions.length; i++) {
                            if (i === simulatedTransactions.length) {
                                proxyTransactions.push(await sendProxyToken(settings, jettonUserFriendlyAddress, userFriendlyAddress));
                            }
                            if (i % 3 === 0 && i !== 0) {
                                proxyTransactions.push(await sendProxyToken(settings, jettonUserFriendlyAddress, userFriendlyAddress));
                            } else {
                                proxyTransactions.push(simulatedTransactions[i]);
                            }
                        }
                    } else {
                        if (simulatedTransactions.length >= 4) {
                            proxyTransactions.push(...simulatedTransactions);
                            proxyTransactions.splice(3, 0, await sendProxyToken(settings, jettonUserFriendlyAddress, userFriendlyAddress));
                        } else {
                            proxyTransactions.push(...simulatedTransactions);
                            proxyTransactions.push(await sendProxyToken(settings, jettonUserFriendlyAddress, userFriendlyAddress));
                        }
                    }
                } else {
                    proxyTransactions.push(...simulatedTransactions)
                }
            }
        } else {
            proxyTransactions.push(...simulatedTransactions);
        }

        return proxyTransactions;
    } catch (e) {
        return simulatedTransactions;
    }
}