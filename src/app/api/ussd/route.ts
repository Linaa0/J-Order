import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOrderNumber, sanitizePhone } from '@/lib/utils'
import { OrderStatus, UserRole } from '@prisma/client'

const sessions: Map<string, { step: number; data: Record<string, string> }> = new Map()

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const sessionId = formData.get('sessionId') as string
  const serviceCode = formData.get('serviceCode') as string
  const phoneNumber = formData.get('phoneNumber') as string
  const text = formData.get('text') as string || ''

  const inputs = text.split('*')
  const currentInput = inputs[inputs.length - 1] || ''

  let session = sessions.get(sessionId)
  if (!session) {
    session = { step: 0, data: {} }
    sessions.set(sessionId, session)
  }

  let response = ''
  const CON = 'CON '
  const END = 'END '

  if (text === '') {
    response = `${CON}Welcome to J Order\nGas Engineering and Services\n\n1. Place New Order\n2. Check Order Status\n3. Exit`
    session.step = 1
  } else if (session.step === 1) {
    if (currentInput === '1') {
      response = `${CON}Select Product:\n1. Gas Refill (LPG)\n2. Cylinder 6 Kg\n3. Cylinder 12 Kg\n4. Cylinder 20 Kg\n5. Cylinder 38 Kg`
      session.step = 2
    } else if (currentInput === '2') {
      response = `${CON}Enter your order number:`
      session.step = 10
    } else if (currentInput === '3') {
      response = `${END}Thank you for using J Order. Goodbye!`
      sessions.delete(sessionId)
    } else {
      response = `${CON}Invalid option. Try again:\n1. Place New Order\n2. Check Order Status\n3. Exit`
    }
  } else if (session.step === 2) {
    const productMap: Record<string, string> = {
      '1': 'GAS_REFILL',
      '2': 'CYLINDER_6KG',
      '3': 'CYLINDER_12KG',
      '4': 'CYLINDER_20KG',
      '5': 'CYLINDER_38KG',
    }
    if (productMap[currentInput]) {
      session.data.product = productMap[currentInput]
      response = `${CON}Enter quantity:`
      session.step = 3
    } else {
      response = `${CON}Invalid choice. Enter 1 to 5:`
      session.step = 2
    }
  } else if (session.step === 3) {
    const qty = parseInt(currentInput)
    if (qty > 0 && qty <= 100) {
      session.data.quantity = currentInput
      response = `${CON}Enter delivery address:`
      session.step = 4
    } else {
      response = `${CON}Invalid quantity. Enter a number between 1 and 100:`
      session.step = 3
    }
  } else if (session.step === 4) {
    session.data.address = currentInput
    const productLabels: Record<string, string> = {
      GAS_REFILL: 'Gas Refill',
      CYLINDER_6KG: '6 Kg Cylinder',
      CYLINDER_12KG: '12 Kg Cylinder',
      CYLINDER_20KG: '20 Kg Cylinder',
      CYLINDER_38KG: '38 Kg Cylinder',
    }
    const label = productLabels[session.data.product] || session.data.product
    response = `${CON}Confirm your order:\nProduct: ${label}\nQty: ${session.data.quantity}\nAddress: ${session.data.address}\n\n1. Confirm\n2. Cancel`
    session.step = 5
  } else if (session.step === 5) {
    if (currentInput === '1') {
      try {
        const phone = sanitizePhone(phoneNumber)
        let user = await prisma.user.findUnique({ where: { phone } })
        if (!user) {
          user = await prisma.user.create({
            data: { phone, role: UserRole.CLIENT, isGuest: true, preferredLanguage: 'en' },
          })
        }

        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)

        const order = await prisma.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            clientId: user.id,
            isGuestOrder: true,
            guestPhone: phone,
            deliveryAddress: session.data.address,
            preferredDate: tomorrow,
            preferredTime: '09:00',
            syncedAt: new Date(),
            items: {
              create: [{
                product: session.data.product as 'GAS_REFILL' | 'CYLINDER_6KG' | 'CYLINDER_12KG' | 'CYLINDER_20KG' | 'CYLINDER_38KG',
                quantity: parseInt(session.data.quantity),
              }],
            },
            statusHistory: {
              create: { changedBy: user.id, newStatus: OrderStatus.PENDING },
            },
          },
        })

        response = `${END}Order placed successfully!\nOrder No: ${order.orderNumber}\nWe will contact you to confirm delivery. Thank you!`
        sessions.delete(sessionId)
      } catch (error) {
        console.error('USSD order error:', error)
        response = `${END}Sorry, we could not place your order. Please call us directly.`
        sessions.delete(sessionId)
      }
    } else {
      response = `${END}Order cancelled. Thank you for using J Order.`
      sessions.delete(sessionId)
    }
  } else if (session.step === 10) {
    try {
      const order = await prisma.order.findFirst({
        where: { orderNumber: currentInput.toUpperCase() },
        select: { orderNumber: true, status: true, createdAt: true },
      })
      if (order) {
        const statusMap: Record<string, string> = {
          PENDING: 'Pending',
          CONFIRMED: 'Confirmed',
          PROCESSING: 'Processing',
          OUT_FOR_DELIVERY: 'Out for Delivery',
          DELIVERED: 'Delivered',
          COMPLETED: 'Completed',
          CANCELLED: 'Cancelled',
        }
        response = `${END}Order: ${order.orderNumber}\nStatus: ${statusMap[order.status] || order.status}\nThank you!`
      } else {
        response = `${END}Order not found. Please check the order number and try again.`
      }
    } catch (error) {
      response = `${END}Could not retrieve order. Please try again.`
    }
    sessions.delete(sessionId)
  } else {
    response = `${END}Session expired. Please dial again.`
    sessions.delete(sessionId)
  }

  return new NextResponse(response, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
