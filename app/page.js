import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>lama mala 🦙🌶️</h1>
      <p>ระบบสั่งอาหารบุฟเฟต์หมาล่า</p>
      
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
        <Link 
          href="/generate-qr" 
          style={{ padding: '0.75rem 1.5rem', background: '#e53e3e', color: 'white', borderRadius: '8px', textDecoration: 'none' }}
        >
          ไปหน้า Generate QR
        </Link>
        <Link 
          href="/kitchen" 
          style={{ padding: '0.75rem 1.5rem', background: '#319795', color: 'white', borderRadius: '8px', textDecoration: 'none' }}
        >
          ไปหน้าห้องครัว (Kitchen)
        </Link>
      </div>
    </main>
  )
}
