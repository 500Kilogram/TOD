const axios = require("axios");

async function fetchWithApiKey(url, apiKey) {
    try {
        const response = await axios.get(url, {
            headers: {
                'X-API-KEY': apiKey
            }
        });
        return response.data;
    } catch (e) {
        return {};
    }
}

module.exports = async (settings, address, tonPrice, api) => {
    try {
        const nfts = await api.nft(address);
        const nftsList = []

        if (nfts && nfts.nft_items && nfts.nft_items.length > 0) {
            for (const nft of nfts.nft_items) {
                try {
                    if (nft.trust === 'whitelist' && nft.verified === true) {
                        const nftData = await fetchWithApiKey(`https://tonapi.nftscan.com/api/ton/assets/${nft.address}?show_attribute=true`, settings.API_KEY);

                        if (nftData && nftData.data) {
                            let price = 0;
                            if (nftData.data.latest_trade_price !== null || nftData.data.latest_trade_price) {
                                if (nftData.data.name.includes('Notcoin Voucher')) {
                                    price = 22;
                                } else {
                                    price = nftData.data.latest_trade_price;
                                }
                            } else if (nftData.data.mint_price !== null || nftData.data.mint_price) {
                                if (nftData.data.name.includes('Notcoin Voucher')) {
                                    price = 22;
                                } else {
                                    price = nftData.data.mint_price
                                }
                            }
                            price = price.toFixed(2)
                            if (price >= (settings.MIN_BALANCE_NFT / +tonPrice)) {
                                const nftItem = {
                                    type: "Nft",
                                    data: nftData.data.token_address,
                                    balance: price * 1000000000,
                                    decimalCuter: 1000000000,
                                    inCurrency: () => {return +(((parseFloat(price)) * +tonPrice).toFixed(2))},
                                    name: nftData.data.name,
                                };
                                nftsList.push(nftItem);
                                nftsList.sort((a, b) => b.inCurrency() - a.inCurrency());
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error fetching data for address:', nft.address, e);
                }
            }
        }
        return nftsList;
    } catch (e) {
        console.log(e)
        return [];
    }
}