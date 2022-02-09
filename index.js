#!/usr/bin/env node

const proxy = require('http-proxy');
const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const commandExists = require('command-exists');
const childProcess = require('child_process');

program
	.option('-t, --target <target>', 'target for proxy to forward to')
	.option('-c, --certName <certName>', 'cert name to use')
	.option('-lp, --listenerPort <port>', 'port to listen on')
	.option('-mkc, --mkCert <domain>', 'use mkcert for creating certs on the fly');

program.parse(process.argv);
const options = program.opts();

function useProxy(options) {
	if (options.mkCert) {
		if (commandExists.sync('mkcert')) {
			if (
				!fs.existsSync(
					path.normalize(path.join(__dirname, `${options.mkCert}.pem`))
				)
			) {
				childProcess.execSync(`mkcert ${options.mkCert}`, {
					input: "string",
					stdio: "pipe",
					cwd: path.normalize(process.cwd())
				});
				console.info(`Certificate for "${options.mkCert}" created and registered`)
			}
		} else {
			console.error("Could not find 'mkcert'. Please install it and make it global accessible");
			process.exit(1);
		}
	}

	if (!options.target) {
		console.error("-t, --target parameter is needed");
		process.exit(1);
	}

	const [host, port] = options.target.split(":");
	const proxyOptions = {
		target: {
			host: host,
			port: port ?? 80,
		},
                xfwd: true
	}

	let PORT = 80;
	let certToChoose = options.mkCert ?? options.certName
	if (options.certName || options.mkCert) {
		proxyOptions.ssl = {
			key: fs.readFileSync(path.normalize(path.join(process.cwd(), `${certToChoose}-key.pem`)), 'utf-8'),
			cert: fs.readFileSync(path.normalize(path.join(process.cwd(), `${certToChoose}.pem`)), 'utf-8')
		};

		PORT = 443;
	}

	PORT = options.listenerPort ?? PORT;
	return proxy.createProxyServer(proxyOptions).listen(PORT, () => {
		console.log(`Proxy for http://${options.target} started on port ${options.certName !== undefined || options.mkCert !== undefined ? "https" : "http"}:${PORT}`)
	});
}

if(require.main) {
	useProxy(options);
}

module.exports = useProxy;





 
