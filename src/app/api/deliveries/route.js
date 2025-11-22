import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import DeliverySchedule from '@/models/DeliverySchedule';
import Sale from '@/models/Sale';
import { verifySession } from '@/lib/auth';
import { sendDeliveryScheduledEmail } from '@/lib/email';
import Store from '@/models/Store';

export async function GET(req) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (date) {
      // Get deliveries for specific date - FIXED for timezone issues
      // Parse the date as YYYY-MM-DD and create start/end of day in UTC
      const targetDate = new Date(date + 'T00:00:00.000Z');
      const startOfDay = new Date(targetDate);
      const endOfDay = new Date(targetDate);
      endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
      endOfDay.setUTCMilliseconds(endOfDay.getUTCMilliseconds() - 1);

      const deliveries = await DeliverySchedule.find({
        userId: user._id,
        scheduledDate: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }).sort({ scheduledDate: 1 });

      return NextResponse.json({
        success: true,
        data: deliveries
      });
    } else if (year && month) {
      // Get deliveries for specific month - FIXED for timezone issues
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      
      const deliveries = await DeliverySchedule.find({
        userId: user._id,
        scheduledDate: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ scheduledDate: 1 });

      return NextResponse.json({
        success: true,
        data: deliveries
      });
    } else {
      // Get all upcoming deliveries
      const deliveries = await DeliverySchedule.getUpcomingDeliveries(user._id);
      return NextResponse.json({
        success: true,
        data: deliveries
      });
    }

  } catch (error) {
    console.error('Delivery fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const deliveryData = await req.json();
    
    // Get sale data
    const sale = await Sale.findOne({
      _id: deliveryData.saleId,
      userId: user._id
    });

    if (!sale) {
      return NextResponse.json(
        { success: false, message: 'Sale not found' },
        { status: 404 }
      );
    }

    // Create delivery schedule with proper item snapshot and linking
    const deliveryScheduleData = {
      userId: user._id,
      saleId: sale._id,
      transactionId: sale.transactionId,
      deliveryType: deliveryData.deliveryType || (sale.isFromOrder ? 'order' : 'pos_sale'),
      
      // Link to order if this delivery is for an order
      orderId: deliveryData.orderId || sale.linkedOrderId || null,
      
      // Customer information
      customer: {
        name: deliveryData.customerName || sale.customer.name,
        phone: deliveryData.customerPhone || sale.customer.phone,
        email: deliveryData.customerEmail || sale.customer.email || ''
      },
      
      // Delivery address
      deliveryAddress: deliveryData.address,
      
      // Create snapshot of items from sale
      items: sale.items.map(item => ({
        productName: item.productName,
        sku: item.sku || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      })),
      
      // Delivery scheduling
      scheduledDate: new Date(deliveryData.scheduledDate),
      timeSlot: deliveryData.timeSlot || 'anytime',
      deliveryFee: Number(deliveryData.deliveryFee) || 0,
      deliveryMethod: deliveryData.deliveryMethod || 'self_delivery',
      deliveryNotes: deliveryData.notes || '',
      priority: deliveryData.priority || 'medium',
      
      // Financial information
      totalAmount: sale.total + (Number(deliveryData.deliveryFee) || 0),
      paymentStatus: deliveryData.paymentStatus || 'paid',
      
      // Initial status
      status: 'scheduled',
      statusHistory: [{
        status: 'scheduled',
        timestamp: new Date(),
        updatedBy: user._id,
        notes: `Delivery scheduled for ${deliveryData.deliveryType === 'order' ? 'order' : 'direct sale'}`
      }]
    };

    const delivery = new DeliverySchedule(deliveryScheduleData);
    await delivery.save();

    // Populate the delivery with related data for response
    await delivery.populate([
      { path: 'saleId', select: 'transactionId total saleDate' },
      { path: 'orderId', select: 'orderNumber totalAmount' },
      { path: 'userId', select: 'firstName lastName email' }
    ]);

    // Get store information for email
    const store = await Store.getStoreByUser(user._id);
    const storeName = store?.storeName || 'IVMA Store';

    // Get sale information for email
    const saleInfo = await Sale.findById(deliveryData.saleId);
    
    // Send email notification to customer
    if (deliveryData.customerEmail) {
      try {
        await sendDeliveryScheduledEmail(
          deliveryData.customerEmail,
          deliveryData,
          {
            transactionId: saleInfo?.transactionId || deliveryData.transactionId,
            items: saleInfo?.items || [],
            total: saleInfo?.total || 0,
            subtotal: saleInfo?.subtotal || saleInfo?.total || 0
          },
          storeName
        );
      } catch (emailError) {
        console.error('Failed to send delivery notification email:', emailError);
        // Don't fail the delivery creation if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery scheduled successfully',
      data: {
        deliveryId: delivery._id,
        transactionId: delivery.transactionId,
        scheduledDate: delivery.scheduledDate,
        deliveryType: delivery.deliveryType,
        customer: delivery.customer,
        items: delivery.items,
        totalAmount: delivery.totalAmount,
        status: delivery.status
      }
    });

  } catch (error) {
    console.error('Delivery creation error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { success: false, message: messages.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
