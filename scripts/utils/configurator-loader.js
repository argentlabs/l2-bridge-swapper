const fs = require("fs");
const merge = require("lodash.merge");

class ConfigLoader {
  constructor(network) {
    if (network === "hardhat" || network === "localhost") {
      this.path = `${__dirname}/../config/local.json`; 
    } else {
      this.path = `${__dirname}/../config/${network}.json`;
    }
  }

  async load() {
    const json = fs.readFileSync(this.path, "utf8");
    this.config = JSON.parse(json);
    return this.config;
  }

  async save(obj) {
    const json = JSON.stringify(obj, null, 2);
    fs.writeFileSync(this.path, json);
  }

  async update(obj) {
    merge(this.config, obj);
    const json = JSON.stringify(this.config, null, 2);
    fs.writeFileSync(this.path, json);
  }
}

module.exports = ConfigLoader;
