"use client";

import { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

export default function PropertyForm() {
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState({
    owner_name: "",
    owner_gsm: "",
    property_name: "",
    property_location: "",
    property_address: "",
    captured_by: "",
    date_captured: new Date().toISOString().split("T")[0],
  });
  const [editId, setEditId] = useState(null);
  const [showTable, setShowTable] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // 🔍 Filters
  const [propertyNameFilter, setPropertyNameFilter] = useState("");
  const [propertyDateFilter, setPropertyDateFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ Set captured_by from logged-in user
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setForm((prev) => ({
          ...prev,
          captured_by: parsed.name || parsed.email || "Unknown User",
        }));
      } catch {
        setForm((prev) => ({ ...prev, captured_by: "Unknown User" }));
      }
    }
    fetchProperties();
  }, []);

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const showError = (message) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(""), 3000);
  };

  const fetchProperties = async () => {
    try {
      const res = await fetch("/api/property");
      const data = await res.json();

      // Sort by _id ascending
      const sortedData = [...data].sort((a, b) => a._id.localeCompare(b._id));
      setProperties(sortedData);
    } catch (error) {
      showError("Failed to fetch properties");
    }
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editId) {
        // Update
        await fetch("/api/property", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId, ...form }),
        });
        showSuccess("✅ Property updated successfully!");
      } else {
        // Create
        await fetch("/api/property", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        showSuccess("✅ Property added successfully!");
      }

      setForm({
        owner_name: "",
        owner_gsm: "",
        property_name: "",
        property_location: "",
        property_address: "",
        captured_by: form.captured_by,
        date_captured: new Date().toISOString().split("T")[0],
      });
      setEditId(null);
      fetchProperties();
    } catch (error) {
      showError("❌ Error saving property");
    }
  };

  const handleEdit = (p) => {
    setForm({
      owner_name: p.owner_name,
      owner_gsm: p.owner_gsm,
      property_name: p.property_name,
      property_location: p.property_location,
      property_address: p.property_address,
      captured_by: p.captured_by,
      date_captured: p.date_captured.split("T")[0],
    });
    setEditId(p._id);
    showSuccess("📝 Editing property - Update the details below");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this property?"))
      return;

    try {
      await fetch("/api/property", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      showSuccess("🗑️ Property deleted successfully!");
      fetchProperties();
    } catch (error) {
      showError("❌ Error deleting property");
    }
  };

  // ✅ Filtered + searched data
  const filteredProperties = properties.filter((p) => {
    const matchesName = p.property_name
      ?.toLowerCase()
      .includes(propertyNameFilter.toLowerCase());

    const matchesDate = propertyDateFilter
      ? new Date(p.date_captured).toLocaleDateString() ===
        new Date(propertyDateFilter).toLocaleDateString()
      : true;

    const matchesSearch = searchTerm
      ? [
          p.owner_name,
          p.owner_gsm,
          p.property_name,
          p.property_location,
          p.property_address,
          p.captured_by,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      : true;

    return matchesName && matchesDate && matchesSearch;
  });

  return (
    <div className="container mt-5">
      <h3 className="mb-4 text-center titleColor">Property Management</h3>

      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show">
          <i className="bi bi-check-circle-fill me-2"></i>
          {successMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccessMessage("")}
          ></button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="alert alert-danger alert-dismissible fade show">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {errorMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setErrorMessage("")}
          ></button>
        </div>
      )}

      {/* Add / Update Property Form */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header fw-bold backgro">
          <i className="bi bi-building me-2"></i>
          {editId ? "Update Property" : "Add New Property"}
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              {[
                { label: "Owner Name", name: "owner_name", icon: "bi-person" },
                { label: "Owner GSM", name: "owner_gsm", icon: "bi-phone" },
                { label: "Property Name", name: "property_name", icon: "bi-house" },
                { label: "Location", name: "property_location", icon: "bi-geo-alt" },
                { label: "Address", name: "property_address", icon: "bi-geo" },
              ].map((field, idx) => (
                <div
                  className={`col-md-${
                    field.name === "property_address" ? 12 : 6
                  } mb-3`}
                  key={idx}
                >
                  <label className="form-label">
                    <i className={`${field.icon} me-1`}></i>
                    {field.label}
                  </label>
                  <input
                    type="text"
                    className="form-control shadow-none"
                    name={field.name}
                    value={form[field.name]}
                    onChange={handleChange}
                    required
                  />
                </div>
              ))}

              {/* Captured By (Disabled) */}
              <div className="col-md-6 mb-3">
                <label className="form-label">
                  <i className="bi bi-person-check me-1"></i>
                  Captured By
                </label>
                <input
                  type="text"
                  className="form-control shadow-none"
                  name="captured_by"
                  value={form.captured_by}
                  disabled
                />
              </div>

              {/* Date Captured */}
              <div className="col-md-6 mb-3">
                <label className="form-label">
                  <i className="bi bi-calendar me-1"></i>
                  Date Captured
                </label>
                <input
                  type="date"
                  className="form-control shadow-none"
                  name="date_captured"
                  value={form.date_captured}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn backgro w-100">
              <i
                className={`bi ${
                  editId ? "bi-arrow-clockwise" : "bi-plus-circle"
                } me-2`}
              ></i>
              {editId ? "Update Property" : "Add Property"}
            </button>

            {editId && (
              <button
                type="button"
                className="btn btn-secondary w-100 mt-2"
                onClick={() => {
                  setEditId(null);
                  setForm({
                    owner_name: "",
                    owner_gsm: "",
                    property_name: "",
                    property_location: "",
                    property_address: "",
                    captured_by: form.captured_by,
                    date_captured: new Date().toISOString().split("T")[0],
                  });
                  showSuccess("➕ Add new property mode");
                }}
              >
                <i className="bi bi-x-circle me-2"></i>
                Cancel Edit
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="card mb-3 shadow-sm">
        <div className="card-body row">
          <div className="col-md-4 mb-2">
            <input
              type="text"
              className="form-control"
              placeholder="Filter by Property Name"
              value={propertyNameFilter}
              onChange={(e) => setPropertyNameFilter(e.target.value)}
            />
          </div>
          <div className="col-md-4 mb-2">
            <input
              type="date"
              className="form-control"
              value={propertyDateFilter}
              onChange={(e) => setPropertyDateFilter(e.target.value)}
            />
          </div>
          <div className="col-md-4 mb-2">
            <input
              type="text"
              className="form-control"
              placeholder="🔍 Search across all fields"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {showTable && (
        <div className="card shadow-sm border-0">
          <div className="card-header backgro d-flex justify-content-between align-items-center">
            <span className="fw-bold">
              <i className="bi bi-list-ul me-2"></i>
              Properties List ({filteredProperties.length})
            </span>
            <button className="btn btn-sm btn-light" onClick={fetchProperties}>
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </button>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-striped mb-0">
                <thead className="table-hover table-primary">
                  <tr>
                    <th>#</th>
                    <th>Owner</th>
                    <th>GSM</th>
                    <th>Property Name</th>
                    <th>Location</th>
                    <th>Address</th>
                    <th>Captured By</th>
                    <th>Date Captured</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.length > 0 ? (
                    filteredProperties.map((p, index) => (
                      <tr key={p._id}>
                        <td>{index + 1}</td>
                        <td>{p.owner_name}</td>
                        <td>{p.owner_gsm}</td>
                        <td className="fw-bold">{p.property_name}</td>
                        <td>{p.property_location}</td>
                        <td>{p.property_address}</td>
                        <td>{p.captured_by}</td>
                        <td>
                          {new Date(p.date_captured).toLocaleDateString()}
                        </td>
                        <td>
                          <button
                            className="btn btn-warning btn-sm me-2"
                            onClick={() => handleEdit(p)}
                            title="Edit Property"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(p._id)}
                            title="Delete Property"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="text-center py-4">
                        <i className="bi bi-inbox display-4 text-muted d-block mb-2"></i>
                        No properties found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .backgro {
          background-color: #0d6efd;
          color: white;
        }
        .titleColor {
          color: #0d6efd;
        }
      `}</style>
    </div>
  );
}
