'use strict';

const utils = require('@iobroker/adapter-core');
const axios = require('axios');
const dns = require('node:dns').promises;

const adapterName = require('./package.json').name.split('.').pop();

class Dnscope extends utils.Adapter {

	/**
	 * @param [options]
	 */
	constructor(options) {
		super({
			...options,
			name: adapterName,
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
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
			const url = 'https://ipinfo.io/json';
			try {
				const dataRequest = await axios({
					method: 'get',
					url: url,
					timeout: 10000,
					responseType: 'json'
				});

				const data = dataRequest.data;

				await this.setObjectNotExistsAsync('data.currentIPv4', {
					type: 'state',
					common: {
						name: 'current IPv4',
						type: 'string',
						role: 'indicator',
						read: true,
						write: false,
					},
					native: {},
				});
				const state = await this.getStateAsync('data.currentIPv4');

				if (data?.ip !== state?.val) {
					await this.setStateChangedAsync('data.currentIPv4', data?.ip ? data.ip : 'not available', true);
				}
				resolve(data?.ip);

				this.log.info(JSON.stringify(dataRequest.data));
			} catch (err) {
				this.log.warn(`ipinfo.io is not available: ${err}`);
				resolve(null);
			}
		});
	}

	async checkipv6() {
		return new Promise(async (resolve, reject) => {
			const url = 'https://v6.ipinfo.io/json';
			try {
				const dataRequest = await axios({
					method: 'get',
					url: url,
					timeout: 10000,
					responseType: 'json'
				});

				const data = dataRequest.data;

				await this.setObjectNotExistsAsync('data.currentIPv6', {
					type: 'state',
					common: {
						name: 'current IPv6',
						type: 'string',
						role: 'indicator',
						read: true,
						write: false,
					},
					native: {},
				});
				const state = await this.getStateAsync('data.currentIPv6');

				if (data?.ip !== state?.val) {
					await this.setStateChangedAsync('data.currentIPv6', data?.ip ? data.ip : 'not available', true);
				}
				resolve(data?.ip);

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
				const addresses = await dns.resolve4(domain);
				this.log.info(`IPv4 for ${domain}: ${addresses}`);
				resolve(addresses);
			} catch (error) {
				this.log.warn(`Fehler bei der DNS-Auflösung: ${error}`);
				resolve(null);
			}
		});
	}

	async resolveDNSv6(domain) {
		return new Promise(async (resolve, reject) => {
			try {
				const addresses = await dns.resolve6(domain);
				this.log.info(`IPv6 for ${domain}: ${addresses}`);
				resolve(addresses);
			} catch (error) {
				this.log.warn(`Fehler bei der DNS-Auflösung: ${error}`);
				resolve(null);
			}
		});
	}

	async updateDNSv4(currentIPv4) {
		let url = '';
		let username = null;
		let password = null;
		const domain = this.config.domain;

		switch (this.config.dyndnsServive) {
			case 'duckdns':
				url = `https://www.duckdns.org/update?domains=${domain.split('.')[0]}&token=${this.config.duckdnsToken}&ip=${currentIPv4}`;
				break;
			case 'ipv64':
				url = `https://ipv64.net/update.php?key=${this.config.ipv64Token}&domain=${domain}&ip=${currentIPv4}`;
				break;
			case 'noip':
				url = `https://dynupdate.no-ip.com/nic/update?hostname=${domain}&myip=${currentIPv4}`;
				password = this.config.noipPassword;
				username = this.config.noipUser;
				break;
			case 'custom':
				url = this.config.customURL;
				break;
		}

		try {
			const config = {
				method: 'get',
				url: url,
				auth: username && password ? { username, password } : null
			};

			const response = await axios(config);

			if (response.data.includes("OK")) {
				this.log.info(`DNS erfolgreich aktualisiert für ${this.config.domain}`);
			} else {
				this.log.error(`Fehler bei der Aktualisierung: ${response.data}`);
			}
		} catch (error) {
			this.log.error(`Fehler bei der Anfrage: ${error.message}`);
		}
	}

	async updateDNSv6(currentIPv6) {
		let url = '';
		let username = null;
		let password = null;
		const domain = this.config.domain;

		switch (this.config.dyndnsServive) {
			case 'duckdns':
				url = `https://www.duckdns.org/update?domains=${domain.split('.')[0]}&token=${this.config.duckdnsToken}&ipv6=${currentIPv6}`;
				break;
			case 'ipv64':
				url = `https://ipv64.net/nic/update?key=${this.config.ipv64Token}&domain=${domain}&ip6=${currentIPv6}`;
				break;
			case 'noip':
				url = `https://dynupdate.no-ip.com/nic/update?hostname=${domain}&myip=${currentIPv6}`;
				password = this.config.noipPassword;
				username = this.config.noipUser;
				break;
		}

		try {
			const config = {
				method: 'get',
				url: url,
				auth: username && password ? { username, password } : null
			};

			const response = await axios(config);
			if (response.data.includes("OK")) {
				this.log.info(`DNS erfolgreich aktualisiert für ${this.config.domain}`);
			} else {
				this.log.error(`Fehler bei der Aktualisierung: ${response.data}`);
			}
		} catch (error) {
			this.log.error(`Fehler bei der Anfrage: ${error.message}`);
		}
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 *
	 * @param callback
	 */
	onUnload(callback) {
		try {

			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * @param id
	 * @param state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
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
	// Export the constructor in compact mode
	/**
	 * @param [options]
	 */
	module.exports = (options) => new Dnscope(options);
} else {
	// otherwise start the instance directly
	new Dnscope();
}