'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function GenerateQRPage() {
  const [tableNumber, setTableNumber] = useState('')
  const [adultCount, setAdultCount] = useState('1')
  const [childCount, setChildCount] = useState('0')

  // สถานะสำหรับขั้นตอนและ Modal ต่างๆ
  const [existingSession, setExistingSession] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [createdSession, setCreatedSession] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // คำนวณระยะเวลาตั้งแต่เปิดโต๊ะเดิม (นาที)
  const getElapsedMinutes = (createdAt) => {
    if (!createdAt) return 0
    const start = new Date(createdAt)
    const now = new Date()
    const diffMs = now - start
    return Math.floor(diffMs / (1000 * 60))
  }

  // 1. กดปุ่มเปิดโต๊ะ
  const handleOpenTable = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setCopied(false)

    if (!tableNumber || parseInt(tableNumber, 10) <= 0) {
      setErrorMsg('กรุณากรอกเลขโต๊ะให้ถูกต้อง')
      return
    }

    setLoading(true)

    try {
      // เช็คว่ามี session status = 'open' อยู่แล้วหรือไม่
      const { data: openSessions, error: checkError } = await supabase
        .from('sessions')
        .select('id, table_number, adult_count, child_count, status, created_at')
        .eq('table_number', tableNumber)
        .eq('status', 'open')

      if (checkError) throw checkError

      // ถ้ามี session เปิดค้างอยู่
      if (openSessions && openSessions.length > 0) {
        setExistingSession(openSessions[0])
        setLoading(false)
        return
      }

      // ถ้าไม่มี ให้สร้าง Session ใหม่
      const { data: newSession, error: insertError } = await supabase
        .from('sessions')
        .insert([
          {
            table_number: tableNumber,
            adult_count: parseInt(adultCount, 10) || 0,
            child_count: parseInt(childCount, 10) || 0,
            status: 'open',
          },
        ])
        .select()
        .single()

      if (insertError) throw insertError

      // สำเร็จ! บันทึก session เพื่อแสดง QR Code
      setCreatedSession(newSession)
      setExistingSession(null)
    } catch (err) {
      console.error('Error opening table:', err)
      setErrorMsg(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  // 2. ยืนยันปิดโต๊ะเดิม
  const handleCloseExistingSession = async () => {
    if (!existingSession) return

    setLoading(true)
    try {
      // Update ให้ status = 'closed' (เช็คซ้ำด้วย status = 'open')
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('id', existingSession.id)
        .eq('status', 'open')

      if (updateError) throw updateError

      // สำเร็จ: ปิดกล่องยืนยัน, เอากล่องเตือนออก
      setShowConfirmModal(false)
      setExistingSession(null)
      alert(`ปิด Session โต๊ะ ${tableNumber} เดิมเรียบร้อยแล้ว กรุณากด "เปิดโต๊ะ" อีกครั้ง`)
    } catch (err) {
      console.error('Error closing session:', err)
      alert('ไม่สามารถปิดโต๊ะเดิมได้: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 3. ปุ่มเปิดโต๊ะใหม่ (ล้างฟอร์ม)
  const handleResetForm = () => {
    setTableNumber('')
    setAdultCount('1')
    setChildCount('0')
    setCreatedSession(null)
    setExistingSession(null)
    setShowConfirmModal(false)
    setErrorMsg('')
    setCopied(false)
  }

  // สร้าง URL ของ QR Code
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const orderUrl = createdSession ? `${origin}/order/${createdSession.table_number}` : ''
  const qrApiUrl = createdSession
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(orderUrl)}`
    : ''

  const handleCopyLink = () => {
    if (orderUrl) {
      navigator.clipboard.writeText(orderUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <main style={{ maxWidth: '540px', margin: '0 auto', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '0.5rem', color: '#1a202c' }}>
        lama mala 🦙
      </h1>
      <h2 style={{ textAlign: 'center', fontSize: '1.25rem', color: '#4a5568', marginBottom: '1.5rem', fontWeight: 'normal' }}>
        ระบบเปิดโต๊ะอาหาร & ออก QR Code
      </h2>

      {/* ข้อความ Error ถ้ามี */}
      {errorMsg && (
        <div style={{ backgroundColor: '#fff5f5', color: '#c53030', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #feb2b2' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* กล่องเตือนกรณีมี Session เปิดค้างอยู่ (ข้อ 3) */}
      {existingSession && !createdSession && (
        <div style={{ backgroundColor: '#fffaf0', border: '2px solid #dd6b20', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#c05621', fontSize: '1.2rem' }}>
            ⚠️ โต๊ะนี้มีลูกค้าอยู่ระหว่างทานอาหาร
          </h3>
          <p style={{ margin: '0 0 1rem 0', color: '#7b341e', fontSize: '1rem' }}>
            กรุณาปิดออเดอร์เดิมก่อน จึงจะสามารถเปิดโต๊ะใหม่ได้
          </p>
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            style={{
              width: '100%',
              padding: '0.85rem',
              backgroundColor: '#dd6b20',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            ปิดออเดอร์เดิม
          </button>
        </div>
      )}

      {/* กล่องยันยันการปิดโต๊ะเดิม (Confirm Modal) */}
      {showConfirmModal && existingSession && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', maxWidth: '400px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#e53e3e', fontSize: '1.3rem' }}>
              🔴 ยืนยันปิดโต๊ะเดิม?
            </h3>

            <div style={{ backgroundColor: '#edf2f7', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '1.05rem', lineHeight: '1.6' }}>
              <div><strong>โต๊ะ:</strong> {existingSession.table_number}</div>
              <div><strong>จำนวน:</strong> ผู้ใหญ่ {existingSession.adult_count} คน / เด็ก {existingSession.child_count} คน</div>
              <div><strong>ระยะเวลา:</strong> เปิดมาแล้ว <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>{getElapsedMinutes(existingSession.created_at)}</span> นาที</div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
                style={{
                  flex: 1, padding: '0.75rem', backgroundColor: '#e2e8f0', color: '#2d3748',
                  border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleCloseExistingSession}
                disabled={loading}
                style={{
                  flex: 1, padding: '0.75rem', backgroundColor: '#e53e3e', color: 'white',
                  border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                {loading ? 'กำลังปิด...' : 'ยืนยันปิดโต๊ะเดิม'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ฟอร์มกรอกข้อมูลเปิดโต๊ะ (ข้อ 1) */}
      {!createdSession && (
        <form onSubmit={handleOpenTable} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>
              เลขโต๊ะ
            </label>
            <input
              type="number"
              min="1"
              required
              placeholder="กรอกเลขโต๊ะ เช่น 7"
              value={tableNumber}
              onChange={(e) => {
                setTableNumber(e.target.value)
                setExistingSession(null)
              }}
              style={{
                width: '100%', padding: '0.85rem', fontSize: '1.3rem', borderRadius: '8px',
                border: '2px solid #cbd5e0', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 'bold', color: '#2d3748' }}>
                จำนวนผู้ใหญ่
              </label>
              <input
                type="number"
                min="0"
                required
                value={adultCount}
                onChange={(e) => setAdultCount(e.target.value)}
                style={{
                  width: '100%', padding: '0.75rem', fontSize: '1.2rem', borderRadius: '8px',
                  border: '1px solid #cbd5e0', boxSizing: 'border-box', textAlign: 'center'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 'bold', color: '#2d3748' }}>
                จำนวนเด็ก
              </label>
              <input
                type="number"
                min="0"
                required
                value={childCount}
                onChange={(e) => setChildCount(e.target.value)}
                style={{
                  width: '100%', padding: '0.75rem', fontSize: '1.2rem', borderRadius: '8px',
                  border: '1px solid #cbd5e0', boxSizing: 'border-box', textAlign: 'center'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.25rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 6px rgba(229, 62, 62, 0.3)',
            }}
          >
            {loading ? 'กำลังเปิดโต๊ะ...' : '🔥 เปิดโต๊ะ'}
          </button>
        </form>
      )}

      {/* ผลลัพธ์แสดง QR Code เมื่อสร้างสำเร็จ (ข้อ 4) */}
      {createdSession && (
        <div style={{
          backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', textAlign: 'center'
        }}>
          <div style={{ backgroundColor: '#c6f6d5', color: '#22543d', padding: '0.5rem 1rem', borderRadius: '20px', display: 'inline-block', fontWeight: 'bold', marginBottom: '1rem' }}>
            ✓ เปิดโต๊ะสำเร็จ
          </div>

          <div style={{ margin: '1rem 0' }}>
            {/* แสดงรูป QR Code จาก API โดยตรง */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrApiUrl}
              alt={`QR Code โต๊ะ ${createdSession.table_number}`}
              style={{ width: '260px', height: '260px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
          </div>

          <h3 style={{ fontSize: '1.4rem', color: '#1a202c', margin: '0.5rem 0' }}>
            โต๊ะ {createdSession.table_number} · ผู้ใหญ่ {createdSession.adult_count} · เด็ก {createdSession.child_count}
          </h3>

          {/* แสดง URL และปุ่มคัดลอก */}
          <div style={{
            backgroundColor: '#f7fafc', padding: '0.75rem', borderRadius: '8px',
            border: '1px solid #e2e8f0', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem'
          }}>
            <span style={{ fontSize: '0.9rem', color: '#4a5568', wordBreak: 'break-all', textAlign: 'left', flex: 1 }}>
              {orderUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                padding: '0.4rem 0.75rem',
                backgroundColor: copied ? '#38a169' : '#3182ce',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {copied ? '✓ คัดลอกแล้ว' : 'คัดลอกลิงก์'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetForm}
            style={{
              marginTop: '1.5rem',
              width: '100%',
              padding: '0.85rem',
              backgroundColor: '#4a5568',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ➕ เปิดโต๊ะใหม่
          </button>
        </div>
      )}
    </main>
  )
}
