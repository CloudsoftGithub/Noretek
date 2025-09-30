// src/app/api/payments/initialize/route.js
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

    // Get current price from metadata or use default (ensure it's a number)
    const currentPricePerKg = Number(metadata?.pricePerKg) || getCurrentPrice();
    
    // Calculate units based on current price
    const calculatedUnits = (amount / currentPricePerKg).toFixed(2);

    // Enrich metadata with price and units
    const enrichedMetadata = {
      ...metadata,
      purchase_type: "gas_token",
      pricePerKg: currentPricePerKg,
      nairaAmount: amount,
      units: calculatedUnits
    };

    // Get the base URL dynamically - this works in both dev and production
    const baseUrl = process.env.NEXTAUTH_URL || 
                   (process.env.NODE_ENV === 'production' 
                     ? 'https://noretek-l4z4.onrender.com'  // Replace with your actual domain
                     : 'http://localhost:3000');

    const payload = {
      email,
      amount: amount * 100, // Convert to kobo for Paystack
      metadata: enrichedMetadata,
      callback_url: `${baseUrl}/customer_payment_dashboard/`
    };

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
              callback_url: payload.callback_url
            },
            status: "pending",
            meter_id: enrichedMetadata?.meterId || enrichedMetadata?.meterNumber || null,
            meter_number: enrichedMetadata?.meterNumber || enrichedMetadata?.meterId || null,
            created_at: new Date(),
            initiated_at: new Date()
          };

          await Payment.create(paymentData);
          console.log("✅ Payment initialized:", {
            reference,
            amount,
            pricePerKg: currentPricePerKg,
            units: calculatedUnits
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