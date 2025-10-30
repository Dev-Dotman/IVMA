import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Sale from '@/models/Sale';
import ItemSale from '@/models/ItemSale';
import Inventory from '@/models/Inventory';
import InventoryBatch from '@/models/InventoryBatch';
import InventoryActivity from '@/models/InventoryActivity';
import { verifySession } from '@/lib/auth';
import { ActivityTracker } from '@/lib/activityTracker';

// POST - Process a new sale with batch tracking
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

    const saleData = await req.json();
    
    // Ensure all financial fields are properly parsed as numbers
    const processedSaleData = {
      ...saleData,
      userId: user._id,
      soldBy: user._id, // Ensure soldBy is set
      subtotal: Number(saleData.subtotal) || 0,
      discount: Number(saleData.discount) || 0,
      tax: Number(saleData.tax) || 0,
      total: Number(saleData.total) || 0,
      amountReceived: Number(saleData.amountReceived) || 0,
      balance: Number(saleData.balance) || 0,
      // Ensure items have proper numeric values
      items: saleData.items.map(item => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        total: Number(item.total) || 0
      }))
    };

    // Create the sale (transactionId will be auto-generated)
    const sale = new Sale(processedSaleData);
    await sale.save();

    console.log('Sale created successfully:', {
      id: sale._id,
      transactionId: sale.transactionId,
      total: sale.total,
      subtotal: sale.subtotal
    });

    return NextResponse.json({
      success: true,
      message: 'Sale recorded successfully',
      data: {
        _id: sale._id,
        transactionId: sale.transactionId,
        total: sale.total,
        subtotal: sale.subtotal,
        saleDate: sale.saleDate,
        status: sale.status
      }
    });

  } catch (error) {
    console.error('Sale creation error:', error);
    
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

// GET - Fetch sales for user
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
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const paymentMethod = searchParams.get('paymentMethod');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const options = { page, limit, paymentMethod, startDate, endDate };
    const sales = await Sale.getSalesByUser(user._id, options);
    
    const total = await Sale.countDocuments({ 
      userId: user._id,
      ...(paymentMethod && { paymentMethod }),
      ...(startDate || endDate) && {
        saleDate: {
          ...(startDate && { $gte: new Date(startDate) }),
          ...(endDate && { $lte: new Date(endDate) })
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        sales,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Sales fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
