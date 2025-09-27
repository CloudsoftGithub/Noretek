//src/MainComponent/(SubComponents)/EnrollmentComponent/PropertyTablesEnrollment.jsx
"use client";
import { useState, useEffect } from "react";

export default function PropertyTablesEnrollment() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [showTable, setShowTable] = useState(true);

  // Filters
  const [propertyNameFilter, setPropertyNameFilter] = useState("");
  const [propertyDateFilter, setPropertyDateFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // 🔍 Global search

  // Fetch Property data
  const fetchProperties = async () => {
    try {
      setLoading(true); // Start loading
      const res = await fetch("/api/property");
      const data = await res.json();
      setProperties(data);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // Filtered + searched data
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
    <div className="container my-4">
      {/* Filters & Search Bar */}
      <div className="mb-3 row">
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

      {/* Spinner */}
      {loading && (
        <div className="text-center my-3">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading properties...</span>
          </div>
          <p className="mt-2">Loading properties...</p>
        </div>
      )}

      {/* Property Table */}
      {showTable && (
        <div className="card shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-striped mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>#</th>
                    <th>Owner</th>
                    <th>GSM</th>
                    <th>Property Name</th>
                    <th>Location</th>
                    <th>Address</th>
                    <th>Captured By</th>
                    <th>Date Captured</th>
                  </tr>
                </thead>
                <tbody>
                  {/* ✅ Skeleton Rows */}
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        {Array(8)
                          .fill("")
                          .map((_, j) => (
                            <td key={j}>
                              <div className="placeholder-glow">
                                <span className="placeholder col-8"></span>
                              </div>
                            </td>
                          ))}
                      </tr>
                    ))
                  ) : filteredProperties.length > 0 ? (
                    filteredProperties.map((p, index) => (
                      <tr key={p._id}>
                        <td>{index + 1}</td>
                        <td>{p.owner_name}</td>
                        <td>{p.owner_gsm}</td>
                        <td>{p.property_name}</td>
                        <td>{p.property_location}</td>
                        <td>{p.property_address}</td>
                        <td>{p.captured_by}</td>
                        <td>
                          {new Date(p.date_captured).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center">
                        No property found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
