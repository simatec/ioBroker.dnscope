// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {
			ipv4: boolean;
			ipv6: boolean;
			domain: string;
			dyndnsServive: string;
			noipPassword: string;
			noipUser: string;
			customURL: string;
			duckdnsToken: string;
			onlyChanges: boolean;
			ipv64Token: string;

		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};