import './globals.css';

export const metadata = {
  title: 'CrdxCube — Zero-Knowledge Credential Vault',
  description: 'Secure, zero-knowledge, client-side encrypted credential manager with OCR import, camera capture, and XLSX/PDF export.',
  manifest: '/manifest.json',
  themeColor: '#0b0f1f'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <div className="bg-blobs">
          <span className="blob b1"></span><span className="blob b2"></span><span className="blob b3"></span>
        </div>
        {children}
      </body>
    </html>
  );
}
