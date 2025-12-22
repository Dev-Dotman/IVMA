import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
import { verifySession } from '@/lib/auth';

// GET - Fetch specific inventory item
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

    // Find the inventory item by ID and ensure it belongs to the authenticated user
    const item = await Inventory.findOne({ _id: id, userId: user._id });

    if (!item) {
      return NextResponse.json(
        { success: false, message: 'Inventory item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: item
    });

  } catch (error) {
    console.error('Inventory item fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update specific inventory item
export async function PUT(request, { params }) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = user._id;
    const { id } = params;
    const updateData = await request.json();

    // Find the inventory item
    const item = await Inventory.findOne({ _id: id, userId });
    if (!item) {
      return NextResponse.json(
        { success: false, message: 'Item not found' },
        { status: 404 }
      );
    }

    // Process images if updated
    if (updateData.images && updateData.images.length > 0) {
      // Set the primary image as the main image field
      const primaryImage = updateData.images.find(img => img.isPrimary);
      if (primaryImage) {
        updateData.image = primaryImage.url;
      } else {
        updateData.images[0].isPrimary = true;
        updateData.image = updateData.images[0].url;
      }
    }

    // Process variants if updated
    if (updateData.hasVariants && updateData.variants && updateData.variants.length > 0) {
      const categoryCode = updateData.category.substring(0, 3).toUpperCase();
      
      updateData.variants = updateData.variants.map((variant, index) => {
        // Generate SKU for new variants
        if (!variant.sku) {
          variant.sku = `${categoryCode}-${item.sku.split('-')[1]}-${variant.color.substring(0, 3).toUpperCase()}-${variant.size}`;
        }
        
        // Ensure default values
        variant.soldQuantity = variant.soldQuantity || 0;
        variant.reorderLevel = variant.reorderLevel || 5;
        variant.isActive = variant.isActive !== undefined ? variant.isActive : true;
        variant.images = variant.images || [];
        
        return variant;
      });

      // Recalculate total stock from all variants
      const totalVariantStock = updateData.variants.reduce((sum, v) => sum + (v.quantityInStock || 0), 0);
      updateData.quantityInStock = totalVariantStock;
      
      // Update totalStockedQuantity if stock increased
      if (totalVariantStock > item.quantityInStock) {
        updateData.totalStockedQuantity = item.totalStockedQuantity + (totalVariantStock - item.quantityInStock);
      }
    }

    // Update the item
    Object.assign(item, updateData);
    item.lastUpdated = new Date();
    await item.save();

    return NextResponse.json({
      success: true,
      data: item
    });

  } catch (error) {
    console.error('Error updating inventory item:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { success: false, message: errors.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update inventory item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete specific inventory item
export async function DELETE(req, { params }) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Find and delete the inventory item
    const item = await Inventory.findOneAndDelete({ _id: id, userId: user._id });

    if (!item) {
      return NextResponse.json(
        { success: false, message: 'Inventory item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });

  } catch (error) {
    console.error('Inventory item delete error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
