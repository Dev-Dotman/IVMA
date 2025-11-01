import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import InventoryBatch from '@/models/InventoryBatch';
import ItemSale from '@/models/ItemSale';
import { verifySession } from '@/lib/auth';
import mongoose from 'mongoose';

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

    const { id } = await params;

    // Get all batches for this product
    const batches = await InventoryBatch.find({
      productId: new mongoose.Types.ObjectId(id),
      userId: user._id
    }).sort({ dateReceived: 1 });

    if (batches.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Get sales data for each batch
    const batchSalesData = await Promise.all(
      batches.map(async (batch) => {
        // First, try to get ItemSale data (from POS sales)
        const itemSalesData = await ItemSale.aggregate([
          {
            $match: {
              userId: user._id,
              inventoryId: new mongoose.Types.ObjectId(id),
              batchId: new mongoose.Types.ObjectId(batch._id)
            }
          },
          {
            $group: {
              _id: null,
              totalQuantitySold: { $sum: '$quantitySold' },
              totalRevenue: { $sum: '$totalAmount' },
              totalProfit: { $sum: '$profit' },
              salesCount: { $sum: 1 },
              lastSaleDate: { $max: '$saleDate' },
              averageUnitPrice: { $avg: '$unitPrice' }
            }
          }
        ]);

        let salesResult = itemSalesData[0] || {
          totalQuantitySold: 0,
          totalRevenue: 0,
          totalProfit: 0,
          salesCount: 0,
          lastSaleDate: null,
          averageUnitPrice: 0
        };

        // If no ItemSale data, calculate from batch quantitySold
        if (salesResult.totalQuantitySold === 0 && batch.quantitySold > 0) {
          // Calculate based on batch data
          salesResult = {
            totalQuantitySold: batch.quantitySold,
            totalRevenue: batch.quantitySold * batch.sellingPrice,
            totalProfit: batch.quantitySold * (batch.sellingPrice - batch.costPrice),
            salesCount: 0, // We don't have individual sale records
            lastSaleDate: batch.updatedAt, // Use batch update date as approximation
            averageUnitPrice: batch.sellingPrice
          };
        }

        return {
          batchId: batch._id,
          batchCode: batch.batchCode,
          quantityIn: batch.quantityIn,
          quantityRemaining: batch.quantityRemaining,
          quantitySold: batch.quantitySold,
          status: batch.status,
          costPrice: batch.costPrice,
          sellingPrice: batch.sellingPrice,
          dateReceived: batch.dateReceived,
          expiryDate: batch.expiryDate,
          ...salesResult
        };
      })
    );

    // Filter out batches with no sales data for the response
    const batchesWithSales = batchSalesData.filter(batch => 
      batch.totalQuantitySold > 0 || batch.quantitySold > 0
    );

    // If no sales data but batches exist, return all batches with calculated data
    const finalData = batchesWithSales.length > 0 ? batchesWithSales : batchSalesData;

    console.log('Batch sales data:', finalData); // Debug log

    return NextResponse.json({
      success: true,
      data: finalData
    });

  } catch (error) {
    console.error('Batch sales analytics error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
