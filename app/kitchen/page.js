'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function KitchenPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  // 1. ดึงข้อมูลออเดอร์เริ่มต้น
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()

    // 2. รับอัปเดตแบบ Realtime เมื่อมีออเดอร์ใหม่ หรือมีการแก้ไข
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders() // ดึงข้อมูลใหม่เมื่อมีการเปลี่ยนแปลงในตาราง orders
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 3. ฟังก์ชันอัปเดตสถานะออเดอร์ (เช่น pending -> completed หรือ cancelled)
  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (error) {
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ: ' + error.message)
    } else {
      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
      )
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลดข้อมูลออเดอร์...</div>
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#f7fafc', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-[#1a202c]', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>lama mala 🦙 - หน้าจอห้องครัว (Kitchen)</h1>
        <button 
          onClick={fetchOrders}
          style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc' }}
        >
          🔄 รีเฟรชข้อมูล
        </button>
      </header>

      {orders.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#718096' }}>ยังไม่มีรายการออเดอร์เข้ามา</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.5rem',
                backgroundColor: 'white',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                borderTop: order.status === 'pending' ? '6px solid #ed8936' : order.status === 'completed' ? '6px solid #48bb78' : '6px solid #a0aec0'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>โต๊ะ {order.table_number}</h2>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  backgroundColor: order.status === 'pending' ? '#feebc8' : order.status === 'completed' ? '#c6f6d5' : '#edf2f7',
                  color: order.status === 'pending' ? '#c05621' : order.status === 'completed' ? '#22543d' : '#4a5568'
                }}>
                  {order.status}
                </span>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '1rem' }}>
                เวลาสั่ง: {new Date(order.created_at).toLocaleTimeString('th-TH')}
              </p>

              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />

              <ul style={{ paddingLeft: '1.2rem', marginBottom: '1.5rem' }}>
                {Array.isArray(order.items) && order.items.map((item, index) => (
                  <li key={index} style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                    <strong>{item.name}</strong> x <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>{item.quantity}</span>
                  </li>
                ))}
              </ul>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {order.status === 'pending' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      backgroundColor: '#48bb78',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    ✓ ทำเสร็จแล้ว
                  </button>
                )}
                {order.status !== 'cancelled' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                    style={{
                      padding: '0.6rem',
                      backgroundColor: '#e53e3e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
