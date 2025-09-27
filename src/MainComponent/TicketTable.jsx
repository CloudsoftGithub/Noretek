"use client";

import React from "react";
import PriorityBadge from "@/MainComponent/PriorityBadge";
import StatusBadge from "@/MainComponent/StatusBadge";

export default function TicketTable({ tickets, onEdit, onDelete, onViewComments }) {
  if (!Array.isArray(tickets) || tickets.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        <i className="bi bi-ticket-detailed display-4"></i>
        <p>No tickets found</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle">
        <thead className="table-light">
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Category</th>
            <th>Created By</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket._id || ticket.ticket_id}>
              <td>
                <strong>#{ticket._id?.slice(-6) || ticket.ticket_id}</strong>
              </td>
              <td>{ticket.title}</td>
              <td>{ticket.category}</td>
              <td>{ticket.created_by || "N/A"}</td>
              <td>
                <StatusBadge status={ticket.status} />
              </td>
              <td>
                <PriorityBadge level={ticket.priority} />
              </td>
              <td>
                {ticket.created_at
                  ? new Date(ticket.created_at).toLocaleDateString()
                  : "N/A"}
              </td>
              <td>
                <div className="btn-group">
                  <button
                    className="btn btn-sm btn-outline-info"
                    onClick={() => onViewComments(ticket)}
                  >
                    <i className="bi bi-pencil"></i>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
