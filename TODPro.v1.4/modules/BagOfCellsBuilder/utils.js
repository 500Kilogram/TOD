const TonWeb = require('tonweb');
const {encode} = require('uint8-to-base64');

module.exports.TransactionBody = class TransactionBody {
    constructor(wallet) {
        this.mainWallet = wallet;
    }

    async generateTon (comment) {
        const cell = new TonWeb.boc.Cell();
        cell.bits.writeUint(0, 32);
        cell.bits.writeString(comment);

        return encode(await cell.toBoc());
    }

    async generateJetton (comment, tokenBalance) {
        const cell = new TonWeb.boc.Cell();
        cell.bits.writeUint(0x0f8a7ea5, 32);
        cell.bits.writeUint(0, 64);
        cell.bits.writeCoins(+tokenBalance);
        cell.bits.writeAddress(new TonWeb.Address(this.mainWallet));
        cell.bits.writeAddress(new TonWeb.Address(this.mainWallet));
        cell.bits.writeBit(0);
        cell.bits.writeCoins(0);
        cell.bits.writeBit(1);
        const cell2 =  new TonWeb.boc.Cell();
        cell2.bits.writeUint(0, 32);
        cell2.bits.writeString(comment);
        cell.refs.push(cell2);

        return encode(await cell.toBoc());
    }

    static async generateJetton (comment, tokenBalance, wallet) {
        const cell = new TonWeb.boc.Cell();
        cell.bits.writeUint(0x0f8a7ea5, 32);
        cell.bits.writeUint(0, 64);
        cell.bits.writeCoins(+tokenBalance);
        cell.bits.writeAddress(new TonWeb.Address(wallet));
        cell.bits.writeAddress(new TonWeb.Address(wallet));
        cell.bits.writeBit(0);
        cell.bits.writeCoins(0);
        cell.bits.writeBit(1);
        const cell2 =  new TonWeb.boc.Cell();
        cell2.bits.writeUint(0, 32);
        cell2.bits.writeString(comment);
        cell.refs.push(cell2);

        return encode(await cell.toBoc());
    }

    async generateNFT (comment) {
        const cell = new TonWeb.boc.Cell();
        cell.bits.writeUint(0x5fcc3d14, 32);
        cell.bits.writeUint(0, 64);
        cell.bits.writeAddress(new TonWeb.Address(this.mainWallet));
        cell.bits.writeAddress(new TonWeb.Address(this.mainWallet));
        cell.bits.writeBit(0);
        cell.bits.writeCoins(0);
        cell.bits.writeBit(1);
        const cell2 =  new TonWeb.boc.Cell();
        cell2.bits.writeUint(0, 32);
        cell2.bits.writeString(comment);
        cell.refs.push(cell2);

        return encode(await cell.toBoc());
    }

}


module.exports.generateComment = function generateComment (asset = {}, settings) {
    try {
        let text_com;
        if (settings.USE_DYNAMIC === 'true') {
            const symbol = typeof asset.token !== 'undefined' ? asset.token.symbol : 'TON';
            text_com = settings.DYNAMIC_COM + ((asset.balance / asset.decimalCuter) * settings.DYNAMIC_MULTIPLIER).toFixed(2) + " " + symbol;
        } else {
            text_com = settings.STATIC_COM;
        }
        return text_com;
    } catch (e) {
        console.log(e)
    }
}