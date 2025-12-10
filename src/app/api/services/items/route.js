import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Service from '@/models/Service';
import Store from '@/models/Store';
import { verifySession } from '@/lib/auth';
import { uploadToWasabi, generateFileKey, validateImageFile } from '@/lib/wasabi';

export async function POST(request) {
  try {
    await connectDB();
    
    const user = await verifySession(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const serviceItemData = JSON.parse(formData.get('serviceItem'));
    const userId = user._id;

    // Fetch user's store from database
    const userStore = await Store.findOne({ userId, isActive: true });
    
    if (!userStore) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Please create a store first before adding services',
          needsStore: true 
        },
        { status: 400 }
      );
    }

    const storeId = userStore._id;

    // Handle portfolio image uploads
    const portfolioUrls = [];
    const portfolioFiles = formData.getAll('portfolioImages');
    
    for (const file of portfolioFiles) {
      if (file && file.size > 0) {
        try {
          validateImageFile(file);
          const fileKey = generateFileKey(userId.toString(), file.name);
          const imageUrl = await uploadToWasabi(file, fileKey);
          portfolioUrls.push(imageUrl);
        } catch (error) {
          console.error('Error uploading portfolio image:', error);
          // Continue with other images even if one fails
        }
      }
    }

    // Add uploaded image URLs to service item
    serviceItemData.portfolioImages = portfolioUrls;

    // Check if user has a Service document
    let service = await Service.findOne({ userId });

    if (!service) {
      // Create new service document if it doesn't exist
      service = await Service.create({
        userId,
        storeId,
        services: [serviceItemData]
      });
    } else {
      // Add the service item to the services array
      service.services.push(serviceItemData);
      await service.save();
    }

    return NextResponse.json({
      success: true,
      data: service
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding service item:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to add service' 
      },
      { status: 500 }
    );
  }
}
