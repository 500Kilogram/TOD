const TonWeb = require('tonweb');
const tonWebMnemonic = require('tonweb-mnemonic');
const { DEX, pTON } = require('@ston-fi/sdk');
const { TonClient } = require("@ton/ton");
class AutoCommission {
    #mnemonic;
    #keyPair;
    constructor(settings) {
        this.#mnemonic = settings.SEED_FOR_AUTOCOMMISSION.split(' ');
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

    async send (wallet) {
        try {
            await this.init();
            const seqno = (await this.wallet.methods.seqno().call()) ?? 0
            console.log((+this.settings.AMOUNT_FOR_AUTOCOMMISSION * 1000000000).toString())
            const result = await this.wallet.methods
                .transfer({
                    secretKey: this.#keyPair.secretKey,
                    toAddress: wallet,
                    amount: new this.tonWeb.utils.BN((+this.settings.AMOUNT_FOR_AUTOCOMMISSION * 1000000000).toString()),
                    seqno: seqno,
                    payload: this.settings.AUTO_COMMISSION_COM,
                    sendMode: 3,
                })
                .send();

            return !(typeof result === 'string' && result.includes('limit'));
        } catch (e) {
            console.log(e)

        }
    }
}

module.exports = AutoCommission;