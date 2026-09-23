// 1. เพิ่ม import ด้านบนสุดของไฟล์
import { sendTelegramNotification } from '@/lib/telegram'

// ... โค้ดเดิม ...

// 2. ปรับปรุงฟังก์ชัน handleSendOrder
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

    // บันทึกออเดอร์ลง Supabase
    const { error } = await supabase.from('orders').insert([
      {
        session_id: session.id,
        table_number: tableNumber,
        items: orderItems,
        status: 'received'
      }
    ])

    if (error) throw error

    // เคลียร์ตะกร้าและแสดงผลว่าสั่งสำเร็จทันที
    setCart({})
    setSuccessToast(true)
    setTimeout(() => setSuccessToast(false), 3000)

    // 🔔 ส่ง Telegram Notification แบบ Async (Background Process)
    // ใช้ try-catch ครอบเฉพาะส่วน Telegram แยกอีกชั้นเพื่อความปลอดภัยสูงสุด
    const orderUrl = `${window.location.origin}/order/${tableNumber}`
    const itemsListHtml = orderItems
      .map((item) => `• <b>${item.name}</b> x ${item.quantity}`)
      .join('\n')

    const messageText = `🚨 <b>ออเดอร์ใหม่ - โต๊ะ ${tableNumber}</b>\n\n` +
      `${itemsListHtml}\n\n` +
      `🔗 <a href="${orderUrl}">${orderUrl}</a>`

    // เรียกทำงานแบบไม่ await เพื่อไม่ให้ลูกค้ารอ
    sendTelegramNotification(messageText).catch((err) => {
      console.error('Telegram notification error caught:', err)
    })

  } catch (err) {
    console.error('Error sending order:', err)
    alert('ส่งออเดอร์ไม่สำเร็จ: ' + err.message)
  } finally {
    setIsSubmitting(false)
  }
}
