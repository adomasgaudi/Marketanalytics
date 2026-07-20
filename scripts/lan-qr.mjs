// `pnpm lan` — print the phone-reachable LAN URL and pop a QR image on screen.
//
// Why this exists: `next dev -H 0.0.0.0` prints "Network: http://0.0.0.0:3000",
// which is a bind address, not something you can type into a phone. This picks
// the real Wi-Fi IPv4, writes a QR PNG, and opens it in the default viewer.
import { networkInterfaces } from "node:os";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const PORT = process.env.PORT ?? 3000;
const OUT = path.resolve(fileURLToPath(new URL("../.next/lan-qr.png", import.meta.url)));

// Prefer a real Wi-Fi/Ethernet adapter. Hyper-V / VirtualBox / WSL host adapters
// (172.x "Default Switch", 192.168.56.x) are reachable only from VMs, not phones.
const VIRTUAL = /vethernet|virtualbox|vmware|hyper-v|loopback|wsl/i;
function lanIp() {
  const cands = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== "IPv4" || a.internal) continue;
      cands.push({ name, ip: a.address, virtual: VIRTUAL.test(name) });
    }
  }
  if (!cands.length) return null;
  // Wi-Fi first, then any other physical adapter, and only then the virtual ones.
  cands.sort(
    (x, y) => x.virtual - y.virtual || /wi-?fi/i.test(y.name) - /wi-?fi/i.test(x.name),
  );
  return cands[0];
}

const hit = lanIp();
if (!hit) {
  console.error("No external IPv4 found — are you on Wi-Fi?");
  process.exit(1);
}
const url = `http://${hit.ip}:${PORT}`;

// Terminal QR is a convenience only; phones scan the PNG far more reliably
// (terminal line-height stretches the modules non-square).
QRCode.toString(url, { type: "terminal", small: true }, (e, s) => e || console.log(s));
await QRCode.toFile(OUT, url, { width: 900, margin: 4, errorCorrectionLevel: "H" });

console.log(`\n  Adapter : ${hit.name}\n  Phone   : ${url}\n  QR      : ${OUT}\n`);
console.log("Same Wi-Fi required. If it loads but nothing is clickable, add the IP");
console.log(
  "to allowedDevOrigins in next.config.ts — Next blocks cross-origin dev JS.\n",
);

// Open the PNG in whatever the OS uses for images.
const open =
  process.platform === "win32"
    ? ["cmd", ["/c", "start", "", OUT]]
    : process.platform === "darwin"
      ? ["open", [OUT]]
      : ["xdg-open", [OUT]];
spawn(open[0], open[1], { stdio: "ignore", detached: true }).unref();
