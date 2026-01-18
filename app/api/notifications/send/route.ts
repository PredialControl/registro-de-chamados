import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Configure VAPID keys (make sure these are set in .env.local)
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:chamados@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, body: notificationBody, url, ticketId, buildingId, type, tag } = body;

    if (!title || !notificationBody) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    // Fetch all push subscriptions from database
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions', details: error.message },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found');
      return NextResponse.json({
        success: true,
        message: 'No subscriptions to send to',
        sent: 0
      });
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body: notificationBody,
      url: url || '/chamados',
      ticketId,
      buildingId,
      tag: tag || type || 'default'
    });

    console.log('Sending notification to', subscriptions.length, 'subscribers');
    console.log('Payload:', payload);

    // Check if VAPID keys are configured
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn('VAPID keys not configured. Notifications will not be sent.');
      return NextResponse.json({
        success: false,
        message: 'VAPID keys not configured',
        sent: 0
      });
    }

    // Send notifications to all subscriptions
    const sendPromises = subscriptions.map(async (sub: any) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: sub.keys
        };

        await webpush.sendNotification(pushSubscription, payload);
        console.log('Notification sent to:', sub.endpoint.substring(0, 50) + '...');
      } catch (error: any) {
        console.error('Error sending to subscription:', error.message);

        // If subscription is invalid (410 Gone), remove it
        if (error.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
          console.log('Removed invalid subscription');
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({
      success: true,
      message: 'Notifications queued successfully',
      sent: subscriptions.length
    });
  } catch (error) {
    console.error('Error in send endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
