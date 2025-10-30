import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import ItemSale from '@/models/ItemSale';
import { verifySession } from '@/lib/auth';
import Sale from '@/models/Sale';

export async function GET(req, { params }) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id: inventoryId } = await params;
    const { searchParams } = new URL(req.url);
    
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 25;
    const batchId = searchParams.get('batchId');
    
    const skip = (page - 1) * limit;

    // Build query
    const query = {
      userId: user._id,
      inventoryId: new mongoose.Types.ObjectId(inventoryId),
      status: 'completed'
    };

    // Add batch filter if specified
    if (batchId) {
      query['batchesSoldFrom.batchId'] = new mongoose.Types.ObjectId(batchId);
    }

    // Get sales with pagination
    const sales = await ItemSale.find(query)
      .sort({ saleDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('saleTransactionId', 'transactionId')
      .lean();

    // Get total count for pagination
    const total = await ItemSale.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        sales,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching item sales:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
