// src/app/api/property_unit/route.js
import connectDB from "@/lib/mongodb";
import PropertyUnit from "@/models/PropertyUnit";

// ✅ GET all units
export async function GET() {
  try {
    await connectDB();
    const units = await PropertyUnit.find()
      .populate("property_id", "property_name")
      .sort({ createdAt: -1 });

    return new Response(JSON.stringify(units), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// ✅ POST new unit
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { property_id, unit_description, blockno, meter_id, captured_by, date } = body;

    if (!property_id || !unit_description || !blockno || !captured_by || !date) {
      return new Response(
        JSON.stringify({ message: "Required fields missing" }),
        { status: 400 }
      );
    }

    // Trim inputs
    const trimmedUnitDesc = unit_description.trim();
    const trimmedBlockNo = blockno.trim();
    const trimmedMeterId = meter_id ? meter_id.trim() : null;

    // Check for existing meter ID (strict duplicate check)
    if (trimmedMeterId) {
      const existingMeter = await PropertyUnit.findOne({ meter_id: trimmedMeterId });
      if (existingMeter) {
        return new Response(
          JSON.stringify({ message: "This meter ID is already assigned to another unit" }),
          { status: 400 }
        );
      }
    }

    // Check for exact duplicate unit (same property, exact same unit_description and blockno)
    const exactDuplicate = await PropertyUnit.findOne({
      property_id,
      unit_description: trimmedUnitDesc,
      blockno: trimmedBlockNo
    });

    if (exactDuplicate) {
      return new Response(
        JSON.stringify({ message: "This unit already exists in the selected property and block" }),
        { status: 400 }
      );
    }

    const newUnit = new PropertyUnit({
      property_id,
      unit_description: trimmedUnitDesc,
      blockno: trimmedBlockNo,
      meter_id: trimmedMeterId,
      captured_by,
      date,
    });

    await newUnit.save();

    return new Response(
      JSON.stringify({ message: "Unit added successfully", unit: newUnit }),
      { status: 201 }
    );
  } catch (err) {
    // Remove all MongoDB duplicate key error handling
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// ✅ PUT update unit
export async function PUT(request) {
  try {
    await connectDB();
    const { id, ...updates } = await request.json();

    if (!id) {
      return new Response(JSON.stringify({ message: "Unit ID is required" }), { status: 400 });
    }

    // Trim inputs if they exist in updates
    if (updates.unit_description) updates.unit_description = updates.unit_description.trim();
    if (updates.blockno) updates.blockno = updates.blockno.trim();
    if (updates.meter_id) updates.meter_id = updates.meter_id.trim();

    const existingUnit = await PropertyUnit.findById(id);
    if (!existingUnit) {
      return new Response(JSON.stringify({ message: "Unit not found" }), { status: 404 });
    }

    const property_id = updates.property_id || existingUnit.property_id;
    const unit_description = updates.unit_description || existingUnit.unit_description;
    const blockno = updates.blockno || existingUnit.blockno;
    const meter_id = updates.meter_id || existingUnit.meter_id;

    // Check for exact duplicate unit (excluding current unit)
    const exactDuplicate = await PropertyUnit.findOne({
      _id: { $ne: id },
      property_id,
      unit_description,
      blockno
    });

    if (exactDuplicate) {
      return new Response(
        JSON.stringify({ message: "This unit already exists in the selected property and block" }),
        { status: 400 }
      );
    }

    // Check for meter_id duplicate if updating meter_id
    if (updates.meter_id) {
      const existingMeter = await PropertyUnit.findOne({
        _id: { $ne: id },
        meter_id: updates.meter_id
      });
      if (existingMeter) {
        return new Response(
          JSON.stringify({ message: "This meter ID is already assigned to another unit" }),
          { status: 400 }
        );
      }
    }

    const updated = await PropertyUnit.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) {
      return new Response(JSON.stringify({ message: "Unit not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ message: "Unit updated successfully", unit: updated }), { status: 200 });
  } catch (err) {
    // Remove all MongoDB duplicate key error handling
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// ✅ DELETE a unit
export async function DELETE(request) {
  try {
    await connectDB();
    const { id } = await request.json();
    await PropertyUnit.findByIdAndDelete(id);
    return new Response(JSON.stringify({ message: "Unit deleted successfully" }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}