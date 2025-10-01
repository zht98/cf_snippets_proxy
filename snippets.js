import {
    connect
} from 'cloudflare:sockets';

const UUID = 'ab0e51a3-0eee-405a-860f-7f84d31e6379';
// 反向代理IP，无法访问时通过代理访问
const DEFAULT_PROXY_IP = 'ProxyIP.US.CMLiussss.net'; // 来源：https://ipdb.030101.xyz/bestdomain/ bestproxy.030101.xyz:443
// 优选域名/IP
const BEST_DOMAINS = ['104.17.225.250:443', '104.18.19.200:443', '104.19.103.54:443', '104.19.237.9:443', '154.21.201.83:443', '172.64.147.110:443', '172.64.148.140:443', '172.64.151.179:443', '172.66.40.163:443', '47.239.125.132:443', '91.193.58.25:443', '91.193.58.6:443', '91.193.59.127:443', 'gur.gov.ua:443', 'icook.hk:443', 'log.bpminecraft.com:443', 'www.digitalocean.com:443', 'www.gov.se:443', 'www.gov.ua:443', 'www.shopify.com:443', 'www.udacity.com:443', '46.3.26.12:443', '91.193.58.244:443', '91.193.59.231:443', '45.194.53.139:443', '102.177.189.99:443', '185.251.82.157:443', '66.235.200.240:443', '154.219.5.104:443', '104.129.165.235:443', '185.18.250.100:443', '154.194.12.87:443', '45.80.108.108:443', '5.10.247.241:443', '45.81.58.160:443', '45.135.235.230:443', '77.75.199.39:443', '92.60.74.189:443', '5.182.84.164:443', '5.10.244.54:443', '159.246.55.193:443', '188.164.248.77:443', '94.247.142.186:443', '92.53.189.38:443', '185.148.104.39:443', '141.11.203.127:443', '185.221.160.222:443', '185.238.228.53:443', '45.159.216.12:443', '170.114.45.206:443', '154.197.121.150:443', '147.185.161.96:443', '147.78.140.202:443', '104.129.167.29:443', '185.146.173.118:443', '185.251.83.38:443', '185.159.247.139:443', '31.12.75.108:443', '204.93.210.237:443', '77.232.140.64:443', '159.112.235.184:443', '167.68.42.86:443', '89.116.161.142:443', '185.176.24.172:443', '5.10.245.137:443', '89.116.180.213:443', '66.81.247.195:443', '185.148.106.33:443', '14.102.229.156:443', '176.124.223.28:443', '5.10.246.191:443', '127.0.0.1:1234', '192.168.1.16:1234']

export default {
    async fetch(req) {
        const u = new URL(req.url);
        if (req.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
            return await handle_ws(req);
        } else if (req.method === 'GET') {
            if (u.pathname === '/') {
                const html = "<h1>success</h1>";
                return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            } else if (u.pathname.toLowerCase().includes(`/${UUID}`)) {
                return await handle_sub(req);
            }
        }

        return new Response('error', { status: 404 });
    }
};


async function handle_sub(req) {
    const url = new URL(req.url);
    const workerDomain = url.hostname;

    let links = gen_links(workerDomain);
    let content = btoa(links.join('\n'));
    return new Response(content, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
    });
}

function gen_links(workerDomain) {
    let links = [];
    let i = 0;
    const wsPath = encodeURIComponent('/?ed=2048');
    const proto = atob("dmxlc3M=")

    BEST_DOMAINS.forEach(item => {
        i += 1;
        let name = "snippet_" + i;
        const wsParams = new URLSearchParams({
            encryption: 'none',
            security: 'tls',
            sni: workerDomain,
            fp: 'chrome',
            type: 'ws',
            host: workerDomain,
            path: wsPath
        });
        links.push(`${proto}://${UUID}@${item}?${wsParams.toString()}#${encodeURIComponent(name)}`);
    })
    return links;
}

