'use strict';

import * as utils from '@iobroker/adapter-core';
import axios, { type AxiosRequestConfig } from 'axios';
import { promises as dns } from 'node:dns';

class Dnscope extends utils.Adapter {
    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'dnscope',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    private async onReady(): Promise<void> {
        if (this.config.ipv4) {
            const currentIP: string | null = await this.checkipv4();
            const lastIP: string | null = await this.resolveDNSv4(this.config.domain);
            if ((this.config.onlyChanges && currentIP !== lastIP) || !this.config.onlyChanges) {
                await this.updateDNSv4(currentIP);
            } else {
                this.log.debug('no changes for IPv4');
            }
            if (!this.config.ipv6) {
                await this.delay(10000);
                this.terminate();
            }
        }

        if (this.config.ipv6) {
            const currentIP: string | null = await this.checkipv6();
            const lastIP: string | null = await this.resolveDNSv6(this.config.domain);
            if ((this.config.onlyChanges && currentIP !== lastIP) || !this.config.onlyChanges) {
                await this.updateDNSv6(currentIP);
            } else {
                this.log.debug('no changes for IPv6');
            }
            await this.delay(10000);
            this.terminate();
        }
    }

    private onUnload(callback: () => void): void {
        try {
            this.log.debug('cleaned everything up...');
            callback();
        } catch (e) {
            this.log.error(`Unload Error: ${e}`);
            callback();
        }
    }

    private async checkipv4(): Promise<string | null> {
        return new Promise(resolve => {
            void (async () => {
                const url = 'https://ipinfo.io/json';
                try {
                    const dataRequest = await axios({
                        method: 'get',
                        url: url,
                        timeout: 10000,
                        responseType: 'json',
                    });

                    const data = dataRequest.data;

                    await this.setObjectNotExistsAsync('data.currentIPv4', {
                        type: 'state',
                        common: {
                            name: 'current IPv4',
                            type: 'string',
                            role: 'info.ip',
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

                    this.log.debug(JSON.stringify(dataRequest.data));
                } catch (error) {
                    this.log.warn(`ipinfo.io is not available: ${error.toString()}`);
                    resolve(null);
                }
            })();
        });
    }

    private async checkipv6(): Promise<string | null> {
        return new Promise(resolve => {
            void (async () => {
                const url = 'https://v6.ipinfo.io/json';
                try {
                    const dataRequest = await axios({
                        method: 'get',
                        url: url,
                        timeout: 10000,
                        responseType: 'json',
                    });

                    const data = dataRequest.data;

                    await this.setObjectNotExistsAsync('data.currentIPv6', {
                        type: 'state',
                        common: {
                            name: 'current IPv6',
                            type: 'string',
                            role: 'info.ip',
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

                    this.log.debug(JSON.stringify(dataRequest.data));
                } catch (error) {
                    this.log.warn(`ipinfo.io is not available: ${error.toString()}`);
                    resolve(null);
                }
            })();
        });
    }

    private async resolveDNSv4(domain: string): Promise<string | null> {
        return new Promise(resolve => {
            void (async () => {
                try {
                    const addresses: string | null = (await dns.resolve4(domain)).toString();
                    this.log.debug(`IPv4 for ${domain}: ${addresses}`);
                    resolve(addresses);
                } catch (error) {
                    this.log.warn(`Error during DNS resolution: ${error.toString()}`);
                    resolve(null);
                }
            })();
        });
    }

    private async resolveDNSv6(domain: string): Promise<string | null> {
        return new Promise(resolve => {
            void (async () => {
                try {
                    const addresses: string | null = (await dns.resolve6(domain)).toString();
                    this.log.debug(`IPv6 for ${domain}: ${addresses}`);
                    resolve(addresses);
                } catch (error) {
                    this.log.warn(`Error during DNS resolution: ${error.toString()}`);
                    resolve(null);
                }
            })();
        });
    }

    private async updateDNSv4(currentIPv4: string | null): Promise<string | null> {
        return new Promise(resolve => {
            void (async () => {
                let url = '' as string;
                let username = null as null | string;
                let password = null as null | string;
                const domain: string = this.config.domain;

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
                    case 'dynv6':
                        url = `https://ipv4.dynv6.com/api/update?ipv4=${currentIPv4}&token=${this.config.dynv6Token}`;
                        break;
                }

                try {
                    const config: AxiosRequestConfig = {
                        method: 'get',
                        url: url,
                        timeout: 10000,
                        auth: username && password ? { username, password } : undefined,
                    };

                    const response = await axios(config);
                    this.log.debug(`DNS Update State for IPv4: ${JSON.stringify(response.data)}`);
                    resolve('OK');
                } catch (error) {
                    this.log.error(`Error in the request for IPv4: ${error.message}`);
                    resolve('not OK');
                }
            })();
        });
    }

    private async updateDNSv6(currentIPv6: string | null): Promise<string | null> {
        return new Promise(resolve => {
            void (async () => {
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
                    case 'custom':
                        url = this.config.customURL;
                        break;
                    case 'dynv6':
                        url = `https://ipv6.dynv6.com/api/update?ipv6=${currentIPv6}&token=${this.config.dynv6Token}`;
                        break;
                }

                try {
                    const config: AxiosRequestConfig = {
                        method: 'get',
                        url: url,
                        timeout: 10000,
                        auth: username && password ? { username, password } : undefined,
                    };

                    const response = await axios(config);
                    this.log.debug(`DNS Update State for IPv6: ${JSON.stringify(response.data)}`);
                    resolve('OK');
                } catch (error) {
                    this.log.error(`Error in the request for IPv6: ${error.message}`);
                    resolve('not OK');
                }
            })();
        });
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Dnscope(options);
} else {
    // otherwise start the instance directly
    (() => new Dnscope())();
}
