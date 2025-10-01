// src/app/api/payments/initialize/route.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { initializeTransaction } from "@/lib/paystack";
import { connectDB } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { getCurrentPrice } from '@/lib/priceManager';

export async function POST(request) {
  try {
    await connectDB();

    const { email, amount, metadata } = await request.json();

    if (!email || !amount) {
      return NextResponse.json(
        { status: false, message: "Email and amount are required" },
        { status: 400 }
      );
    }

    // Get current price from metadata or use default
    const currentPricePerKg = Number(metadata?.pricePerKg) || getCurrentPrice();
    
    // Calculate units based on current price
    const calculatedUnits = (amount / currentPricePerKg).toFixed(2);

    // Enrich metadata with user session info
    const enrichedMetadata = {
      ...metadata,
      purchase_type: "gas_token",
      pricePerKg: currentPricePerKg,
      nairaAmount: amount,
      units: calculatedUnits,
      userEmail: email,
      timestamp: Date.now(),
      sessionId: metadata?.sessionId || `sess_${Date.now()}`
    };

    // SMART BASE URL DETECTION - FIXED VERSION
    let baseUrl;
    
    // Method 1: Check FORCE_LOCALHOST environment variable
    if (process.env.FORCE_LOCALHOST === 'true') {
      baseUrl = 'http://localhost:3000';
      console.log('🔧 Using localhost (FORCE_LOCALHOST=true)');
    }
    // Method 2: Check NODE_ENV
    else if (process.env.NODE_ENV === 'development') {
      baseUrl = 'http://localhost:3000';
      console.log('🔧 Using localhost (NODE_ENV=development)');
    }
    // Method 3: Check if NEXTAUTH_URL contains localhost
    else if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.includes('localhost')) {
      baseUrl = 'http://localhost:3000';
      console.log('🔧 Using localhost (NEXTAUTH_URL contains localhost)');
    }
    // Method 4: Production fallback
    else {
      baseUrl = process.env.NEXTAUTH_URL || 'https://noretek-l4z4.onrender.com';
      console.log('🔧 Using production URL');
    }

    console.log('🚀 Payment initialization details:', { 
      email, 
      baseUrl, 
      NODE_ENV: process.env.NODE_ENV,
      FORCE_LOCALHOST: process.env.FORCE_LOCALHOST,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL
    });

    const payload = {
      email,
      amount: amount * 100,
      metadata: enrichedMetadata,
      callback_url: `${baseUrl}/customer_payment_dashboard/?email=${encodeURIComponent(email)}&refresh=true`
    };

    console.log('📤 Paystack payload:', {
      callback_url: payload.callback_url,
      amount: payload.amount,
      email: payload.email
    });

    const response = await initializeTransaction(payload);

    if (response?.status) {
      const reference = response.data.reference;

      try {
        const existing = await Payment.findOne({ reference });

        if (!existing) {
          const paymentData = {
            reference,
            user_id: enrichedMetadata?.user_id || null,
            customer_email: email.toLowerCase(),
            customer_name: enrichedMetadata?.customer_name || null,
            customer_phone: enrichedMetadata?.customer_phone || null,
            amount: amount,
            currency: "NGN",
            channel: "paystack",
            transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            payment_method: "card",
            metadata: {
              ...enrichedMetadata,
              authorization_url: response.data.authorization_url,
              callback_url: payload.callback_url,
              userEmail: email
            },
            status: "pending",
            meter_id: enrichedMetadata?.meterId || enrichedMetadata?.meterNumber || null,
            meter_number: enrichedMetadata?.meterNumber || enrichedMetadata?.meterId || null,
            created_at: new Date(),
            initiated_at: new Date()
          };

          await Payment.create(paymentData);
          console.log("✅ Payment initialized successfully:", {
            reference,
            email,
            amount,
            callback_url: payload.callback_url,
            environment: process.env.NODE_ENV
          });
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
        throw dbError;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Initialize error:", error);
    return NextResponse.json(
      {
        status: false,
        message: error.message || "Failed to initialize transaction"
      },
      { status: 500 }
    );
  }
}