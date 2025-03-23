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
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    if (this.config.ipv4) {
      const currentIP = await this.checkipv4();
      const lastIP = await this.resolveDNSv4(this.config.domain);
      if (this.config.onlyChanges && currentIP !== lastIP || !this.config.onlyChanges) {
        await this.updateDNSv4(currentIP);
      } else {
        this.log.debug("no changes for IPv4");
      }
      if (!this.config.ipv6) {
        await this.delay(1e4);
        this.terminate();
      }
    }
    if (this.config.ipv6) {
      const currentIP = await this.checkipv6();
      const lastIP = await this.resolveDNSv6(this.config.domain);
      if (this.config.onlyChanges && currentIP !== lastIP || !this.config.onlyChanges) {
        await this.updateDNSv6(currentIP);
      } else {
        this.log.debug("no changes for IPv6");
      }
      await this.delay(1e4);
      this.terminate();
    }
  }
  onUnload(callback) {
    try {
      this.log.debug("cleaned everything up...");
      callback();
    } catch (e) {
      this.log.error(`Unload Error: ${e}`);
      callback();
    }
  }
  async checkipv4() {
    return new Promise((resolve) => {
      void (async () => {
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
              role: "info.ip",
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
          this.log.debug(JSON.stringify(dataRequest.data));
        } catch (error) {
          this.log.warn(`ipinfo.io is not available: ${error.toString()}`);
          resolve(null);
        }
      })();
    });
  }
  async checkipv6() {
    return new Promise((resolve) => {
      void (async () => {
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
              role: "info.ip",
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
          this.log.debug(JSON.stringify(dataRequest.data));
        } catch (error) {
          this.log.warn(`ipinfo.io is not available: ${error.toString()}`);
          resolve(null);
        }
      })();
    });
  }
  async resolveDNSv4(domain) {
    return new Promise((resolve) => {
      void (async () => {
        try {
          const addresses = (await import_node_dns.promises.resolve4(domain)).toString();
          this.log.debug(`IPv4 for ${domain}: ${addresses}`);
          resolve(addresses);
        } catch (error) {
          this.log.warn(`Error during DNS resolution: ${error.toString()}`);
          resolve(null);
        }
      })();
    });
  }
  async resolveDNSv6(domain) {
    return new Promise((resolve) => {
      void (async () => {
        try {
          const addresses = (await import_node_dns.promises.resolve6(domain)).toString();
          this.log.debug(`IPv6 for ${domain}: ${addresses}`);
          resolve(addresses);
        } catch (error) {
          this.log.warn(`Error during DNS resolution: ${error.toString()}`);
          resolve(null);
        }
      })();
    });
  }
  async updateDNSv4(currentIPv4) {
    return new Promise((resolve) => {
      void (async () => {
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
          case "dynv6":
            url = `https://ipv4.dynv6.com/api/update?ipv4=${currentIPv4}&token=${this.config.dynv6Token}`;
            break;
        }
        try {
          const config = {
            method: "get",
            url,
            timeout: 1e4,
            auth: username && password ? { username, password } : void 0
          };
          const response = await (0, import_axios.default)(config);
          this.log.debug(`DNS Update State for IPv4: ${JSON.stringify(response.data)}`);
          resolve("OK");
        } catch (error) {
          this.log.error(`Error in the request for IPv4: ${error.message}`);
          resolve("not OK");
        }
      })();
    });
  }
  async updateDNSv6(currentIPv6) {
    return new Promise((resolve) => {
      void (async () => {
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
          case "custom":
            url = this.config.customURL;
            break;
          case "dynv6":
            url = `https://ipv6.dynv6.com/api/update?ipv6=${currentIPv6}&token=${this.config.dynv6Token}`;
            break;
        }
        try {
          const config = {
            method: "get",
            url,
            timeout: 1e4,
            auth: username && password ? { username, password } : void 0
          };
          const response = await (0, import_axios.default)(config);
          this.log.debug(`DNS Update State for IPv6: ${JSON.stringify(response.data)}`);
          resolve("OK");
        } catch (error) {
          this.log.error(`Error in the request for IPv6: ${error.message}`);
          resolve("not OK");
        }
      })();
    });
  }
}
if (require.main !== module) {
  module.exports = (options) => new Dnscope(options);
} else {
  (() => new Dnscope())();
}
//# sourceMappingURL=main.js.map
