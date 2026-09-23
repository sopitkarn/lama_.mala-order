'use client'

import { use, useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function OrderPage({ params }) {
  // ⚠️ ข้อกำหนดสำคัญ: unwrap params Promise ด้วย React use() hook
  const resolvedParams = use(params)
  const tableNumber = resolvedParams.tableNumber

  // State เกี่ยวกับ Session
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [isSessionClosed, setIsSessionClosed] = useState(false)

  // State เกี่ยวกับ เมนู และ หมวดหมู่
  const [categories, setCategories] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [activeCategoryId, setActiveCategoryId] = useState(null)
  const [menuLoading, setMenuLoading] = useState(true)

  // State สำหรับ ตะกร้าสินค้า { menuItemId: { id, name, quantity } }
  const [cart, setCart] = useState({})

  // State UI/Modal
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [successToast, setSuccessToast] = useState(false)

  // 1. เช็ค session เมื่อเปิดหน้าเว็บ
  useEffect(() => {
    async function checkSession() {
      if (!tableNumber) return

      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('table_number', tableNumber)
          .eq('status', 'open')
          .maybeSingle()

        if (error) throw error

        if (data) {
          setSession(data)
        } else {
          setSession(null)
        }
      } catch (err) {
        console.error('Error fetching session:', err)
      } finally {
        setSessionLoading(false)
      }
    }

    checkSession()
  }, [tableNumber])

  // 2. ดึงหมวดหมู่และเมนูอาหาร (เมื่อเจอ Active Session)
  useEffect(() => {
    if (!session) return

    async function fetchMenuData() {
      setMenuLoading(true)
      try {
        const [catRes, itemRes] = await Promise.all([
          supabase.from('menu_categories').select('*').order('sort_order', { ascending: true }),
          supabase.from('menu_items').select('*')
        ])

        if (catRes.error) throw catRes.error
        if (itemRes.error) throw itemRes.error

        const catData = catRes.data || []
        setCategories(catData)
        if (catData.length > 0) {
          setActiveCategoryId(catData[0].id)
        }
        setMenuItems(itemRes.data || [])
      } catch (err) {
        console.error('Error fetching menu:', err)
      } finally {
        setMenuLoading(false)
      }
    }

    fetchMenuData()
  }, [session])

  // ฟังก์ชันจัดการตะกร้าสินค้า
  const handleAddToCart = (item) => {
    setCart((prev) => {
      const currentQty = prev[item.id]?.quantity || 0
      if (currentQty >= 5) return prev // จำกัดรายการละไม่เกิน 5 ชิ้น
      return {
        ...prev,
        [item.id]: {
          id: item.id,
          name: item.name,
          quantity: currentQty + 1
        }
      }
    })
  }

  const handleRemoveFromCart = (itemId) => {
    setCart((prev) => {
      const currentQty = prev[itemId]?.quantity || 0
      if (currentQty <= 1) {
        const newCart = { ...prev }
        delete newCart[itemId]
        return newCart
      }
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          quantity: currentQty - 1
        }
      }
    })
  }

  // คำนวณจำนวนชิ้นรวมในตะกร้า
  const totalCartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  // 3. ส่งออเดอร์
  const handleSendOrder = async () => {
    if (totalCartCount === 0 || !session) return
    if (totalCartCount > 10) {
      alert('สั่งได้สูงสุด 10 รายการต่อการส่ง 1 ครั้ง')
      return
    }

    setIsSubmitting(true)
    try {
      const orderItems = Object.values(cart).map((item) => ({
        name: item.name,
        quantity: item.quantity
      }))

      const { error } = await supabase.from('orders').insert([
        {
          session_id: session.id,
          table_number: tableNumber,
          items: orderItems,
          status: 'received'
        }
      ])

      if (error) throw error

      // เคลียร์ตะกร้าและแจ้งเตือนสำเร็จ
      setCart({})
      setSuccessToast(true)
      setTimeout(() => setSuccessToast(false), 3000)
    } catch (err) {
      console.error('Error sending order:', err)
      alert('ส่งออเดอร์ไม่สำเร็จ: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 4. เรียกเก็บเงิน
  const handleConfirmCheckout = async () => {
    if (!session) return

    setIsCheckingOut(true)
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('id', session.id)

      if (error) throw error

      setShowCheckoutModal(false)
      setIsSessionClosed(true)
    } catch (err) {
      console.error('Error checking out:', err)
      alert('เกิดข้อผิดพลาดในการเช็คบิล: ' + err.message)
    } finally {
      setIsCheckingOut(false)
    }
  }

  // --- RENDERING STATES ---

  // Loading Session
  if (sessionLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'sans-serif', backgroundColor: '#fff5f5' }}>
        <p style={{ fontSize: '1.2rem', color: '#e53e3e', fontWeight: 'bold' }}>กำลังตรวจสอบข้อมูลโต๊ะ...</p>
      </div>
    )
  }

  // หลังกดปิดโต๊ะ/เรียกเก็บเงินสำเร็จ
  if (isSessionClosed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#fffaf0' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🦙❤️</div>
        <h1 style={{ fontSize: '2rem', color: '#2c5282', marginBottom: '0.5rem' }}>ขอบคุณที่ใช้บริการ</h1>
        <p style={{ fontSize: '1.2rem', color: '#4a5568' }}>ร้าน lama mala ยินดีต้อนรับในโอกาสถัดไปครับ</p>
      </div>
    )
  }

  // กรณีไม่เจอ Session ที่ status = 'open'
  if (!session) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#fff5f5' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⚠️</div>
        <h1 style={{ fontSize: '1.5rem', color: '#c53030', marginBottom: '1rem' }}>
          โต๊ะนี้ยังไม่เปิดใช้งาน กรุณาแจ้งพนักงาน
        </h1>
        <p style={{ color: '#742a2a' }}>โต๊ะ {tableNumber}</p>
      </div>
    )
  }

  // คำนวณราคาสำหรับหน้าต่างเรียกเก็บเงิน
  const adultPrice = (session.adult_count || 0) * 289
  const childPrice = (session.child_count || 0) * 145
  const totalPrice = adultPrice + childPrice

  const filteredMenuItems = menuItems.filter((item) => item.category_id === activeCategoryId)

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '110px', fontFamily: 'sans-serif', backgroundColor: '#f7fafc', color: '#2d3748' }}>
      
      {/* Toast แจ้งเตือนเมื่อส่งออเดอร์สำเร็จ */}
      {successToast && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#38a169', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '30px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2000 }}>
          ✓ ส่งออเดอร์แล้ว!
        </div>
      )}

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#e53e3e', fontWeight: '800' }}>lama mala 🦙</h1>
          <span style={{ fontSize: '0.85rem', color: '#718096', fontWeight: 'bold' }}>โต๊ะ {tableNumber}</span>
        </div>
        
        {/* ปุ่มเรียกเก็บเงิน */}
        <button
          onClick={() => setShowCheckoutModal(true)}
          style={{ backgroundColor: '#2b6cb0', color: 'white', border: 'none', padding: '0.5rem 0.9rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(43,108,176,0.3)' }}
        >
          💳 เรียกเก็บเงิน
        </button>
      </header>

      {/* Category Tabs (5 หมวดหมู่ หรือตามข้อมูลที่มี) */}
      <nav style={{ position: 'sticky', top: '57px', zIndex: 90, backgroundColor: 'white', borderBottom: '1px solid #edf2f7', display: 'flex', overflowX: 'auto', padding: '0.5rem', gap: '0.5rem', scrollbarWidth: 'none' }}>
        {categories.map((cat) => {
          const isActive = cat.id === activeCategoryId
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              style={{
                flex: '0 0 auto',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: isActive ? '#e53e3e' : '#edf2f7',
                color: isActive ? 'white' : '#4a5568',
                fontWeight: isActive ? 'bold' : 'normal',
                fontSize: '0.9rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {cat.name}
            </button>
          )
        })}
      </nav>

      {/* Menu List */}
      <main style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        {menuLoading ? (
          <p style={{ textAlign: 'center', color: '#a0aec0', padding: '2rem 0' }}>กำลังโหลดเมนูอาหาร...</p>
        ) : filteredMenuItems.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#a0aec0', padding: '2rem 0' }}>ไม่มีรายการอาหารในหมวดนี้</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredMenuItems.map((item) => {
              const qty = cart[item.id]?.quantity || 0
              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                    border: '1px solid #edf2f7'
                  }}
                >
                  <span style={{ fontSize: '1.05rem', fontWeight: '600', color: '#2d3748' }}>{item.name}</span>
                  
                  {/* ปุ่มปรับจำนวน (+ / -) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {qty > 0 && (
                      <>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #cbd5e0', backgroundColor: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#e53e3e' }}
                        >
                          -
                        </button>
                        <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem' }}>{qty}</span>
                      </>
                    )}
                    <button
                      onClick={() => handleAddToCart(item)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: qty >= 5 ? '#cbd5e0' : '#e53e3e',
                        color: 'white',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        cursor: qty >= 5 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        justify: 'center',
                        alignItems: 'center'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Floating Cart Bar (ตะกร้าลอยด้านล่าง) */}
      {totalCartCount > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTop: '1px solid #e2e8f0', padding: '0.75rem 1rem', boxShadow: '0 -4px 12px rgba(0,0,0,0.1)', zIndex: 100, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '600px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#718096' }}>ตะกร้าของคุณ</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>
                เลือกไว้ {totalCartCount} ชิ้น {totalCartCount > 10 && <span style={{ color: '#e53e3e', fontSize: '0.8rem' }}>(เกิน 10 รายการ)</span>}
              </div>
            </div>

            <button
              onClick={handleSendOrder}
              disabled={isSubmitting || totalCartCount > 10}
              style={{
                backgroundColor: totalCartCount > 10 ? '#cbd5e0' : '#e53e3e',
                color: 'white',
                border: 'none',
                padding: '0.85rem 1.5rem',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: isSubmitting || totalCartCount > 10 ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px rgba(229, 62, 62, 0.3)'
              }}
            >
              {isSubmitting ? 'กำลังส่ง...' : 'ส่งออเดอร์ 🚀'}
            </button>
          </div>
        </div>
      )}

      {/* Modal ยืนยันการเรียกเก็บเงิน */}
      {showCheckoutModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', color: '#1a202c', textAlign: 'center' }}>
              สรุปรายการเช็คบิล (โต๊ะ {tableNumber})
            </h2>

            <div style={{ backgroundColor: '#edf2f7', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>ผู้ใหญ่ ({session.adult_count} x 289 บาท)</span>
                <strong>{adultPrice.toLocaleString()} บาท</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>เด็ก ({session.child_count} x 145 บาท)</span>
                <strong>{childPrice.toLocaleString()} บาท</strong>
              </div>
              <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e0', margin: '0.75rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', color: '#e53e3e', fontWeight: 'bold' }}>
                <span>ราคารวมทั้งหมด</span>
                <span>{totalPrice.toLocaleString()} บาท</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowCheckoutModal(false)}
                disabled={isCheckingOut}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmCheckout}
                disabled={isCheckingOut}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#2b6cb0', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {isCheckingOut ? 'กำลังดำเนินการ...' : 'ยืนยันเรียกเก็บเงิน'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
