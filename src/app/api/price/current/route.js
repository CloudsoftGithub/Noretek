// src/app/api/price/current/route.js
import { NextResponse } from "next/server";

// Conversion factor: 510 kg = 1 cubic meter
const KG_PER_CUBIC_METER = 510;

// Helper function to calculate cubic meters from kg
const calculateCubicMeters = (kg) => {
  return (kg / KG_PER_CUBIC_METER).toFixed(3);
};

export async function GET() {
  try {
    // You could store this in a database or use a different persistence method
    const currentPrice = Number(process.env.CURRENT_PRICE_PER_KG) || 1500;
    
    // Calculate example volumes for reference
    const exampleAmounts = [1500, 3000, 7500, 15000]; // Example amounts in Naira
    const examples = exampleAmounts.map(amount => {
      const kg = amount / currentPrice;
      return {
        amount,
        kg: kg.toFixed(2),
        cubicMeters: calculateCubicMeters(kg)
      };
    });
    
    return NextResponse.json({
      success: true,
      pricePerKg: currentPrice,
      conversionInfo: {
        factor: `${KG_PER_CUBIC_METER} kg = 1 cubic meter`,
        examples,
        note: "Purchase amounts shown with corresponding kg and cubic meter values"
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      pricePerKg: 1500,
      conversionInfo: {
        factor: `${KG_PER_CUBIC_METER} kg = 1 cubic meter`,
        examples: [],
        note: "Default pricing used due to error"
      }
    });
  }
}