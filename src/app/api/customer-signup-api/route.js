// src/app/api/customer-signup-api/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import CustomerTable from "@/models/CustomerTable";
import PropertyUnit from "@/models/PropertyUnit"; // Make sure to import PropertyUnit

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// CREATE Customer (Signup)
export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      name,
      email,
      phone,
      address,
      password,
      confirmPassword,
      role,
      property_id,
      unit_id,
      certifiName,
      certifiNo,
    } = body;

    if (
      !name ||
      !email ||
      !phone ||
      !address ||
      !password ||
      !confirmPassword ||
      !role ||
      !property_id ||
      !unit_id
    ) {
      return NextResponse.json(
        { success: false, message: "All required fields must be filled" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: "Passwords do not match" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = await CustomerTable.findOne({ email });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 400 }
      );
    }

    // Check if property unit is already assigned to another customer
    const existingPropertyUnit = await CustomerTable.findOne({
      $or: [
        { propertyName: property_id, propertyUnit: unit_id },
        { propertyUnit: unit_id }
      ]
    }).populate('propertyName').populate('propertyUnit');

    if (existingPropertyUnit) {
      return NextResponse.json(
        { 
          success: false, 
          message: `This property unit is already assigned to customer: ${existingPropertyUnit.name}. Please select a different unit.` 
        },
        { status: 400 }
      );
    }

    // Check if the property unit exists and is not already assigned
    const propertyUnit = await PropertyUnit.findById(unit_id);
    if (!propertyUnit) {
      return NextResponse.json(
        { success: false, message: "Selected property unit not found" },
        { status: 400 }
      );
    }

    if (propertyUnit.assigned) {
      return NextResponse.json(
        { success: false, message: "This property unit is already assigned to another customer" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await CustomerTable.create({
      name,
      email,
      phone,
      address,
      password: hashedPassword,
      role,
      certifiName: certifiName || "",
      certifiNo: certifiNo || "",
      propertyName: property_id,
      propertyUnit: unit_id,
    });

    // Mark the property unit as assigned
    await PropertyUnit.findByIdAndUpdate(unit_id, { assigned: true });

    // Generate JWT
    const token = jwt.sign(
      { id: customer._id, email: customer.email, role: customer.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Customer created successfully",
        customer,
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("customer error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

// GET all customers (with property + unit populated)
export async function GET() {
  try {
    await connectDB();
    const customers = await CustomerTable.find()
      .populate("propertyName", "property_name property_location property_address")
      .populate("propertyUnit", "unit_description blockno meter_id assigned");

    return NextResponse.json({
      success: true,
      customers,
    });
  } catch (error) {
    console.error("GET customers error:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching customers" },
      { status: 500 }
    );
  }
}

// UPDATE Customer
export async function PUT(req) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      id,
      name,
      email,
      phone,
      address,
      role,
      property_id,
      unit_id,
      certifiName,
      certifiNo,
    } = body;

    const updated = await CustomerTable.findByIdAndUpdate(
      id,
      {
        name,
        email,
        phone,
        address,
        role,
        propertyName: property_id,
        propertyUnit: unit_id,
        certifiName: certifiName || "",
        certifiNo: certifiNo || "",
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Customer updated successfully",
      customer: updated,
    });
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { success: false, message: "Error updating customer" },
      { status: 500 }
    );
  }
}

// PATCH → Block/Unblock customer
export async function PATCH(req) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, block } = body;

    const updated = await CustomerTable.findByIdAndUpdate(
      id,
      { isBlocked: block },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    const statusMsg = block ? "Customer blocked" : "Customer unblocked";
    return NextResponse.json({
      success: true,
      message: statusMsg,
      customer: updated,
    });
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json(
      { success: false, message: "Error blocking/unblocking customer" },
      { status: 500 }
    );
  }
}

// DELETE Customer
export async function DELETE(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const customer = await CustomerTable.findById(id);
    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    // Free up the property unit when customer is deleted
    if (customer.propertyUnit) {
      await PropertyUnit.findByIdAndUpdate(customer.propertyUnit, { assigned: false });
    }

    const deleted = await CustomerTable.findByIdAndDelete(id);

    return NextResponse.json({ 
      success: true, 
      message: "Customer deleted and property unit freed up" 
    });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Error deleting customer" },
      { status: 500 }
    );
  }
}