async function handle_ws(req) {
    const [client, ws] = Object.values(new WebSocketPair());
    ws.accept();

    const u = new URL(req.url);

    // 修复处理URL编码的查询参数  
    if (u.pathname.includes('%3F')) {
        const decoded = decodeURIComponent(u.pathname);
        const queryIndex = decoded.indexOf('?');
        if (queryIndex !== -1) {
            u.search = decoded.substring(queryIndex);
            u.pathname = decoded.substring(0, queryIndex);
        }
    }

    const mode = u.searchParams.get('mode') || 'proxy';
    const s5Param = u.searchParams.get('s5');
    const proxyParam = u.searchParams.get('proxyip');
    const path = s5Param ? s5Param : u.pathname.slice(1);

    // 解析SOCKS5和ProxyIP
    const socks5 = path.includes('@') ? (() => {
        const [cred, server] = path.split('@');
        const [user, pass] = cred.split(':');
        const [host, port = 443] = server.split(':');
        return {
            user,
            pass,
            host,
            port: +port
        };
    })() : null;
    const PROXY_IP = proxyParam ? String(proxyParam) : DEFAULT_PROXY_IP;

    // auto模式参数顺序（按URL参数位置）
    const getOrder = () => {
        if (mode === 'proxy') return ['direct', 'proxy'];
        if (mode !== 'auto') return [mode];
        const order = [];
        const searchStr = u.search.slice(1);
        for (const pair of searchStr.split('&')) {
            const key = pair.split('=')[0];
            if (key === 'direct') order.push('direct');
            else if (key === 's5') order.push('s5');
            else if (key === 'proxyip') order.push('proxy');
        }
        // 没有参数时默认direct
        return order.length ? order : ['direct'];
    };

    let remote = null,
        udpWriter = null,
        isDNS = false;

    // SOCKS5连接
    const socks5Connect = async (targetHost, targetPort) => {
        const sock = connect({
            hostname: socks5.host,
            port: socks5.port
        });
        await sock.opened;
        const w = sock.writable.getWriter();
        const r = sock.readable.getReader();
        await w.write(new Uint8Array([5, 2, 0, 2]));
        const auth = (await r.read()).value;
        if (auth[1] === 2 && socks5.user) {
            const user = new TextEncoder().encode(socks5.user);
            const pass = new TextEncoder().encode(socks5.pass);
            await w.write(new Uint8Array([1, user.length, ...user, pass.length, ...pass]));
            await r.read();
        }
        const domain = new TextEncoder().encode(targetHost);
        await w.write(new Uint8Array([5, 1, 0, 3, domain.length, ...domain, targetPort >> 8,
            targetPort & 0xff
        ]));
        await r.read();
        w.releaseLock();
        r.releaseLock();
        return sock;
    };

    new ReadableStream({
        start(ctrl) {
            ws.addEventListener('message', e => ctrl.enqueue(e.data));
            ws.addEventListener('close', () => {
                remote?.close();
                ctrl.close();
            });
            ws.addEventListener('error', () => {
                remote?.close();
                ctrl.error();
            });

            const early = req.headers.get('sec-websocket-protocol');
            if (early) {
                try {
                    ctrl.enqueue(Uint8Array.from(atob(early.replace(/-/g, '+').replace(/_/g, '/')),
                        c => c.charCodeAt(0)).buffer);
                } catch { }
            }
        }
    }).pipeTo(new WritableStream({
        async write(data) {
            if (isDNS) return udpWriter?.write(data);
            if (remote) {
                const w = remote.writable.getWriter();
                await w.write(data);
                w.releaseLock();
                return;
            }

            if (data.byteLength < 24) return;

            // UUID验证
            const uuidBytes = new Uint8Array(data.slice(1, 17));
            const expectedUUID = UUID.replace(/-/g, '');
            for (let i = 0; i < 16; i++) {
                if (uuidBytes[i] !== parseInt(expectedUUID.substr(i * 2, 2), 16)) return;
            }

            const view = new DataView(data);
            const optLen = view.getUint8(17);
            const cmd = view.getUint8(18 + optLen);
            if (cmd !== 1 && cmd !== 2) return;

            let pos = 19 + optLen;
            const port = view.getUint16(pos);
            const type = view.getUint8(pos + 2);
            pos += 3;

            let addr = '';
            if (type === 1) {
                addr =
                    `${view.getUint8(pos)}.${view.getUint8(pos + 1)}.${view.getUint8(pos + 2)}.${view.getUint8(pos + 3)}`;
                pos += 4;
            } else if (type === 2) {
                const len = view.getUint8(pos++);
                addr = new TextDecoder().decode(data.slice(pos, pos + len));
                pos += len;
            } else if (type === 3) {
                const ipv6 = [];
                for (let i = 0; i < 8; i++, pos += 2) ipv6.push(view.getUint16(pos)
                    .toString(16));
                addr = ipv6.join(':');
            } else return;

            const header = new Uint8Array([data[0], 0]);
            const payload = data.slice(pos);

            // UDP DNS
            if (cmd === 2) {
                if (port !== 53) return;
                isDNS = true;
                let sent = false;
                const {
                    readable,
                    writable
                } = new TransformStream({
                    transform(chunk, ctrl) {
                        for (let i = 0; i < chunk.byteLength;) {
                            const len = new DataView(chunk.slice(i, i + 2))
                                .getUint16(0);
                            ctrl.enqueue(chunk.slice(i + 2, i + 2 + len));
                            i += 2 + len;
                        }
                    }
                });

                readable.pipeTo(new WritableStream({
                    async write(query) {
                        try {
                            const resp = await fetch(
                                'https://1.1.1.1/dns-query', {
                                method: 'POST',
                                headers: {
                                    'content-type': 'application/dns-message'
                                },
                                body: query
                            });
                            if (ws.readyState === 1) {
                                const result = new Uint8Array(await resp
                                    .arrayBuffer());
                                ws.send(new Uint8Array([...(sent ? [] :
                                    header), result
                                        .length >> 8, result
                                            .length & 0xff, ...result
                                ]));
                                sent = true;
                            }
                        } catch { }
                    }
                }));
                udpWriter = writable.getWriter();
                return udpWriter.write(payload);
            }

            // TCP连接
            let sock = null;
            for (const method of getOrder()) {
                try {
                    if (method === 'direct') {
                        sock = connect({
                            hostname: addr,
                            port
                        });
                        await sock.opened;
                        break;
                    } else if (method === 's5' && socks5) {
                        sock = await socks5Connect(addr, port);
                        break;
                    } else if (method === 'proxy' && PROXY_IP) {
                        const [ph, pp = port] = PROXY_IP.split(':');
                        sock = connect({
                            hostname: ph,
                            port: +pp || port
                        });
                        await sock.opened;
                        break;
                    }
                } catch { }
            }

            if (!sock) return;

            remote = sock;
            const w = sock.writable.getWriter();
            await w.write(payload);
            w.releaseLock();

            let sent = false;
            sock.readable.pipeTo(new WritableStream({
                write(chunk) {
                    if (ws.readyState === 1) {
                        ws.send(sent ? chunk : new Uint8Array([...header, ...
                            new Uint8Array(chunk)
                        ]));
                        sent = true;
                    }
                },
                close: () => ws.readyState === 1 && ws.close(),
                abort: () => ws.readyState === 1 && ws.close()
            })).catch(() => { });
        }
    })).catch(() => { });

    return new Response(null, {
        status: 101,
        webSocket: client
    });

}


