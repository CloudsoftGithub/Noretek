// /src/app/api/tokens/history/route.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { connectDB, getConnectionStatus } from '@/lib/mongodb';
import Token from '@/models/Token';

export async function GET(request) {
  try {
    // Check database connection
    const connectionStatus = getConnectionStatus();
    console.log('Database connection status:', connectionStatus);
    
    if (connectionStatus !== 1) {
      console.log('Database not connected, attempting to connect...');
      await connectDB();
    }

    const { searchParams } = new URL(request.url);
    const customerEmail = searchParams.get('email');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;

    if (!customerEmail) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Customer email is required' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Fetching token history for:', customerEmail);

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Find tokens for customer
    const tokens = await Token.find({ 
      customerEmail: customerEmail.toLowerCase().trim()
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalTokens = await Token.countDocuments({ 
      customerEmail: customerEmail.toLowerCase().trim()
    });
    const totalPages = Math.ceil(totalTokens / limit);

    console.log(`Found ${tokens.length} tokens out of ${totalTokens} total`);

    const formattedTokens = tokens.map(token => ({
      _id: token._id?.toString(),
      reference: token.reference,
      token: token.token,
      meterNumber: token.meterNumber,
      units: token.units,
      amount: token.amount,
      customerName: token.customerName,
      status: token.status,
      expiresAt: token.expiresAt,
      generatedAt: token.generatedAt,
      createdAt: token.createdAt,
      timestamp: token.createdAt
    }));

    return new Response(
      JSON.stringify({
        success: true,
        tokens: formattedTokens,
        pagination: {
          currentPage: page,
          totalPages,
          totalTokens,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Token history error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}