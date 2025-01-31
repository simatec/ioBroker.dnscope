'use strict';

const utils = require('@iobroker/adapter-core');
const axios = require('axios');

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
			const url = 'https://ipinfo.io/json';
			try {
				const dataRequest = await axios({
					method: 'get',
					url: url,
					responseType: 'json'
				});

				this.log.info(JSON.stringify(dataRequest.data));
			} catch (err) {
				this.log.warn(`ipinfo.io is not available: ${err}`);
			}
		}

		if (this.config.ipv6) {
			const url = 'https://v6.ipinfo.io/json';
			try {
				const dataRequest = await axios({
					method: 'get',
					url: url,
					responseType: 'json'
				});

				this.log.info(JSON.stringify(dataRequest.data));
			} catch (err) {
				this.log.warn(`ipinfo.io is not available: ${err}`);
			}
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