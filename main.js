"use strict";

const utils = require("@iobroker/adapter-core");

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
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	async onReady() {
		// this.config:
		this.log.info(`config dyndnsServive: ${  this.config.dyndnsServive}`);
		this.log.info(`config ipv4: ${  this.config.ipv4}`);
		this.log.info(`config ipv6: ${  this.config.ipv6}`);
		this.log.info(`config onlyChanges: ${  this.config.onlyChanges}`);

		await this.setObjectNotExistsAsync("testVariable", {
			type: "state",
			common: {
				name: "testVariable",
				type: "boolean",
				role: "indicator",
				read: true,
				write: true,
			},
			native: {},
		});

		this.subscribeStates("testVariable");

		await this.setState("testVariable", true);


		// examples for the checkPassword/checkGroup functions
		let result = await this.checkPasswordAsync("admin", "iobroker");
		this.log.info(`check user admin pw iobroker: ${  result}`);

		result = await this.checkGroupAsync("admin", "admin");
		this.log.info(`check group user admin group admin: ${  result}`);
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
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
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