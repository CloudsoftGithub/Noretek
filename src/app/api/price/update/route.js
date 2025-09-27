// app/api/price/update/route.js
import { NextResponse } from "next/server";
import { setCurrentPrice, savePriceToStorage } from '@/lib/priceManager';

// Conversion factor: 510 kg = 1 cubic meter
const KG_PER_CUBIC_METER = 510;

// Helper function to calculate cubic meters from kg
const calculateCubicMeters = (kg) => {
  return (kg / KG_PER_CUBIC_METER).toFixed(3);
};

export async function POST(request) {
  try {
    const { pricePerKg } = await request.json();

    if (!pricePerKg || pricePerKg <= 0) {
      return NextResponse.json(
        { success: false, message: "Valid price is required" },
        { status: 400 }
      );
    }

    // Update the server-side price
    const newPrice = setCurrentPrice(pricePerKg);
    
    // Optional: Save to persistent storage
    await savePriceToStorage(newPrice);

    // Calculate example volumes for reference
    const exampleUnits1kg = 1;
    const exampleVolume1kg = calculateCubicMeters(exampleUnits1kg);
    const exampleUnits5kg = 5;
    const exampleVolume5kg = calculateCubicMeters(exampleUnits5kg);

    return NextResponse.json({
      success: true,
      message: "Price updated successfully",
      pricePerKg: newPrice,
      conversionInfo: {
        factor: `${KG_PER_CUBIC_METER} kg = 1 cubic meter`,
        examples: [
          { kg: exampleUnits1kg, cubicMeters: exampleVolume1kg, cost: newPrice },
          { kg: exampleUnits5kg, cubicMeters: exampleVolume5kg, cost: newPrice * 5 }
        ]
      }
    });

  } catch (error) {
    console.error("Price update error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update price" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { getCurrentPrice } = await import('@/lib/priceManager');
    const currentPrice = getCurrentPrice();
    
    // Calculate example volumes for reference
    const exampleUnits = [1, 2.5, 5, 10];
    const examples = exampleUnits.map(kg => ({
      kg,
      cubicMeters: calculateCubicMeters(kg),
      cost: currentPrice * kg
    }));
    
    return NextResponse.json({
      success: true,
      pricePerKg: currentPrice,
      conversionInfo: {
        factor: `${KG_PER_CUBIC_METER} kg = 1 cubic meter`,
        examples
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        pricePerKg: 1500,
        conversionInfo: {
          factor: `${KG_PER_CUBIC_METER} kg = 1 cubic meter`,
          examples: []
        }
      },
      { status: 500 }
    );
  }
}