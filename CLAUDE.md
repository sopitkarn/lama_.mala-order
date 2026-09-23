# lama mala - Buffet Ordering System

## Database Schema Overview
ตารางใน Supabase ที่ใช้งานในโปรเจกต์นี้:

1. **`sessions`**
   - `id` (uuid/primary key)
   - `table_number` (text/int)
   - `adult_count` (int)
   - `child_count` (int)
   - `status` (text: active, closed)
   - `created_at` (timestamp)

2. **`menu_categories`**
   - `id` (uuid/primary key)
   - `name` (text)
   - `sort_order` (int)

3. **`menu_items`**
   - `id` (uuid/primary key)
   - `category_id` (foreign key -> menu_categories.id)
   - `name` (text)

4. **`orders`**
   - `id` (uuid/primary key)
   - `session_id` (foreign key -> sessions.id)
   - `table_number` (text/int)
   - `items` (jsonb) -> รูปแบบ: `[{ menu_item_id, name, quantity }]`
   - `status` (text: pending, completed, cancelled)
   - `created_at` (timestamp)

---

## Technical Notes (Next.js Latest Rules)
- **App Router & Client Components:** 
  โปรเจกต์นี้ใช้ Next.js เวอร์ชันล่าสุด ใน Dynamic Routes (`app/[table]/page.js` เป็นต้น) พารามิเตอร์ `params` ถูกเปลี่ยนประเภทเป็น **Promise**
- **วิธี unwrap `params` ใน Client Components:**
  ต้องใช้ React `use()` hook ในการดึงค่า ดังนี้:

  ```javascript
  'use client'
  import { use } from 'react'

  export default function TableOrderPage({ params }) {
    const resolvedParams = use(params)
    const tableNumber = resolvedParams.table

    return <div>โต๊ะที่: {tableNumber}</div>
  }
