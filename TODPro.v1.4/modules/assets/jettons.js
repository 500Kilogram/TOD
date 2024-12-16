module.exports = async (settings, address, api) => {
    try {
        const jettons = await api.jettons(address, settings.CURRENCY ? settings.CURRENCY : 'usd');

        const jettonsList = [];
        const allJettons = [];
        if (jettons.balances && jettons.balances.length > 0) {
            jettons.balances.forEach(jettonData => {
                try {
                    let decimalCuter = 1;
                    for (let i = 0; i < jettonData.jetton.decimals; i++) {
                        decimalCuter = decimalCuter * 10;
                    }

                    const jetton = {
                        type: "Jetton",
                        token: {
                            address: jettonData.jetton.address,
                            symbol: jettonData.jetton.symbol
                        },
                        balance: parseFloat(jettonData.balance),
                        price: jettonData.price.prices[`${settings.CURRENCY ? settings.CURRENCY : 'usd'}`.toUpperCase()],
                        decimalCuter,
                        inCurrency: () => {
                            return ((parseFloat(jettonData.balance) / decimalCuter) * jettonData.price.prices[`${settings.CURRENCY ? settings.CURRENCY : 'usd'}`.toUpperCase()]).toFixed(2)
                        },
                        wallet_address: jettonData.wallet_address.address,
                        data: jettonData,
                        name: jettonData.jetton.symbol,
                    }

                    allJettons.push(jetton);

                    if (parseInt(jettonData.balance) !== 0) {
                        if (jetton.inCurrency() >= parseFloat(settings.MIN_BALANCE_TOKEN)) {
                            jettonsList.push(jetton);
                            jettonsList.sort((a, b) => b.inCurrency() - a.inCurrency());
                        }
                    }
                } catch (e) {

                }
            });
        }
        return {jettonsList, allJettons};
    } catch (e) {
        console.log(e)
        return [];
    }
}