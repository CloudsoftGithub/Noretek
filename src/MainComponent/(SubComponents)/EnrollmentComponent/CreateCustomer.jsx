"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomerSignUp() {
  const router = useRouter();
  const [units, setUnits] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [uniqueProperties, setUniqueProperties] = useState([]);
  const [submitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
    role: "Customer",
    property_id: "",
    unit_id: "",
    certificate_name: "",
    certificate_number: "",
    // These will be auto-populated
    property_name: "",
    unit_description: "",
    blockno: "",
    meter_id: ""
  });

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 5000);
  };

  const showError = (message) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(""), 5000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Auto-populate property details when property is selected
  useEffect(() => {
    if (form.property_id) {
      const selectedProperty = uniqueProperties.find(p => p._id === form.property_id);
      if (selectedProperty) {
        setForm(prev => ({
          ...prev,
          property_name: selectedProperty.property_name || ""
        }));
      }
    }
  }, [form.property_id, uniqueProperties]);

  // Auto-populate unit details when unit is selected
  useEffect(() => {
    if (form.unit_id) {
      const selectedUnit = filteredUnits.find(u => u._id === form.unit_id);
      if (selectedUnit) {
        setForm(prev => ({
          ...prev,
          unit_description: selectedUnit.unit_description || "",
          blockno: selectedUnit.blockno || "",
          meter_id: selectedUnit.meter_id || ""
        }));
      }
    }
  }, [form.unit_id, filteredUnits]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");
    setIsSubmitting(true);

    // Validation
    if (form.password !== form.confirmPassword) {
      showError("❌ Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    if (form.password.length < 6) {
      showError("❌ Password must be at least 6 characters long");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/customer-signup-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      
      if (data.success) {
        showSuccess("✅ Signup successful! ");
        
        // Reset form
        setForm({
          name: "",
          email: "",
          phone: "",
          address: "",
          password: "",
          confirmPassword: "",
          role: "Customer",
          property_id: "",
          unit_id: "",
          certificate_name: "",
          certificate_number: "",
          property_name: "",
          unit_description: "",
          blockno: "",
          meter_id: ""
        });

        // Redirect to login after 3 seconds
       
      } else {
        showError(`❌ ${data.message || "Error occurred during signup"}`);
      }
    } catch (err) {
      console.error(err);
      showError("❌ Server error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch property units
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res = await fetch("/api/property_unit");
        const data = await res.json();

        setUnits(data);

        const uniqueProps = [
          ...new Map(
            data
              .filter((u) => u.property_id)
              .map((u) => [u.property_id._id, u.property_id])
          ).values(),
        ];
        setUniqueProperties(uniqueProps);
        showSuccess("📋 Properties and units loaded successfully");
      } catch (err) {
        console.error("Error fetching units:", err);
        showError("❌ Failed to load properties and units");
      }
    };

    fetchUnits();
  }, []);

  useEffect(() => {
    if (!form.property_id) {
      setFilteredUnits([]);
      setForm(prev => ({ ...prev, unit_id: "", property_name: "" }));
      return;
    }
    
    const filtered = units.filter((u) => u.property_id && u.property_id._id === form.property_id);
    setFilteredUnits(filtered);
    
    // Reset unit selection when property changes
    setForm(prev => ({ ...prev, unit_id: "", unit_description: "", blockno: "", meter_id: "" }));
  }, [form.property_id, units]);

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div className="shadow-lg my-4 p-md-5 p-4 rounded w-100" style={{ maxWidth: 900 }}>
        <h4 className="text-center titleColor font-monospace fw-bold text-uppercase mb-4">
          <i className="bi bi-person-plus me-2"></i>
          Customer Registration
        </h4>

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

        <form onSubmit={handleSubmit}>
          {/* Customer Information Section */}
          <div className="card mb-4 border-0 shadow-sm">
            <div className="card-header backgro">
              <i className="bi bi-person-badge me-2"></i>
              Customer Information
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="fw-bold form-label">
                    <i className="bi bi-person me-1"></i>
                    Full Name:
                  </label>
                  <input
                    type="text"
                    className="form-control shadow-none p-2"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="fw-bold form-label">
                    <i className="bi bi-envelope me-1"></i>
                    Email Address:
                  </label>
                  <input
                    type="email"
                    className="form-control shadow-none p-2"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="fw-bold form-label">
                    <i className="bi bi-phone me-1"></i>
                    Phone Number:
                  </label>
                  <input
                    type="text"
                    className="form-control shadow-none p-2"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="fw-bold form-label">
                    <i className="bi bi-geo-alt me-1"></i>
                    Address:
                  </label>
                  <input
                    type="text"
                    className="form-control shadow-none p-2"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    required
                    placeholder="Enter your address"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="fw-bold form-label">
                    <i className="bi bi-lock me-1"></i>
                    Password:
                  </label>
                  <input
                    type="password"
                    className="form-control shadow-none p-2"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    placeholder="Create a password (min. 6 characters)"
                    minLength="6"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="fw-bold form-label">
                    <i className="bi bi-lock-fill me-1"></i>
                    Confirm Password:
                  </label>
                  <input
                    type="password"
                    className="form-control shadow-none p-2"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Confirm your password"
                    minLength="6"
                  />
                </div>

                <div className="col-md-12 mb-3">
                  <label className="fw-bold form-label">
                    <i className="bi bi-person-rolodex me-1"></i>
                    Role:
                  </label>
                  <input
                    className="form-control shadow-none p-2 bg-light"
                    name="role"
                    value={form.role}
                    readOnly
                  />
                  <small className="text-muted">This account will be created as a Customer</small>
                </div>
              </div>
            </div>
          </div>

          {/* Certificate Information Section */}
          <div className="card mb-4 border-0 shadow-sm">
            <div className="card-header backgro">
              <i className="bi bi-file-earmark-text me-2"></i>
              Certificate Information
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="fw-bold form-label">
                    <i className="bi bi-file-text me-1"></i>
                    Certificate Name:
                  </label>
                  <input
                    type="text"
                    className="form-control shadow-none p-2"
                    name="certificate_name"
                    value={form.certificate_name}
                    onChange={handleChange}
                    required
                    placeholder="Enter certificate name"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="fw-bold form-label">
                    <i className="bi bi-hash me-1"></i>
                    Certificate Number:
                  </label>
                  <input
                    type="text"
                    className="form-control shadow-none p-2"
                    name="certificate_number"
                    value={form.certificate_number}
                    onChange={handleChange}
                    required
                    placeholder="Enter certificate number"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Property Information Section */}
          <div className="card mb-4 border-0 shadow-sm">
            <div className="card-header backgro">
              <i className="bi bi-building me-2"></i>
              Property Information
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="fw-bold form-label">
                    <i className="bi bi-house me-1"></i>
                    Property Name:
                  </label>
                  <select
                    className="form-select shadow-none p-2"
                    name="property_id"
                    value={form.property_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Property</option>
                    {uniqueProperties.map((p) => (
                      <option key={p?._id} value={p?._id}>
                        {p?.property_name || "Unnamed Property"}
                      </option>
                    ))}
                  </select>
                  {form.property_name && (
                    <small className="text-success">
                      <i className="bi bi-check-circle me-1"></i>
                      Selected: {form.property_name}
                    </small>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="fw-bold form-label">
                    <i className="bi bi-door-open me-1"></i>
                    Property Unit:
                  </label>
                  <select
                    className="form-select shadow-none p-2"
                    name="unit_id"
                    value={form.unit_id}
                    onChange={handleChange}
                    required
                    disabled={!form.property_id}
                  >
                    <option value="">{form.property_id ? "Select Unit" : "First select a property"}</option>
                    {filteredUnits.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.unit_description} - Block {u.blockno}
                        {u.meter_id && ` (Meter: ${u.meter_id})`}
                      </option>
                    ))}
                  </select>
                  {form.unit_description && (
                    <small className="text-success">
                      <i className="bi bi-check-circle me-1"></i>
                      Selected: {form.unit_description} - Block {form.blockno}
                      {form.meter_id && ` - Meter: ${form.meter_id}`}
                    </small>
                  )}
                </div>

                {/* Display auto-populated property details */}
                {(form.property_name || form.unit_description) && (
                  <div className="col-12 mt-3 p-3 bg-light rounded">
                    <h6 className="fw-bold">
                      <i className="bi bi-info-circle me-2"></i>
                      Selected Property Details:
                    </h6>
                    <div className="row small">
                      <div className="col-md-3">
                        <strong>Property:</strong> {form.property_name || "Not selected"}
                      </div>
                      <div className="col-md-3">
                        <strong>Unit:</strong> {form.unit_description || "Not selected"}
                      </div>
                      <div className="col-md-3">
                        <strong>Block:</strong> {form.blockno || "Not selected"}
                      </div>
                      <div className="col-md-3">
                        <strong>Meter:</strong> {form.meter_id || "Not assigned"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn primaryColor w-100 py-3 fw-bold"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Processing Registration...
              </>
            ) : (
              <>
                <i className="bi bi-person-check me-2"></i>
                Complete Registration
              </>
            )}
          </button>

          <div className="text-center mt-3">
            <small className="text-muted">
              Already have an account?{" "}
              <a href="/login" className="text-decoration-none">
                Login here
              </a>
            </small>
          </div>
        </form>
      </div>

      <style jsx>{`
        .backgro {
          background-color: #0d6efd;
          color: white;
        }
        .primaryColor {
          background-color: #0d6efd;
          color: white;
          border: none;
        }
        .primaryColor:hover {
          background-color: #0b5ed7;
        }
        .titleColor {
          color: #0d6efd;
        }
      `}</style>
    </div>
  );
}