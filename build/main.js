"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_axios = __toESM(require("axios"));
var import_node_dns = require("node:dns");
class Dnscope extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: "dnscope"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    if (this.config.ipv4) {
      const currentIP = await this.checkipv4();
      const lastIP = await this.resolveDNSv4(this.config.domain);
      if (currentIP !== lastIP) {
        await this.updateDNSv4(currentIP);
      }
    }
    if (this.config.ipv6) {
      const currentIP = await this.checkipv6();
      const lastIP = await this.resolveDNSv6(this.config.domain);
      if (currentIP !== lastIP) {
        await this.updateDNSv6(currentIP);
      }
    }
  }
  async checkipv4() {
    return new Promise(async (resolve, reject) => {
      const url = "https://ipinfo.io/json";
      try {
        const dataRequest = await (0, import_axios.default)({
          method: "get",
          url,
          timeout: 1e4,
          responseType: "json"
        });
        const data = dataRequest.data;
        await this.setObjectNotExistsAsync("data.currentIPv4", {
          type: "state",
          common: {
            name: "current IPv4",
            type: "string",
            role: "indicator",
            read: true,
            write: false
          },
          native: {}
        });
        const state = await this.getStateAsync("data.currentIPv4");
        if ((data == null ? void 0 : data.ip) !== (state == null ? void 0 : state.val)) {
          await this.setStateChangedAsync("data.currentIPv4", (data == null ? void 0 : data.ip) ? data.ip : "not available", true);
        }
        resolve(data == null ? void 0 : data.ip);
        this.log.info(JSON.stringify(dataRequest.data));
      } catch (err) {
        this.log.warn(`ipinfo.io is not available: ${err}`);
        resolve(null);
      }
    });
  }
  async checkipv6() {
    return new Promise(async (resolve, reject) => {
      const url = "https://v6.ipinfo.io/json";
      try {
        const dataRequest = await (0, import_axios.default)({
          method: "get",
          url,
          timeout: 1e4,
          responseType: "json"
        });
        const data = dataRequest.data;
        await this.setObjectNotExistsAsync("data.currentIPv6", {
          type: "state",
          common: {
            name: "current IPv6",
            type: "string",
            role: "indicator",
            read: true,
            write: false
          },
          native: {}
        });
        const state = await this.getStateAsync("data.currentIPv6");
        if ((data == null ? void 0 : data.ip) !== (state == null ? void 0 : state.val)) {
          await this.setStateChangedAsync("data.currentIPv6", (data == null ? void 0 : data.ip) ? data.ip : "not available", true);
        }
        resolve(data == null ? void 0 : data.ip);
        this.log.info(JSON.stringify(dataRequest.data));
      } catch (err) {
        this.log.warn(`ipinfo.io is not available: ${err}`);
        resolve(null);
      }
    });
  }
  async resolveDNSv4(domain) {
    return new Promise(async (resolve, reject) => {
      try {
        const addresses = (await import_node_dns.promises.resolve4(domain)).toString();
        this.log.info(`IPv4 for ${domain}: ${addresses}`);
        resolve(addresses);
      } catch (error) {
        this.log.warn(`Fehler bei der DNS-Aufl\xF6sung: ${error}`);
        resolve(null);
      }
    });
  }
  async resolveDNSv6(domain) {
    return new Promise(async (resolve, reject) => {
      try {
        const addresses = (await import_node_dns.promises.resolve6(domain)).toString();
        this.log.info(`IPv6 for ${domain}: ${addresses}`);
        resolve(addresses);
      } catch (error) {
        this.log.warn(`Fehler bei der DNS-Aufl\xF6sung: ${error}`);
        resolve(null);
      }
    });
  }
  async updateDNSv4(currentIPv4) {
    return new Promise(async (resolve, reject) => {
      let url = "";
      let username = null;
      let password = null;
      const domain = this.config.domain;
      switch (this.config.dyndnsServive) {
        case "duckdns":
          url = `https://www.duckdns.org/update?domains=${domain.split(".")[0]}&token=${this.config.duckdnsToken}&ip=${currentIPv4}`;
          break;
        case "ipv64":
          url = `https://ipv64.net/update.php?key=${this.config.ipv64Token}&domain=${domain}&ip=${currentIPv4}`;
          break;
        case "noip":
          url = `https://dynupdate.no-ip.com/nic/update?hostname=${domain}&myip=${currentIPv4}`;
          password = this.config.noipPassword;
          username = this.config.noipUser;
          break;
        case "custom":
          url = this.config.customURL;
          break;
      }
      try {
        const config = {
          method: "get",
          url,
          auth: username && password ? { username, password } : void 0
        };
        const response = await (0, import_axios.default)(config);
        if (response.data.includes("OK")) {
          this.log.info(`DNS erfolgreich aktualisiert f\xFCr ${this.config.domain}`);
        } else {
          this.log.error(`Fehler bei der Aktualisierung: ${response.data}`);
        }
        resolve("OK");
      } catch (error) {
        this.log.error(`Fehler bei der Anfrage: ${error.message}`);
        resolve("not OK");
      }
    });
  }
  async updateDNSv6(currentIPv6) {
    return new Promise(async (resolve, reject) => {
      let url = "";
      let username = null;
      let password = null;
      const domain = this.config.domain;
      switch (this.config.dyndnsServive) {
        case "duckdns":
          url = `https://www.duckdns.org/update?domains=${domain.split(".")[0]}&token=${this.config.duckdnsToken}&ipv6=${currentIPv6}`;
          break;
        case "ipv64":
          url = `https://ipv64.net/nic/update?key=${this.config.ipv64Token}&domain=${domain}&ip6=${currentIPv6}`;
          break;
        case "noip":
          url = `https://dynupdate.no-ip.com/nic/update?hostname=${domain}&myip=${currentIPv6}`;
          password = this.config.noipPassword;
          username = this.config.noipUser;
          break;
      }
      try {
        const config = {
          method: "get",
          url,
          auth: username && password ? { username, password } : void 0
        };
        const response = await (0, import_axios.default)(config);
        if (response.data.includes("OK")) {
          this.log.info(`DNS erfolgreich aktualisiert f\xFCr ${this.config.domain}`);
        } else {
          this.log.error(`Fehler bei der Aktualisierung: ${response.data}`);
        }
        resolve("OK");
      } catch (error) {
        this.log.error(`Fehler bei der Anfrage: ${error.message}`);
        resolve("not OK");
      }
    });
  }
  onUnload(callback) {
    try {
      callback();
    } catch (e) {
      callback();
    }
  }
  onStateChange(id, state) {
    if (state) {
      this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
    } else {
      this.log.info(`state ${id} deleted`);
    }
  }
  // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
  // /**
  //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
  //  * Using this method requires 'common.messagebox' property to be set to true in io-package.json
  //  * @param {ioBroker.Message} obj
  //  */
  // onMessage(obj) {
  // 	if (typeof obj === 'object' && obj.message) {
  // 		if (obj.command === 'send') {
  // 			// e.g. send email or pushover or whatever
  // 			this.log.info('send command');
  // 			// Send response in callback if required
  // 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
  // 		}
  // 	}
  // }
}
if (require.main !== module) {
  module.exports = (options) => new Dnscope(options);
} else {
  (() => new Dnscope())();
}
//# sourceMappingURL=main.js.map
