'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function KitchenPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  // 1. ฟังก์ชันดึงออเดอร์เฉพาะสถานะ 'received' หรือ 'cooking'
  const fetchActiveOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['received', 'cooking'])
        .order('created_at', { ascending: true }) // เก่าไปใหม่ (ทำก่อน ได้ก่อน)

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('Error fetching kitchen orders:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActiveOrders()

    // 2. ตั้งค่า Supabase Realtime ฟังการเปลี่ยนแปลงของตาราง orders
    const channel = supabase
      .channel('kitchen-realtime-orders')
      .on(
        'postgres_changes',
        {
          event: '*', // ดักฟังทั้ง INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders',
        },
        () => {
          // เมื่อมีการสั่งอาหารเพิ่ม หรือเปลี่ยนสถานะ ให้ดึงข้อมูลใหม่ทันที
          fetchActiveOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 3. ฟังก์ชันอัปเดตสถานะออเดอร์
  const handleUpdateStatus = async (orderId, newStatus) => {
    // ถ้าเปลี่ยนเป็น 'served' ให้ออกจากจอทันทีด้วย Optimistic UI update
    if (newStatus === 'served') {
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      )
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) {
        throw error
      }
    } catch (err) {
      console.error('Error updating order status:', err)
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ: ' + err.message)
      fetchActiveOrders() // ถ้าพลาด ให้ดึงข้อมูลจาก DB มาซ่อมหน้าจอ
    }
  }

  // ฟังก์ชันคำนวณระยะเวลาที่รอ (นาที)
  const getWaitTime = (createdAt) => {
    const minutes = Math.floor((new Date() - new Date(createdAt)) / 60000)
    if (minutes < 1) return 'เมื่อสักครู่'
    return `${minutes} นาทีที่แล้ว`
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: '#1a202c', color: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontFamily: 'sans-serif' }}>
        ⏳ กำลังโหลดรายการอาหารสำหรับห้องครัว...
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#1a202c', minHeight: '100vh', padding: '1.5rem', fontFamily: 'sans-serif', color: 'white' }}>
      
      {/* Header จอครัว */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #2d3748', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', color: '#fc8181' }}>
            lama mala 🦙 KITCHEN DISPLAY
          </h1>
          <span style={{ backgroundColor: '#e53e3e', color: 'white', padding: '0.4rem 1rem', borderRadius: '30px', fontSize: '1.2rem', fontWeight: 'bold' }}>
            รอทำ {orders.length} รายการ
          </span>
        </div>

        <button
          onClick={fetchActiveOrders}
          style={{ backgroundColor: '#4a5568', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}
        >
          🔄 รีเฟรช
        </button>
      </header>

      {/* กรณีไม่มีออเดอร์ค้าง */}
      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: '#a0aec0' }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>✨</div>
          <h2 style={{ fontSize: '2.5rem', margin: 0 }}>ไม่มีออเดอร์ค้างในขณะนี้</h2>
          <p style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>พร้อมรับออเดอร์ใหม่แบบ Realtime</p>
        </div>
      ) : (
        /* Grid Layout สำหรับการ์ดออเดอร์ */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {orders.map((order) => {
            const isCooking = order.status === 'cooking'

            return (
              <div
                key={order.id}
                style={{
                  backgroundColor: isCooking ? '#2c2512' : '#2d3748', // กำลังทำ = โทนส้มเข้ม / รอ = โทนเทาเข้ม
                  borderRadius: '16px',
                  border: isCooking ? '4px solid #dd6b20' : '4px solid #cbd5e0',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {/* Header ของการ์ด (เลขโต๊ะ + สถานะ + เวลา) */}
                <div style={{
                  backgroundColor: isCooking ? '#dd6b20' : '#4a5568',
                  color: 'white',
                  padding: '1rem',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '1.1rem', opacity: 0.9 }}>โต๊ะ</span>
                    <div style={{ fontSize: '2.8rem', fontWeight: '900', lineHeight: 1 }}>
                      {order.table_number}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      backgroundColor: isCooking ? '#c05621' : '#2b6cb0',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      display: 'inline-block',
                      marginBottom: '0.25rem'
                    }}>
                      {isCooking ? '🔥 กำลังทำ' : '📥 ใหม่'}
                    </span>
                    <div style={{ fontSize: '0.95rem', color: '#edf2f7', marginTop: '0.2rem' }}>
                      ⏱️ {getWaitTime(order.created_at)}
                    </div>
                  </div>
                </div>

                {/* รายการอาหาร */}
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Array.isArray(order.items) && order.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        fontSize: '1.5rem',
                        borderBottom: '1px dashed #4a5568',
                        paddingBottom: '0.5rem'
                      }}
                    >
                      <span style={{ fontWeight: '600', color: '#f7fafc', flex: 1 }}>
                        {item.name}
                      </span>
                      <span style={{
                        backgroundColor: '#e53e3e',
                        color: 'white',
                        padding: '0.24rem 0.8rem',
                        borderRadius: '10px',
                        fontWeight: '900',
                        fontSize: '1.6rem',
                        marginLeft: '0.5rem'
                      }}>
                        x{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {/* ปุ่ม action ด้านล่างการ์ด */}
                <div style={{ padding: '1rem', backgroundColor: 'rgba(0,0,0,0.2)', borderTop: '1px solid #4a5568' }}>
                  {!isCooking ? (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'cooking')}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        backgroundColor: '#dd6b20',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '1.4rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                      }}
                    >
                      🔥 เริ่มทำ
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'served')}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        backgroundColor: '#38a169',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '1.4rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                      }}
                    >
                      ✓ จัดเสิร์ฟแล้ว
                    </button>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
