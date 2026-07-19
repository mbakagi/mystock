import QRCode from 'qrcode-svg';

export function generateQR(data) {
  const qr = new QRCode({
    content: data,
    width: 256,
    height: 256,
    padding: 1,
    color: '#0f172a',
    background: '#f1f5f9',
    ecl: 'M'
  });
  return qr.svg();
}

export function parseDeepLink(link) {
  const match = link.match(/^sl:\/\/(bin|item|assignment)\/(.+)$/);
  if (!match) return null;
  return { type: match[1], id: match[2] };
}

export function binDeepLink(binId) {
  return `sl://bin/${binId}`;
}
