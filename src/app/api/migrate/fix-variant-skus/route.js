import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
import { verifySession } from '@/lib/auth';

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

    // Only allow admin users to run migrations
    if (user.role !== 'admin' && user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    console.log('Starting variant SKU migration...');

    // Step 1: Drop the problematic index
    try {
      await mongoose.connection.collection('inventories').dropIndex('variants.sku_1');
      console.log('✓ Dropped old variants.sku_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('Index variants.sku_1 does not exist, skipping...');
      } else {
        console.error('Error dropping index:', error);
      }
    }

    // Step 2: Find all products with variants
    const productsWithVariants = await Inventory.find({ 
      hasVariants: true,
      'variants.0': { $exists: true }
    });

    console.log(`Found ${productsWithVariants.length} products with variants`);

    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Step 3: Regenerate all variant SKUs with unique random strings
    for (const product of productsWithVariants) {
      try {
        let needsUpdate = false;

        // Check each variant and regenerate SKU if needed
        for (const variant of product.variants) {
          // Always regenerate to ensure uniqueness with random string
          const cleanSize = variant.size
            ? variant.size.replace(/\s+/g, '').replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase()
            : 'ONE';
          const cleanColor = variant.color
            ? variant.color.replace(/\s+/g, '').replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase()
            : 'STD';
          
          // Generate unique random string
          const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
          
          // New SKU format with random string
          const newSku = `${product.sku}-${cleanColor}-${cleanSize}-${randomString}`;
          
          if (variant.sku !== newSku) {
            variant.sku = newSku;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await product.save();
          updatedCount++;
          console.log(`✓ Updated variants for product: ${product.productName} (${product.sku})`);
        }
      } catch (error) {
        errorCount++;
        const errorMsg = `Failed to update ${product.productName}: ${error.message}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Step 4: Create new non-unique index for query performance
    try {
      await mongoose.connection.collection('inventories').createIndex(
        { 'variants.sku': 1 },
        { sparse: true }
      );
      console.log('✓ Created new non-unique variants.sku index');
    } catch (error) {
      console.error('Error creating new index:', error);
    }

    console.log('Migration completed!');

    return NextResponse.json({
      success: true,
      message: 'Variant SKU migration completed successfully',
      data: {
        totalProducts: productsWithVariants.length,
        updatedProducts: updatedCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Migration failed',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check migration status
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

    // Check indexes
    const indexes = await mongoose.connection.collection('inventories').indexes();
    const variantSkuIndexes = indexes.filter(idx => 
      idx.name && idx.name.includes('variants.sku')
    );

    // Count products with variants
    const totalWithVariants = await Inventory.countDocuments({ 
      hasVariants: true,
      'variants.0': { $exists: true }
    });

    // Check for duplicate SKUs
    const duplicateCheck = await Inventory.aggregate([
      { $match: { hasVariants: true } },
      { $unwind: '$variants' },
      { 
        $group: { 
          _id: '$variants.sku', 
          count: { $sum: 1 },
          products: { $push: { productName: '$productName', sku: '$sku' } }
        } 
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        indexes: variantSkuIndexes,
        totalProductsWithVariants: totalWithVariants,
        duplicateVariantSkus: duplicateCheck.length,
        duplicateDetails: duplicateCheck.slice(0, 10), // Show first 10
        needsMigration: duplicateCheck.length > 0 || variantSkuIndexes.some(idx => idx.unique === true)
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Status check failed',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
