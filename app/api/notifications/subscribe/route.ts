import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, userAgent, timestamp } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Store subscription in Supabase
    // Note: You'll need to create a 'push_subscriptions' table in Supabase with columns:
    // - id (uuid, primary key)
    // - endpoint (text, unique)
    // - keys (jsonb)
    // - user_agent (text)
    // - created_at (timestamp)
    // - updated_at (timestamp)

    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          user_agent: userAgent,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'endpoint'
        }
      );

    if (error) {
      console.error('Error storing subscription:', error);
      return NextResponse.json(
        { error: 'Failed to store subscription', details: error.message },
        { status: 500 }
      );
    }

    console.log('Subscription stored successfully');

    return NextResponse.json({
      success: true,
      message: 'Subscription stored successfully'
    });
  } catch (error) {
    console.error('Error in subscribe endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
