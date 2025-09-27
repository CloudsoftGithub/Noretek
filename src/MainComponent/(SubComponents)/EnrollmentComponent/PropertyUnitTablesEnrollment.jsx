//src/MainComponent/(SubComponents)/EnrollmentComponent/PropertyUnitTablesEnrollment.jsx
"use client";
import { useState, useEffect } from "react";

export default function PropertyUnitTablesEnrollment() {
  const [units, setUnits] = useState([]);
  const [showTable, setShowTable] = useState(true);

  // Filters
  const [unitPropertyFilter, setUnitPropertyFilter] = useState("");
  const [unitDateFilter, setUnitDateFilter] = useState("");

  // Fetch Property Unit data
  const fetchUnits = async () => {
    try {
      const res = await fetch("/api/property_unit");
      const data = await res.json();
      setUnits(data);
    } catch (error) {
      console.error("Error fetching property units:", error);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const filteredUnits = units.filter(
    (u) =>
      u.property_id?.property_name
        ?.toLowerCase()
        .includes(unitPropertyFilter.toLowerCase()) &&
      (unitDateFilter
        ? new Date(u.date).toLocaleDateString() ===
          new Date(unitDateFilter).toLocaleDateString()
        : true)
  );

  return (
    <div className="container my-4">
      {/* Property Unit Filters */}
      <div className="my-4 row">
        <div className="col-md-6 mb-2">
          <input
            type="text"
            className="form-control"
            placeholder="Filter by Property"
            value={unitPropertyFilter}
            onChange={(e) => setUnitPropertyFilter(e.target.value)}
          />
        </div>
        <div className="col-md-6 mb-2">
          <input
            type="date"
            className="form-control"
            value={unitDateFilter}
            onChange={(e) => setUnitDateFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Property Unit Table */}
      <div className="card">
        <div className="card-header">Property Unit List</div>
        <div className="card-body p-0 table-responsive">
          <table className="table table-striped mb-0">
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Property</th>
                <th>Unit Description</th>
                <th>Block No</th>
                <th>Meter ID</th>
                <th>Captured By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.length > 0 ? (
                filteredUnits.map((u, idx) => (
                  <tr key={u._id}>
                    <td>{idx + 1}</td>
                    <td>{u.property_id?.property_name || "N/A"}</td>
                    <td>{u.unit_description}</td>
                    <td>{u.blockno}</td>
                    <td>{u.meter_id}</td>
                    <td>{u.captured_by}</td>
                    <td>{new Date(u.date).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center">
                    No unit found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
