import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import { verifySession } from '@/lib/auth';
import { OrderSaleProcessor } from '@/lib/orderSaleProcessor';

// PUT - Update order status
export async function PUT(req, { params }) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { status, note, updatedBy, trackingInfo } = await req.json();

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status' },
        { status: 400 }
      );
    }

    console.log(`Updating order ${id} to status: ${status}`);

    // Find the order and verify user has permission to update it
    const order = await Order.findOne({
      _id: id,
      'items.seller': user._id
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found or access denied' },
        { status: 404 }
      );
    }

    console.log(`Found order ${order.orderNumber}, current status: ${order.status}`);

    // Check if this is a status change to "delivered"
    const isBeingMarkedAsDelivered = status === 'delivered' && order.status !== 'delivered';

    // Update tracking information if provided
    if (trackingInfo && status === 'shipped') {
      order.tracking = {
        ...order.tracking,
        carrier: trackingInfo.carrier,
        trackingNumber: trackingInfo.trackingNumber,
        estimatedDelivery: trackingInfo.estimatedDelivery ? new Date(trackingInfo.estimatedDelivery) : null,
        shippedAt: new Date()
      };
    }

    // Update order status using the model method
    await order.updateStatus(status, note, updatedBy || 'admin');
    console.log(`Order status updated to: ${status}`);

    // If order is being marked as delivered, create sales records
    let saleResults = null;
    if (isBeingMarkedAsDelivered) {
      console.log('Order marked as delivered, processing sale creation...');
      try {
        saleResults = await OrderSaleProcessor.processOrderDelivery(order);
        
        if (saleResults.success) {
          console.log(`Successfully created ${saleResults.sales.length} sale(s) for order ${order.orderNumber}`);
        }
      } catch (saleError) {
        console.error('Error creating sales from order delivery:', saleError);
        
        // Return error information but don't fail the status update
        return NextResponse.json({
          success: true,
          message: `Order status updated to ${status}, but sale creation failed: ${saleError.message}`,
          data: order,
          saleCreationError: saleError.message,
          warning: 'Sales were not automatically created due to an error'
        });
      }
    }

    const response = {
      success: true,
      message: `Order status updated to ${status}`,
      data: order
    };

    // Add sale information if created
    if (saleResults && saleResults.success) {
      response.salesCreated = {
        count: saleResults.sales.length,
        totalAmount: saleResults.sales.reduce((sum, sale) => sum + sale.total, 0),
        transactionIds: saleResults.sales.map(sale => sale.transactionId)
      };
      response.message += ` and ${saleResults.sales.length} sale(s) created automatically`;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Order status update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
