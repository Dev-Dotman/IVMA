import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Store from '@/models/Store';
import { verifySession } from '@/lib/auth';

// PUT - Toggle website status
export async function PUT(req) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { status } = await req.json();
    
    // Validate status
    const validStatuses = ['active', 'inactive', 'pending', 'suspended', 'maintenance', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status' },
        { status: 400 }
      );
    }

    // Find the store
    const store = await Store.findOne({ userId: user._id, isActive: true });
    if (!store) {
      return NextResponse.json(
        { success: false, message: 'Store not found' },
        { status: 404 }
      );
    }

    // Generate website path if activating and doesn't exist
    if (status === 'active' && !store.ivmaWebsite.websitePath) {
      // Generate a website path based on store name
      let basePath = store.storeName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 30);
      
      // Ensure it meets the regex requirements
      if (basePath.length < 3) {
        basePath = `store-${basePath}`;
      }
      
      // Check if path is available
      let websitePath = basePath;
      let counter = 1;
      
      while (true) {
        const existingStore = await Store.findOne({
          'ivmaWebsite.websitePath': websitePath,
          _id: { $ne: store._id }
        });
        
        if (!existingStore) break;
        
        websitePath = `${basePath}-${counter}`;
        counter++;
        
        // Prevent infinite loop
        if (counter > 100) {
          websitePath = `${basePath}-${Date.now()}`;
          break;
        }
      }
      
      store.ivmaWebsite.websitePath = websitePath;
    }

    // Update website status
    store.ivmaWebsite.status = status;
    store.ivmaWebsite.isEnabled = status === 'active';
    
    if (status === 'active') {
      store.ivmaWebsite.activatedAt = new Date();
      store.ivmaWebsite.lastPublishedAt = new Date();
    } else if (status === 'suspended') {
      store.ivmaWebsite.suspendedAt = new Date();
    }

    // Save the store
    await store.save();

    return NextResponse.json({
      success: true,
      message: `Website ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: store
    });

  } catch (error) {
    console.error('Website toggle error:', error);
    
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
