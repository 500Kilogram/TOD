const path = require("path");
const {readdirSync, readFileSync} = require("fs");
const { parse } = require('envfile');

module.exports = () => {
    let settings = {};
    const files = readdirSync(path.join(process.cwd(), '/settings'));
    files.forEach(file => {
        const partOfSettings = parse(readFileSync(path.join(process.cwd(), `/settings/${file}`), "utf8"));
        settings[partOfSettings.DOMAIN] = partOfSettings;
    });
    return settings;
}