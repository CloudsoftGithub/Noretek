"use client";

import { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

export default function PropertyUnitForm() {
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [meters, setMeters] = useState([]);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [filterProperty, setFilterProperty] = useState("");
  const [user, setUser] = useState(null);
  const [loadingMeters, setLoadingMeters] = useState(false);

  const [form, setForm] = useState({
    property_id: "",
    unit_description: "",
    blockno: "",
    meter_id: "",
    captured_by: "",
    date: "",
  });

  useEffect(() => {
    const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (loggedUser?.name || loggedUser?.email) {
      setUser(loggedUser);
      setForm((prev) => ({
        ...prev,
        captured_by: loggedUser.name || loggedUser.email,
        date: new Date().toISOString().split("T")[0],
      }));
    }
    fetchUnits();
    fetchProperties();
  }, []);

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(""), 6000);
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch("/api/property_unit");
      const data = await res.json();
      setUnits(data);
    } catch (error) {
      showError("Failed to fetch units");
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await fetch("/api/property");
      const data = await res.json();
      setProperties(data);
    } catch (error) {
      showError("Failed to fetch properties");
    }
  };

  const fetchMeters = async () => {
    setLoadingMeters(true);
    setError("");
    
    try {
      console.log("🔄 Starting meter fetch...");
      
      const res = await fetch("/api/noretek-meter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: localStorage.getItem("noretekToken") || ""
        }),
      });

      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);

      if (data.success) {
        setMeters(data.meters || []);
        
        // Store the token if provided
        if (data.token) {
          localStorage.setItem("noretekToken", data.token);
        }
        
        const meterCount = data.meters?.length || 0;
        showSuccess(`✅ Successfully loaded ${meterCount} meters from Noretek API`);
        
        if (meterCount === 0) {
          showError("⚠️ No meters found in the API response");
        }
      } else {
        const errorMsg = data.message || data.error || "Failed to fetch meters from Noretek API";
        console.error("API Error:", errorMsg);
        showError(`❌ ${errorMsg}`);
        
        if (data.details) {
          console.error("Error details:", data.details);
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
      showError(`❌ Network error: ${err.message}`);
    } finally {
      setLoadingMeters(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const method = editId ? "PUT" : "POST";
      const res = await fetch("/api/property_unit", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { id: editId, ...form } : form),
      });

      const data = await res.json();
      
      if (!res.ok) {
        showError(data.message || data.error || "Error saving unit");
        return;
      }

      if (editId) {
        showSuccess("✅ Unit updated successfully!");
      } else {
        showSuccess("✅ Unit added successfully!");
      }

      // Reset form
      setForm({
        property_id: "",
        unit_description: "",
        blockno: "",
        meter_id: "",
        captured_by: user?.name || user?.email || "",
        date: new Date().toISOString().split("T")[0],
      });
      setEditId(null);
      fetchUnits();
      setError("");
    } catch (error) {
      showError("❌ Error saving unit: " + error.message);
    }
  };

  const handleEdit = (unit) => {
    setForm({
      property_id: unit.property_id?._id || "",
      unit_description: unit.unit_description,
      blockno: unit.blockno,
      meter_id: unit.meter_id || "",
      captured_by: unit.captured_by,
      date: unit.date ? new Date(unit.date).toISOString().split("T")[0] : "",
    });
    setEditId(unit._id);
    showSuccess("📝 Editing unit - Update the details below");
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this unit?")) return;
    
    try {
      const res = await fetch("/api/property_unit", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        showError(data.message || "Error deleting unit");
        return;
      }
      
      showSuccess("🗑️ Unit deleted successfully!");
      fetchUnits();
    } catch (error) {
      showError("❌ Error deleting unit");
    }
  };

  // Helper function to check if meter is registered to another unit
  const getMeterStatus = (meterId, currentUnitId = null) => {
    if (!meterId) return { isRegistered: false, unit: null };
    
    const registeredUnit = units.find(unit => 
      unit.meter_id === meterId && unit._id !== currentUnitId
    );
    
    return {
      isRegistered: !!registeredUnit,
      unit: registeredUnit
    };
  };

  // Get all registered meter IDs (excluding current unit being edited)
  const registeredMeterIds = units
    .filter(unit => unit.meter_id && unit._id !== editId)
    .map(unit => unit.meter_id);

  // Separate available and registered meters
  const availableMeters = meters.filter(meter => 
    !registeredMeterIds.includes(meter.meterId)
  );
  
  const registeredMeters = meters.filter(meter => 
    registeredMeterIds.includes(meter.meterId)
  );

  const displayedUnits = filterProperty === "" 
    ? [] 
    : units.filter((u) => u.property_id?._id === filterProperty);

  const selectedProperty = properties.find(p => p._id === filterProperty);

  return (
    <div className="container mt-4">
      <h3 className="mb-4 text-center titleColor">
        <i className="bi bi-grid me-2"></i>
        Property Unit Management
      </h3>

      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show">
          <i className="bi bi-check-circle-fill me-2"></i>
          {successMessage}
          <button className="btn-close" onClick={() => setSuccessMessage("")}></button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
          <button className="btn-close" onClick={() => setError("")}></button>
        </div>
      )}

      {/* Form */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header backgro">
          <i className={`bi ${editId ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
          {editId ? "Edit Property Unit" : "Add New Property Unit"}
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* Property Dropdown */}
              <div className="col-md-6 mb-3">
                <label className="form-label">
                  <i className="bi bi-building me-1"></i>
                  Property
                </label>
                <select
                  className="form-control shadow-none"
                  name="property_id"
                  value={form.property_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Property</option>
                  {properties.map((p, idx) => (
                    <option key={p._id} value={p._id}>
                      {String(idx + 1).padStart(4, "0")}PU - {p.property_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit Description */}
              <div className="col-md-6 mb-3">
                <label className="form-label">
                  <i className="bi bi-door-open me-1"></i>
                  Unit Description
                </label>
                <input
                  type="text"
                  className="form-control shadow-none"
                  name="unit_description"
                  value={form.unit_description}
                  onChange={handleChange}
                  placeholder="e.g., Unit 1, Apartment A"
                  required
                />
                <small className="text-muted">
                  Only exact duplicates will show error
                </small>
              </div>

              {/* Block No */}
              <div className="col-md-6 mb-3">
                <label className="form-label">
                  <i className="bi bi-grid-3x3 me-1"></i>
                  Block No
                </label>
                <input
                  type="text"
                  className="form-control shadow-none"
                  name="blockno"
                  value={form.blockno}
                  onChange={handleChange}
                  placeholder="e.g., Block A, Section 1"
                  required
                />
                <small className="text-muted">
                  Slight variations are allowed
                </small>
              </div>

              {/* Meter ID */}
              <div className="col-md-6 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label mb-0">
                    <i className="bi bi-speedometer2 me-1"></i>
                    Meter ID
                  </label>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-primary"
                    onClick={fetchMeters}
                    disabled={loadingMeters}
                  >
                    {loadingMeters ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-clockwise me-2"></i>
                        Load Meters
                      </>
                    )}
                  </button>
                </div>
                <select
                  className="form-select shadow-none"
                  name="meter_id"
                  value={form.meter_id}
                  onChange={handleChange}
                  disabled={loadingMeters}
                >
                  <option value="">Select Meter (Optional)</option>
                  
                  {/* Available Meters */}
                  {availableMeters.length > 0 && (
                    <optgroup label="🟢 Available Meters">
                      {availableMeters.map((meter) => (
                        <option key={meter.meterId} value={meter.meterId}>
                          ✅ {meter.meterId}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {/* Registered Meters (for editing current unit only) */}
                  {registeredMeters.length > 0 && editId && (
                    <optgroup label="🔴 Already Registered">
                      {registeredMeters.map((meter) => {
                        const status = getMeterStatus(meter.meterId, editId);
                        return (
                          <option 
                            key={meter.meterId} 
                            value={meter.meterId}
                            disabled={status.isRegistered}
                            style={{ color: '#6c757d' }}
                          >
                            🚫 {meter.meterId} (Assigned)
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                </select>
                
                <div className="mt-2">
                  <small className="text-success">
                    <i className="bi bi-check-circle me-1"></i>
                    {availableMeters.length} meters available
                  </small>
                  {registeredMeters.length > 0 && (
                    <small className="text-warning d-block">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      {registeredMeters.length} meters already registered
                    </small>
                  )}
                  {meters.length === 0 && (
                    <small className="text-muted d-block">
                      <i className="bi bi-info-circle me-1"></i>
                      Click "Load Meters" to fetch from Noretek API
                    </small>
                  )}
                </div>
              </div>

              {/* Captured By */}
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

              {/* Date */}
              <div className="col-md-6 mb-3">
                <label className="form-label">
                  <i className="bi bi-calendar me-1"></i>
                  Date
                </label>
                <input
                  type="date"
                  className="form-control shadow-none"
                  name="date"
                  value={form.date}
                  disabled
                />
              </div>
            </div>
            
            <div className="d-grid gap-2">
              <button type="submit" className="btn backgro">
                <i className={`bi ${editId ? 'bi-arrow-clockwise' : 'bi-plus-circle'} me-2`}></i>
                {editId ? "Update Unit" : "Add Unit"}
              </button>
              
              {editId && (
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditId(null);
                    setForm({
                      property_id: "",
                      unit_description: "",
                      blockno: "",
                      meter_id: "",
                      captured_by: user?.name || user?.email || "",
                      date: new Date().toISOString().split("T")[0],
                    });
                    showSuccess("➕ Add new unit mode");
                  }}
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-3">
        <label className="form-label fw-bold">
          <i className="bi bi-funnel me-1"></i>
          Filter by Property
        </label>
        <select
          className="form-select shadow-none"
          value={filterProperty}
          onChange={(e) => setFilterProperty(e.target.value)}
        >
          <option value="">-- Select Property to View Units --</option>
          {properties.map((p) => (
            <option key={p._id} value={p._id}>
              {p.property_name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card border border-top shadow-sm">
        <div className="card-header titleColor fw-bold d-flex justify-content-between align-items-center">
          <span>
            <i className="bi bi-list-ul me-2"></i>
            Property Unit List 
            {selectedProperty && ` - ${selectedProperty.property_name}`}
            ({displayedUnits.length})
          </span>
          <button 
            className="btn btn-sm btn-light"
            onClick={() => {
              fetchUnits();
              showSuccess("🔄 Units refreshed successfully");
            }}
          >
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
        <div className="card-body p-0 table-responsive">
          <table className="table table-striped mb-0">
            <thead className="table-hover table-primary">
              <tr>
                <th>#</th>
                <th>Property Name</th>
                <th>Unit Description</th>
                <th>Block No</th>
                <th>Meter ID</th>
                <th>Captured By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedUnits.length > 0 ? (
                displayedUnits.map((u, idx) => (
                  <tr key={u._id}>
                    <td>{idx + 1}</td>
                    <td className="fw-bold">{u.property_id?.property_name || "N/A"}</td>
                    <td>{u.unit_description}</td>
                    <td>{u.blockno}</td>
                    <td>
                      {u.meter_id ? (
                        <span className="badge bg-success">
                          <i className="bi bi-speedometer2 me-1"></i>
                          {u.meter_id}
                        </span>
                      ) : (
                        <span className="badge bg-warning">
                          <i className="bi bi-exclamation-triangle me-1"></i>
                          No Meter
                        </span>
                      )}
                    </td>
                    <td>{u.captured_by}</td>
                    <td>{u.date ? new Date(u.date).toLocaleDateString() : "N/A"}</td>
                    <td>
                      <button
                        className="btn btn-warning btn-sm me-2"
                        onClick={() => handleEdit(u)}
                        title="Edit Unit"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(u._id)}
                        title="Delete Unit"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    <i className="bi bi-inbox display-4 text-muted d-block mb-2"></i>
                    {filterProperty === ""
                      ? "Please select a property to view units"
                      : "No units found for this property"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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