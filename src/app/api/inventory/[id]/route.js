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

    const { id } = await params;
    const updates = await request.json();

    // Sanitize category-specific details to ensure arrays remain arrays
    const sanitizeCategoryDetails = (details) => {
      if (!details || typeof details !== 'object') return details;
      
      const sanitized = { ...details };
      
      // Iterate through all properties
      Object.keys(sanitized).forEach(key => {
        const value = sanitized[key];
        
        // Check if value is a stringified array
        if (typeof value === 'string' && value.trim().startsWith('[')) {
          try {
            // Try to parse it back to an array
            sanitized[key] = JSON.parse(value);
          } catch (e) {
            // If parsing fails, leave it as is
            console.warn(`Failed to parse ${key}:`, e);
          }
        }
        
        // Recursively sanitize nested objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          sanitized[key] = sanitizeCategoryDetails(value);
        }
      });
      
      return sanitized;
    };

    // Sanitize all category-specific details
    if (updates.clothingDetails) {
      updates.clothingDetails = sanitizeCategoryDetails(updates.clothingDetails);
    }
    if (updates.shoesDetails) {
      updates.shoesDetails = sanitizeCategoryDetails(updates.shoesDetails);
    }
    if (updates.accessoriesDetails) {
      updates.accessoriesDetails = sanitizeCategoryDetails(updates.accessoriesDetails);
    }
    if (updates.perfumeDetails) {
      updates.perfumeDetails = sanitizeCategoryDetails(updates.perfumeDetails);
    }
    if (updates.foodDetails) {
      updates.foodDetails = sanitizeCategoryDetails(updates.foodDetails);
    }
    if (updates.beveragesDetails) {
      updates.beveragesDetails = sanitizeCategoryDetails(updates.beveragesDetails);
    }
    if (updates.electronicsDetails) {
      updates.electronicsDetails = sanitizeCategoryDetails(updates.electronicsDetails);
    }
    if (updates.booksDetails) {
      updates.booksDetails = sanitizeCategoryDetails(updates.booksDetails);
    }
    if (updates.homeGardenDetails) {
      updates.homeGardenDetails = sanitizeCategoryDetails(updates.homeGardenDetails);
    }
    if (updates.sportsDetails) {
      updates.sportsDetails = sanitizeCategoryDetails(updates.sportsDetails);
    }
    if (updates.automotiveDetails) {
      updates.automotiveDetails = sanitizeCategoryDetails(updates.automotiveDetails);
    }
    if (updates.healthBeautyDetails) {
      updates.healthBeautyDetails = sanitizeCategoryDetails(updates.healthBeautyDetails);
    }

    // Convert numeric string fields to numbers for Food/Beverages
    if (updates.category === 'Food' && updates.foodDetails) {
      if (updates.foodDetails.maxOrdersPerDay !== undefined) {
        updates.foodDetails.maxOrdersPerDay = parseInt(updates.foodDetails.maxOrdersPerDay) || 50;
      }
      if (updates.foodDetails.deliveryTime?.value !== undefined) {
        updates.foodDetails.deliveryTime.value = parseInt(updates.foodDetails.deliveryTime.value) || 30;
      }
    }
    
    if (updates.category === 'Beverages' && updates.beveragesDetails) {
      if (updates.beveragesDetails.maxOrdersPerDay !== undefined) {
        updates.beveragesDetails.maxOrdersPerDay = parseInt(updates.beveragesDetails.maxOrdersPerDay) || 50;
      }
      if (updates.beveragesDetails.deliveryTime?.value !== undefined) {
        updates.beveragesDetails.deliveryTime.value = parseInt(updates.beveragesDetails.deliveryTime.value) || 30;
      }
    }

    // Convert numeric fields for Books
    if (updates.category === 'Books' && updates.booksDetails) {
      if (updates.booksDetails.publicationYear !== undefined) {
        updates.booksDetails.publicationYear = parseInt(updates.booksDetails.publicationYear) || null;
      }
      if (updates.booksDetails.pages !== undefined) {
        updates.booksDetails.pages = parseInt(updates.booksDetails.pages) || null;
      }
    }

    // Find and update the item
    const item = await Inventory.findOneAndUpdate(
      { _id: id, userId: user._id },
      { 
        ...updates,
        lastUpdated: new Date() 
      },
      { new: true, runValidators: true }
    );

    if (!item) {
      return NextResponse.json(
        { success: false, message: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to update inventory item' 
      },
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
