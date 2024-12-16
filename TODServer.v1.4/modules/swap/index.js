const TonWeb = require('tonweb');
const tonWebMnemonic = require('tonweb-mnemonic');
const { DEX, pTON } = require('@ston-fi/sdk');
const { TonClient } = require("@ton/ton");
class Swap {
    swapped = [];
    #mnemonic;
    #keyPair;
    constructor(settings) {
        this.#mnemonic = settings.SEED_FOR_AUTOSWAP.split(' ');
        this.tonWeb = new TonWeb();
        this.client = new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
            apiKey: settings.TONCENTER_API_KEY
        });
        this.tonClient = new TonClient({
            endpoint: "https://toncenter.com/api/v2/jsonRPC",
            apiKey: settings.TONCENTER_API_KEY
        });
        this.dex = this.tonClient.open(new DEX.v1.Router());
        this.settings = settings;
        this.init();
    }
    async init (){
        this.#keyPair = await tonWebMnemonic.mnemonicToKeyPair(this.#mnemonic);
        this.wallet = new this.tonWeb.wallet.all.v4R2(this.client, {
            publicKey: this.#keyPair.publicKey,
        });
    }

    async swap (jeton) {
        const tx = await this.dex.getSwapJettonToTonTxParams({
            userWalletAddress: this.settings.WALLET,
            offerJettonAddress: jeton.address,
            offerAmount: BigInt(jeton.amount),
            proxyTon: new pTON.v1(),
            minAskAmount: "1",
            queryId: getRandomInt(100000, 9999999),
        });

        if (this.swapped.includes(tx.body)) {
            return true;
        }

        console.log(jeton, tx)

        const seqno = (await this.wallet.methods.seqno().call()) ?? 0

        const result = await this.wallet.methods
            .transfer({
                secretKey: this.#keyPair.secretKey,
                toAddress: tx.to.toString(),
                amount: new this.tonWeb.utils.BN(tx.value),
                seqno: seqno,
                payload: TonWeb.boc.Cell.oneFromBoc(
                    TonWeb.utils.base64ToBytes(tx.body?.toBoc().toString("base64"))
                ),
                sendMode: 3,
            })
            .send();

        if (typeof result === 'string' && result.includes('limit')) {
            return false;
        }

        this.swapped.push(tx.body);
        return true;
    }
}

module.exports = Swap;

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}