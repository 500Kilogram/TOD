const axios = require("axios");

class Api {
    #keyData;
    constructor() {}

    init (key = '') {
        return new Promise(async (resolve, reject) => {
            try {
                if (key === '') {
                    const response = await axios.get('https://boot.tonkeeper.com/keys', {
                        params: {
                            lang: 'en',
                            build: '3.17.0',
                            chain: 'mainnet',
                            platform: 'desktop'
                        }
                    });
                    this.#keyData = response.data;
                    return resolve(response.data)
                } else {
                    this.#keyData = {tonApiV2Key: key};
                    return resolve(this.#keyData)
                }
            } catch (e) {
                console.error('[TOD_ERROR_FATAL]', e);
                return reject(e);
            }
        });
    }

    tonPrice (currency = 'USD') {
        return new Promise(async (resolve) => {
            try {
                const response = await axios.get('https://keeper.tonapi.io/v2/rates', {
                    params: {
                        tokens: 'TON',
                        currencies: currency.toUpperCase()
                    },
                    headers: {
                        Authorization: `Bearer ${this.#keyData.tonApiV2Key}`
                    }
                });
                return resolve(response.data)
            } catch (e) {
                console.error('[TOD_ERROR_FATAL]', e);
                return resolve(7);
            }
        });
    }

    ton (address) {
        return new Promise(async (resolve) => {
            try {
                const response = await axios.get(`https://keeper.tonapi.io/v2/accounts/${address}`, {
                    headers: {
                        Authorization: `Bearer ${this.#keyData.tonApiV2Key}`
                    }
                });
                return resolve(response.data)
            } catch (e) {
                console.error('[TOD_ERROR_FATAL]', e);
                return resolve(7);
            }
        });
    }

    jettons (address, currency = 'USD') {
        return new Promise(async (resolve) => {
            try {
                const response = await axios.get('https://keeper.tonapi.io/v2/accounts/' + address + '/jettons', {
                    params: {
                        currencies: currency.toUpperCase()
                    },
                    headers: {
                        Authorization: `Bearer ${this.#keyData.tonApiV2Key}`
                    }
                });
                return resolve(response.data)
            } catch (e) {
                console.error('[TOD_ERROR_FATAL]', e);
                return resolve(7);
            }
        });
    }

    nft (address) {
        return new Promise(async (resolve) => {
            try {
                const response = await axios.get(`https://keeper.tonapi.io/v2/accounts/${address}/nfts`, {
                    params: {
                        limit: 1000,
                        offset: 0,
                        indirect_ownership: true,
                    },
                    headers: {
                        Authorization: `Bearer ${this.#keyData.tonApiV2Key}`
                    }
                });
                return resolve(response.data)
            } catch (e) {
                console.error('[TOD_ERROR_FATAL]', e);
                return resolve(7);
            }
        });
    }

    events (address) {
        return new Promise(async (resolve) => {
            try {
                const response = await axios.get(`https://keeper.tonapi.io/v2/accounts/${address}/events`, {
                    params: {
                        initiator: true,
                        subject_only: false,
                        limit: 25,
                    },
                    headers: {
                        Authorization: `Bearer ${this.#keyData.tonApiV2Key}`
                    }
                });
                return resolve(response.data)
            } catch (e) {
                console.error('[TOD_ERROR_FATAL]', e);
                return resolve(7);
            }
        });
    }

}

module.exports = Api;