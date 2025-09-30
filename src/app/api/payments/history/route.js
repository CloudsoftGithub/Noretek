// /src/app/api/payments/history/route.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { connectDB, getConnectionStatus } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Token from "@/models/Token";

// Conversion factor: 510 kg = 1 cubic meter
const KG_PER_CUBIC_METER = 510;

// Helper function to calculate cubic meters from kg
const calculateCubicMeters = (kg) => {
  return (kg / KG_PER_CUBIC_METER).toFixed(3);
};

export async function GET(request) {
  try {
    // Check and ensure database connection
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
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    if (!customerEmail) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Customer email is required',
          code: 'MISSING_EMAIL'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    console.log('Fetching payments for:', {
      email: customerEmail,
      page,
      limit,
      skip,
      sortBy,
      sortOrder
    });

    // Get payments and tokens separately
    const payments = await Payment.find({ 
      customer_email: customerEmail.toLowerCase().trim() 
    })
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .lean();

    const totalPayments = await Payment.countDocuments({ 
      customer_email: customerEmail.toLowerCase().trim() 
    });

    console.log(`Found ${payments.length} payments out of ${totalPayments} total`);

    // Get associated tokens for these payments
    const references = payments.map(p => p.reference);
    const tokens = await Token.find({ reference: { $in: references } }).lean();
    
    // Create a map for quick token lookup
    const tokenMap = {};
    tokens.forEach(token => {
      tokenMap[token.reference] = token;
    });

    // Format payments for response
    const formattedPayments = payments.map(payment => {
      const associatedToken = tokenMap[payment.reference];
      const pricePerKg = Number(payment.metadata?.pricePerKg) || 55;
      const amount = Number(payment.amount) || 0;
      const calculatedUnits = amount > 0 ? (amount / pricePerKg).toFixed(2) : '0.00';
      const units = associatedToken?.units || calculatedUnits;
      const cubicMeters = calculateCubicMeters(parseFloat(units));

      return {
        id: payment._id?.toString(),
        reference: payment.reference,
        status: payment.status,
        amount: amount,
        displayAmount: `₦${amount.toLocaleString()}`,
        currency: payment.currency || 'NGN',
        customerEmail: payment.customer_email,
        customerName: payment.customer_name,
        meterNumber: payment.meter_number,
        meterId: payment.meter_id,
        token: associatedToken ? {
          value: associatedToken.token,
          units: associatedToken.units || calculatedUnits,
          cubicMeters: cubicMeters,
          pricePerKg: pricePerKg,
          expiresAt: associatedToken.expiresAt
        } : null,
        created_at: payment.created_at || payment.initiated_at,
        paid_at: payment.paid_at,
        verified_at: payment.verified_at,
        metadata: {
          pricePerKg: pricePerKg,
          nairaAmount: amount,
          units: associatedToken?.units || calculatedUnits,
          cubicMeters: cubicMeters,
          status: payment.status
        }
      };
    });

    const totalPages = Math.ceil(totalPayments / limit);
    const hasMore = page < totalPages;

    const response = {
      success: true,
      data: {
        payments: formattedPayments,
        pagination: {
          currentPage: page,
          totalPages,
          totalPayments,
          pageSize: limit,
          hasNextPage: hasMore,
          hasPreviousPage: page > 1,
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        query: { sortBy, sortOrder, limit, page },
        conversionFactor: `${KG_PER_CUBIC_METER} kg = 1 cubic meter`
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=300'
        }
      }
    );

  } catch (error) {
    console.error('Payment history error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}