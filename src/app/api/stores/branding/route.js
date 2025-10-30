import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Store from '@/models/Store';
import { verifySession } from '@/lib/auth';
import { uploadToWasabi, generateFileKey, validateImageFile, deleteFromWasabi } from '@/lib/wasabi';

// PUT - Update store branding
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

    // Get current store
    const store = await Store.findOne({ userId: user._id, isActive: true });
    if (!store) {
      return NextResponse.json(
        { success: false, message: 'Store not found' },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const primaryColor = formData.get('primaryColor');
    const secondaryColor = formData.get('secondaryColor');
    const logoFile = formData.get('logo');
    const bannerFile = formData.get('banner');

    const updateData = {
      'branding.primaryColor': primaryColor || store.branding.primaryColor,
      'branding.secondaryColor': secondaryColor || store.branding.secondaryColor
    };

    // Handle logo upload
    if (logoFile && logoFile.size > 0) {
      try {
        // Validate file
        validateImageFile(logoFile);
        
        // Delete old logo if exists
        if (store.branding.logo) {
          try {
            const oldKey = store.branding.logo.split('.com/')[1];
            if (oldKey) {
              await deleteFromWasabi(oldKey);
            }
          } catch (deleteError) {
            console.warn('Failed to delete old logo:', deleteError);
          }
        }
        
        // Upload new logo
        const logoKey = generateFileKey(user._id, `logo-${logoFile.name}`);
        const logoUrl = await uploadToWasabi(logoFile, logoKey);
        updateData['branding.logo'] = logoUrl;
        
      } catch (uploadError) {
        return NextResponse.json(
          { success: false, message: `Logo upload failed: ${uploadError.message}` },
          { status: 400 }
        );
      }
    }

    // Handle banner upload
    if (bannerFile && bannerFile.size > 0) {
      try {
        // Validate file
        validateImageFile(bannerFile);
        
        // Delete old banner if exists
        if (store.branding.banner) {
          try {
            const oldKey = store.branding.banner.split('.com/')[1];
            if (oldKey) {
              await deleteFromWasabi(oldKey);
            }
          } catch (deleteError) {
            console.warn('Failed to delete old banner:', deleteError);
          }
        }
        
        // Upload new banner
        const bannerKey = generateFileKey(user._id, `banner-${bannerFile.name}`);
        const bannerUrl = await uploadToWasabi(bannerFile, bannerKey);
        updateData['branding.banner'] = bannerUrl;
        
      } catch (uploadError) {
        return NextResponse.json(
          { success: false, message: `Banner upload failed: ${uploadError.message}` },
          { status: 400 }
        );
      }
    }

    // Update store
    const updatedStore = await Store.findOneAndUpdate(
      { userId: user._id, isActive: true },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Store branding updated successfully',
      data: updatedStore
    });

  } catch (error) {
    console.error('Store branding update error:', error);
    
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
