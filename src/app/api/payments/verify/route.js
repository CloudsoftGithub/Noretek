// src/app/api/payments/verify/route.js
import { connectDB, getConnectionStatus } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Token from "@/models/Token";
import axios from "axios";
import { getCurrentPrice } from "@/lib/priceManager";

// Define API_BASE_URL using environment variable
const API_BASE_URL = process.env.API_BASE_URL || 'http://47.107.69.132:9400';

// Conversion factor: 510 kg = 1 cubic meter
const KG_PER_CUBIC_METER = 510;

// Helper function to calculate cubic meters from kg
const calculateCubicMeters = (kg) => {
  return (kg / KG_PER_CUBIC_METER).toFixed(3);
};

// Helper function for vend token generation with improved error handling
async function generateVendToken(meterNumber, amount, reference) {
  const payload = {
    meterId: meterNumber,
    amount: amount,
    authorizationPassword: "Ntk0001@#",
    serialNumber: reference,
    company: "Noretek Energy",
    isVendByTotalPaid: true,
    isPreview: false,
  };

  const endpoints = [
    `${API_BASE_URL}/API/Token/CreditToken/Generate`,
    `${API_BASE_URL}/API/Token/CreditToken/GenerateS2`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Attempting token generation from ${endpoint}`);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log(`❌ API error from ${endpoint}:`, errorData?.message || response.status);
        continue;
      }

      const data = await response.json();
      if (data.result?.token) {
        console.log(`✅ Token successfully generated from ${endpoint}`);
        return {
          token: data.result.token,
          units: data.result.totalUnit,
          source: endpoint,
        };
      } else {
        console.log(`❌ No token in response from ${endpoint}:`, data?.message);
      }
    } catch (error) {
      console.error(`❌ Error calling ${endpoint}:`, error.message);
    }
  }

  throw new Error("Both vend API endpoints failed");
}

// Helper function for fallback token generation
function generateNumericToken() {
  const token = Array.from({ length: 20 }, () =>
    Math.floor(Math.random() * 10)
  ).join("");
  console.log("Generated fallback numeric token");
  return token;
}

// Helper to check if token already exists
async function checkExistingToken(reference) {
  try {
    const token = await Token.findOne({ reference });
    if (token?.token) {
      console.log("Found existing token:", reference);
      return token;
    }
    return null;
  } catch (error) {
    console.error("Error checking existing token:", error);
    return null;
  }
}

// Main verification handler with improved error handling
export async function GET(request) {
  try {
    // Ensure database connection
    if (getConnectionStatus() !== 1) {
      console.log("Establishing database connection...");
      await connectDB();
    }

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");
    const forceRegenerate = searchParams.get("force") === "true";
    const isInitialVerification = searchParams.get("initial") === "true";
    const skipTokenGeneration = searchParams.get("skipToken") === "true";

    if (!reference) {
      console.error("Missing payment reference");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment reference is required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check existing records first with error handling
    let payment, existingToken;
    try {
      [payment, existingToken] = await Promise.all([
        Payment.findOne({ reference }),
        checkExistingToken(reference),
      ]);
    } catch (dbError) {
      console.error("Database query error:", dbError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Database error",
          message: dbError.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // If payment is already verified, return existing token WITHOUT regenerating
    if (payment?.status === "success") {
      console.log(`Payment ${reference} already verified`);
      
      const responseData = {
        success: true,
        status: "success",
        message: "Payment verified",
        data: payment.toObject?.() || payment,
        fromCache: true,
        tokenExists: !!existingToken,
      };

      // Include existing token if available with cubic meters
      if (existingToken?.token) {
        const units = parseFloat(existingToken.units || '0');
        const cubicMeters = calculateCubicMeters(units);
        
        responseData.data.token = existingToken.token;
        responseData.data.tokenInfo = {
          token: existingToken.token,
          units: existingToken.units,
          cubicMeters: cubicMeters,
          meterNumber: existingToken.meterNumber,
          amount: existingToken.amount,
          generatedAt: existingToken.created_at,
        };
        console.log("Returning existing token for verified payment with cubic meters");
      } else {
        // Remove token from metadata to avoid confusion
        if (responseData.data.metadata?.token) {
          delete responseData.data.metadata.token;
        }
      }

      return new Response(JSON.stringify(responseData), {
        status: 200, 
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        }
      });
    }

    // Verify with Paystack with improved error handling
    console.log(`Verifying with Paystack: ${reference}`);
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    
    if (!paystackSecret) {
      throw new Error("Paystack secret key not configured");
    }

    let paystackData;
    try {
      const paystackRes = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        { 
          headers: { Authorization: `Bearer ${paystackSecret}` },
          timeout: 10000 // 10 second timeout
        }
      );
      paystackData = paystackRes.data?.data;
    } catch (paystackError) {
      console.error("Paystack API error:", paystackError.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment gateway error",
          message: paystackError.message,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const paystackStatus = paystackData?.status;
    const nairaAmount = parseInt(paystackData.amount) / 100;

    // Get price from metadata or use default
    const currentPricePerKg =
      Number(paystackData.metadata?.pricePerKg) || getCurrentPrice();
    const calculatedUnits = (nairaAmount / currentPricePerKg).toFixed(2);
    const calculatedCubicMeters = calculateCubicMeters(parseFloat(calculatedUnits));

    console.log("Payment Details:", {
      reference,
      amount: nairaAmount,
      pricePerKg: currentPricePerKg,
      calculatedUnits,
      calculatedCubicMeters,
      status: paystackStatus,
      source: paystackData.metadata?.pricePerKg ? "metadata" : "priceManager",
    });

    if (paystackStatus === "success") {
      // Create or update payment record
      try {
        if (!payment) {
          payment = new Payment({
            reference,
            status: "success",
            amount: nairaAmount,
            currency: paystackData.currency || "NGN",
            customer_email:
              paystackData.customer?.email?.toLowerCase() ||
              "unknown@example.com",
            customer_name: paystackData.customer?.first_name
              ? `${paystackData.customer.first_name} ${
                  paystackData.customer.last_name || ""
                }`.trim()
              : null,
            customer_phone: paystackData.customer?.phone || null,
            meter_id: paystackData.metadata?.meterId || null,
            meter_number: paystackData.metadata?.meterNumber || null,
            metadata: {
              ...paystackData.metadata,
              pricePerKg: currentPricePerKg,
              nairaAmount,
              units: calculatedUnits,
              cubicMeters: calculatedCubicMeters,
            },
            transaction_id: paystackData.id?.toString(),
            gateway_response: paystackData,
            created_at: new Date(),
            initiated_at: new Date(paystackData.created_at),
            paid_at: new Date(paystackData.paid_at),
            verified_at: new Date(),
          });
          console.log("Created new payment record");
        } else {
          payment.status = "success";
          payment.amount = nairaAmount;
          payment.metadata = {
            ...payment.metadata,
            pricePerKg: currentPricePerKg,
            nairaAmount,
            units: calculatedUnits,
            cubicMeters: calculatedCubicMeters,
          };
          payment.verified_at = new Date();
          console.log("Updated existing payment record");
        }

        await payment.save();
      } catch (dbError) {
        console.error("Error saving payment:", dbError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Database save error",
            message: dbError.message,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Token generation logic - only generate if explicitly requested and no token exists
      let finalToken = existingToken?.token;
      let tokenGenerated = false;

      // Only generate token if:
      // 1. This is initial verification AND
      // 2. We're not skipping token generation AND  
      // 3. No existing token exists OR force regeneration is requested
      if (isInitialVerification && !skipTokenGeneration && (!existingToken || forceRegenerate)) {
        try {
          if (payment.meter_number && payment.customer_email) {
            console.log("Attempting to generate vend token...");
            const vendToken = await generateVendToken(
              payment.meter_number,
              nairaAmount,
              payment.reference
            );

            const tokenDoc = new Token({
              reference: payment.reference,
              token: vendToken.token,
              meterNumber: payment.meter_number,
              amount: nairaAmount,
              units: calculatedUnits,
              cubicMeters: calculatedCubicMeters,
              customerEmail: payment.customer_email,
              customerName: payment.customer_name,
              userId: payment.metadata?.userId,
              pricePerKg: currentPricePerKg,
              source: vendToken.source,
              expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
              created_at: new Date(),
            });

            await tokenDoc.save();
            console.log("✅ Token generated and saved:", tokenDoc.reference);

            finalToken = vendToken.token;
            tokenGenerated = true;
            existingToken = tokenDoc;
          }
        } catch (vendError) {
          console.error("❌ Vend API failed:", vendError.message);

          // Fallback token generation
          try {
            console.log("Generating fallback token...");
            const fallbackToken = generateNumericToken();
            const tokenDoc = new Token({
              reference: payment.reference,
              token: fallbackToken,
              meterNumber: payment.meter_number,
              amount: nairaAmount,
              units: calculatedUnits,
              cubicMeters: calculatedCubicMeters,
              customerEmail: payment.customer_email,
              customerName: payment.customer_name,
              userId: payment.metadata?.userId,
              pricePerKg: currentPricePerKg,
              source: "fallback",
              expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
              created_at: new Date(),
            });

            await tokenDoc.save();
            console.log("✅ Fallback token generated and saved");

            finalToken = fallbackToken;
            tokenGenerated = true;
            existingToken = tokenDoc;
          } catch (fallbackError) {
            console.error("❌ Fallback token generation failed:", fallbackError.message);
          }
        }
      } else if (existingToken) {
        console.log("Using existing token, skipping generation");
        finalToken = existingToken.token;
      }

      // Prepare response
      const responseData = {
        success: true,
        status: "success",
        data: payment.toObject?.() || payment,
        tokenGenerated: tokenGenerated,
        tokenExists: !!existingToken,
      };

      // Include token in response only if it exists
      if (finalToken) {
        const units = parseFloat(existingToken?.units || calculatedUnits);
        const cubicMeters = calculateCubicMeters(units);
        
        responseData.data.token = finalToken;
        responseData.data.tokenInfo = {
          token: finalToken,
          units: existingToken?.units || calculatedUnits,
          cubicMeters: cubicMeters,
          meterNumber: payment.meter_number,
          amount: nairaAmount,
          generatedAt: existingToken?.created_at || new Date(),
        };
      } else {
        // Remove any existing token from metadata
        if (responseData.data.metadata?.token) {
          delete responseData.data.metadata.token;
        }
      }

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    }

    // Handle failed payments
    console.log(`Payment failed with status: ${paystackStatus}`);
    try {
      if (payment) {
        payment.status = paystackStatus || "failed";
        payment.gateway_response = paystackData;
        await payment.save();
      }
    } catch (dbError) {
      console.error("Error updating failed payment:", dbError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        status: paystackStatus || "failed",
        message: "Payment verification failed",
        data: payment || null,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Payment verification error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}