const {convertAddressToUserFriendly} = require("./assets/utils");
const isEqual = require('is-equal');
const {getSHA256Hash} = require("./aes");

class SubscribeTransaction {
    #checkers = [];
    confirmed = []
    constructor(address, api) {
        this.api = api;
        if (address.includes('0:')) {
            address = convertAddressToUserFriendly(address);
        }
        this.address = address;
        this.#check()
    }

    initChecker (checkerInit) {
        if (this.#checkers.length > 0) {
            let alreadyUse = false;
            for (const checker of this.#checkers) {
                if (isEqual(checker, checkerInit)) {
                    alreadyUse = true;
                    break;
                }
            }
            if (alreadyUse) {
                return false;
            }
            this.#checkers.push(checkerInit);
            return true;
        } else {
            this.#checkers.push(checkerInit);
            return true;
        }
    }

    #check () {
        const mama = setInterval(async () => {
            try {
                if (this.closeCheckers === true) {
                    clearInterval(mama);
                }
                for (let i = 0; i < this.#checkers.length; i++) {
                    const events = await this.api.events(this.#checkers[i].sender);
                    let approved = false;
                    for (const event of events.events) {
                        try {
                            let approved2 = false;
                            for (const action of event.actions) {
                                if (action.status === 'ok') {
                                    let approved3 = false;
                                    for (const message of this.#checkers[i].chunk) {
                                        console.log(message, action[action.type])
                                        if (action[action.type].comment === message.comment && convertAddressToUserFriendly(this.address) === convertAddressToUserFriendly(action[action.type].recipient.address)) {
                                            approved3 = true
                                            break;
                                        }
                                    }
                                    if (approved3) {
                                        approved2 = true;
                                        break;
                                    }
                                }
                            }
                            if (approved2) {
                                approved = true;
                                break;
                            }
                        } catch (e) {
                        }
                    }
                    if (approved) {
                        let notify = true;
                        const superChunk = this.#checkers[i].chunk;
                        superChunk.push(this.#checkers[i].userInfo);
                        if (!this.confirmed.includes(await getSHA256Hash(superChunk))) {
                            notify = true;
                            this.confirmed.push(await getSHA256Hash(superChunk))
                        } else {
                            notify = false;
                        }
                        if (notify) {
                            this.#checkers[i].callback(this.#checkers[i]);
                        }
                        this.#checkers = this.#checkers.slice(0, i).concat(this.#checkers.slice(-i));
                    }
                }
            } catch (e) {

            }
        }, 60 * 1000);
    }
    close () {
        this.#checkers = [];
        this.closeCheckers = true;
    }
}

module.exports = SubscribeTransaction;