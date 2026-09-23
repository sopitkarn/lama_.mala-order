/**
 * ส่งข้อความแจ้งเตือนผ่าน Telegram Bot API (HTML parse mode)
 * @param {string} messageText - ข้อความในรูปแบบ HTML
 */
export async function sendTelegramNotification(messageText) {
  const token = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN
  const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    console.warn('Telegram environment variables are missing.')
    return
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML',
      }),
    })

    const data = await response.json()
    if (!data.ok) {
      console.error('Telegram API Error:', data.description)
    }
  } catch (err) {
    // ดักจับ error ไม่ให้กระทบกระบวนการสั่งอาหารหลัก
    console.error('Failed to send Telegram notification:', err)
  }
}
