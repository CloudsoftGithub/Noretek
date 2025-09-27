import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/supportTicket";
import { NextResponse } from "next/server";

// GET tickets
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    let filter = {};
    if (email) {
      filter.created_by = email.toLowerCase().trim();
    }

    const tickets = await SupportTicket.find(filter).lean();

    return NextResponse.json({
      success: true,
      tickets: tickets.map((t) => ({
        _id: t._id.toString(),
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: t.status,
        created_by: t.created_by,
        meter_id: t.meter_id,
        created_at: t.created_at ? new Date(t.created_at).toISOString() : null,
        updated_at: t.updated_at ? new Date(t.updated_at).toISOString() : null,
        closed_at: t.closed_at ? new Date(t.closed_at).toISOString() : null,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST (create ticket)
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { _id, created_by, meter_id, status, priority, ...cleanBody } = body;

    // Always ensure created_by and meter_id are set, and default status and priority
    const ticket = await SupportTicket.create({
      ...cleanBody,
      priority: priority || "Low",
      created_by: created_by || "anonymous",
      meter_id: meter_id || "Not assigned",
      status: status || "Pending",
    });

    return NextResponse.json({ success: true, ticket }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT (update ticket, including resolving)
export async function PUT(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, _id, status, priority, ...updateData } = body;
    const ticketId = id || _id;

    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    // If status is being set to Resolved, also set closedAt timestamp
    if (status === "Resolved") {
      updateData.status = "Resolved";
      updateData.closedAt = new Date();
    }
    if (status && status !== "Resolved") {
      updateData.status = status;
    }
    if (priority) {
      updateData.priority = priority;
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      ticketId,
      updateData,
      { new: true }
    );
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    return NextResponse.json({ success: true, ticket });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE (delete ticket)
export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });

    const ticket = await SupportTicket.findByIdAndDelete(id);
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Ticket deleted" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
