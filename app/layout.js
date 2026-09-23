export const metadata = {
  title: 'lama mala - ระบบสั่งอาหารบุฟเฟต์',
  description: 'ระบบสั่งอาหารสำหรับร้าน lama mala',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}
