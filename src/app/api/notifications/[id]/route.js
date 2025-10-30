import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { verifySession } from '@/lib/auth';

// PUT - Mark notification as read or dismiss
export async function PUT(req, { params }) {
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
    const { action } = await req.json(); // 'read' or 'dismiss'

    const notification = await Notification.findOne({
      _id: id,
      userId: user._id
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, message: 'Notification not found' },
        { status: 404 }
      );
    }

    if (action === 'read') {
      await notification.markAsRead();
    } else if (action === 'dismiss') {
      await notification.dismiss();
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Use "read" or "dismiss"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Notification ${action === 'read' ? 'marked as read' : 'dismissed'}`,
      data: notification
    });

  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete notification
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

    const { id } = await params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId: user._id
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, message: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Notification deletion error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
