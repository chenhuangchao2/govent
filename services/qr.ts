import QRCode from 'qrcode'

export async function generateQRCodeDataUrl(registrationId: string): Promise<string> {
  return QRCode.toDataURL(registrationId, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })
}
