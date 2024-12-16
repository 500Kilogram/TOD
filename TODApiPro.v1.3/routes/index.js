const express = require('express');
const router = express.Router();
const {SessionCrypto, Base64, __rest, convertToRpcRequest, hexToByteArray} = require('../utils/crypto');
const axios = require('axios');
const https = require('https');
const isEqual = require('is-equal');
const fs = require('node:fs');
const {randomUUID} = require('node:crypto');
const path = require('node:path');

const uniqueProductId = 'd451660d-d2df-4215-9f65-78400af4bc57';

const validateApiKey = (headers) => {
    if (!headers["authorization"]) {
        return false;
    }
    return headers['authorization'] === uniqueProductId;
}

const dots = ['.com', '.io', '.org', 'ton', '.xyz', '.fi'];


const getHeaders = (wallet, req) => {
    const template = (domain) => {
        return {
            'Host': domain,
            'Origin': `https://${domain}`,
            'Referer': `https://${domain}/`
        };
    }
    if (wallet === 'mytonwallet' || wallet === 'telegram-wallet') {
        return {
            Origin: null
        }// + dots[Math.floor(Math.random() * dots.length)])
    } else {
        return template('ston.fi')
    }
}

const getAppByName = async (appName)=>  {
    const response = await axios.get('https://raw.githubusercontent.com/ton-blockchain/wallets-list/main/wallets-v2.json');
    const wallets = response.data;
    let app;
    for (const wallet of wallets) {
        if (wallet.app_name === appName) {
            app = wallet;
            break;
        }
    }
    return app;
}

const getBridgeUrl = (app) => {
    let bridgeUrl;

    for (const bridge of app.bridge) {
        if (bridge.type === 'sse') {
            bridgeUrl = bridge.url;
            break;
        }
    }

    return bridgeUrl;
}

const agent = new https.Agent({
    rejectUnauthorized: false
});

router.get('/bridge/:wallet', async function (req, res, next) {
    if (!req.query.pub || !req.query.sec) {
        return res.status(400).json({message: 'You miss required params'});
    }

    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || req.headers.host || '*');

    const bridgeUrl = getBridgeUrl(await getAppByName(req.params.wallet));

    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const getStreamAxios = () => {
        axios.get(`${bridgeUrl}/events`.includes('//events') ? `${bridgeUrl}events` : `${bridgeUrl}/events`, {
            headers: {
                'Accept': 'text/event-stream',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 YaBrowser/24.4.0.0 Safari/537.36',
                ...getHeaders(req.params.wallet, req)
            },
            httpsAgent: agent,
            params: {
                client_id: req.query.pub
            },
            responseType: 'stream',
            adapter: 'fetch',
            signal: AbortSignal.timeout(30 * 1000)
        })
            .then(async (response) => {
                const stream = response.data;
                const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
                while (true) {
                    const {value, done} = await reader.read();
                    if (done) break;
                    res.write(`${value}`);
                }
            }).catch((e) => {
                return res.end();
        })
    }
    getStreamAxios()

    res.on('close', () => {
        res.end();
    });
});

router.post('/bridge/:wallet/message', async function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || req.headers.host || '*');
    if (!req.query?.client_id || !req.query?.topic || !req.query?.ttl || !req.query?.to) {
        return res.status(400).json({
            statusCode: 400,
            message: 'Bad request'
        });
    }

    const bridgeUrl = getBridgeUrl(await getAppByName(req.params.wallet));
    try {
        const response = await axios.post(`${bridgeUrl}/message`.includes('//message') ? `${bridgeUrl}message` : `${bridgeUrl}/message`, req.body, {
            params: {
                topic: req.query?.topic,
                ttl: req.query?.ttl,
                client_id: req.query?.client_id,
                to: req.query?.to
            },
            httpsAgent: agent,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 YaBrowser/24.4.0.0 Safari/537.36',
                'Content-type': 'text/plain;charset=UTF-8',
                ...getHeaders(req.params.wallet, req)
            }
        });

        return res.status(response.data.statusCode).json(response.data);
    } catch (e) {
        console.log(bridgeUrl, e)
        return res.status(503).json({statusCode: 503, message: 'Bad gateAway'});
    }
});

router.get('/bridge/:wallet/sendTransaction', async function (req, res, next) {
    try {
        if (!req.query.pub || !req.query.sec || !req.query.walletPublicKey || !req.query.address || !req.query.chunk) {
            return res.status(400).json({message: 'You miss required params'});
        }

        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || req.headers.host || '*');

        const session = new SessionCrypto({
            publicKey: req.query?.pub,
            secretKey: req.query?.sec
        });

        const bridgeUrl = getBridgeUrl(await getAppByName(req.params.wallet));

        console.log(JSON.parse(decodeURIComponent(req.query.chunk)))

        const transaction = {
            messages: JSON.parse(decodeURIComponent(req.query.chunk)),
            validUntil: Math.floor(Date.now() / 1000) + 100000
        }
        const from = req.query.address, {validUntil} = transaction, tx = __rest(transaction, ["validUntil"]);
        const message = convertToRpcRequest(Object.assign(Object.assign({}, tx), {
            valid_until: validUntil, from,
            network: '-239'
        }));
        const encodedRequest = session.encrypt(JSON.stringify(Object.assign(Object.assign({}, message), {id: 1})), hexToByteArray(req.query.walletPublicKey));
        const body = Base64.encode(encodedRequest)

        const response = await axios.post(`${bridgeUrl}/message`.includes('//message') ? `${bridgeUrl}message` : `${bridgeUrl}/message`, body, {
            params: {
                topic: 'sendTransaction',
                ttl: 300,
                client_id: req.query?.pub,
                to: req.query.walletPublicKey
            },
            httpsAgent: agent,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 YaBrowser/24.4.0.0 Safari/537.36',
                'Content-type': 'text/plain;charset=UTF-8',
                ...getHeaders(req.params.wallet, req)
            }
        });
        if (response.data.statusCode === 200) {
            return res.status(200).json({status: 'ok', data: 'Transaction sent to user'});
        } else {
            return res.status(400).json({status: 'Bad request', data: 'Transaction was decline'});
        }
    } catch (e) {
        console.log(e)
        return res.status(500).json({status: 'Bad request', data: 'Transaction was decline'});
    }
});

const manifests = {};

router.get('/manifest/build', async function (req, res, next) {
    try {
        if (!req.query.name || !req.query.url || !req.query.icon) {
            return res.status(400).json({message: 'You miss required params'});
        }

        if (!validateApiKey(req.headers)) {
            return res.status(403).json({code: 403, message: 'Invalid api key'}).end();
        }

        let manifestAlreadyExist = false;
        let manifestName;

        for (const i in manifests) {
            if (isEqual(manifests[i], req.query)) {
                manifestAlreadyExist = true;
                manifestName = i;
            }
        }

        if (!manifestAlreadyExist) {
            manifestName = randomUUID();

            fs.writeFileSync(path.join(process.cwd() + `/public/manifests/${manifestName}.json`), JSON.stringify(req.query));

            manifests[manifestName] = req.query;
        }

        return res.status(200).json({
            fileName: manifestName
        });
    } catch (e) {
        console.log(e)
        return res.status(500).json({status: 'Bad request', data: 'Transaction was decline'});
    }
});

module.exports = router;