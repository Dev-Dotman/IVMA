import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Service from '@/models/Service';
import { verifySession } from '@/lib/auth';

export async function POST(request) {
  try {


    await connectToDatabase();
        
        const user = await verifySession(request);
        if (!user) {
          return NextResponse.json(
            { success: false, message: 'Not authenticated' },
            { status: 401 }
          );
        }
    const data = await request.json();

    // Add userId from session
    data.userId = user._id;

    // Validate portfolio images count
    if (data.portfolioImages && data.portfolioImages.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 portfolio images allowed' },
        { status: 400 }
      );
    }

    const service = await Service.create(data);

    return NextResponse.json({
      success: true,
      data: service
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create service' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
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

    // Find the single service document for this user
    const service = await Service.findOne({ userId })
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: service // Return single service object or null
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch services' 
      },
      { status: 500 }
    );
  }
}
