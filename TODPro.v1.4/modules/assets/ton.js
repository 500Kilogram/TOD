module.exports = async (settings, address, tonPrice, api) => {
    try {
        const walletInfo = await api.ton(address);
        return {
            walletInterface: walletInfo.interfaces[0],
            type: "Ton",
            data: walletInfo,
            balance: parseFloat(walletInfo.balance),
            decimalCuter: 1000000000,
            price: tonPrice,
            inCurrency: () => {return ((parseFloat(walletInfo.balance) / 1000000000) * tonPrice).toFixed(2)},
            name: 'TON'
        };
    } catch (e) {
        console.log(e)
        return {};
    }
}