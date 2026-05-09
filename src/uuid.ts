const byteToHex: string[] = []
for (let i = 0; i < 256; i++) {
  byteToHex.push(i.toString(16).padStart(2, '0'))
}

export function uuidv7(): string {
  const now = Date.now()
  const buf = new Uint8Array(16)
  crypto.getRandomValues(buf)

  // 48-bit timestamp (ms since epoch)
  buf[0] = (now / 2 ** 40) | 0
  buf[1] = (now / 2 ** 32) | 0
  buf[2] = (now / 2 ** 24) | 0
  buf[3] = (now / 2 ** 16) | 0
  buf[4] = (now / 2 ** 8) | 0
  buf[5] = now & 0xff

  // version 7
  buf[6] = (buf[6] & 0x0f) | 0x70
  // variant 10xx
  buf[8] = (buf[8] & 0x3f) | 0x80

  return (
    byteToHex[buf[0]] +
    byteToHex[buf[1]] +
    byteToHex[buf[2]] +
    byteToHex[buf[3]] +
    '-' +
    byteToHex[buf[4]] +
    byteToHex[buf[5]] +
    '-' +
    byteToHex[buf[6]] +
    byteToHex[buf[7]] +
    '-' +
    byteToHex[buf[8]] +
    byteToHex[buf[9]] +
    '-' +
    byteToHex[buf[10]] +
    byteToHex[buf[11]] +
    byteToHex[buf[12]] +
    byteToHex[buf[13]] +
    byteToHex[buf[14]] +
    byteToHex[buf[15]]
  )
}
