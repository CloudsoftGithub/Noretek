"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffLoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus("Logging in...");

    try {
      const res = await fetch("/api/stafflogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        // Save token + user data in localStorage
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        setStatus("✅ Login successful! Redirecting...");

        // Role-based redirection
        setTimeout(() => {
          switch (data.user.role) {
            case "Admin":
              router.push("/admin_dashboard");
              break;
            case "Enrollment Officer":
              router.push("/enrollmentOfficer");
              break;
            case "Support Officer":
              router.push("/support_officer_dashboard");
              break;
            default:
              router.push("/dashboard");
          }
        }, 1500);
      } else {
        setStatus("❌ " + (data.error || "Invalid credentials"));
      }
    } catch (err) {
      setStatus("❌ Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const goToMainPage = () => {
    router.push("/");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card p-4 shadow-sm login-card">
        {/* Header with Logo */}
        <div className="text-center mb-4">
          <div className="bg-primary bg-opacity-10 d-inline-flex p-3 rounded-circle mb-3">
            <i className="bi bi-person-gear text-primary fs-2"></i>
          </div>
          <h4 className="fw-bold text-primary mb-1">Staff Login</h4>
          <p className="text-muted">Access your staff account</p>
        </div>

        {/* Status Message */}
        {status && (
          <div
            className={`alert alert-dismissible fade show ${
              status.includes("❌") || status.includes("⚠️")
                ? "alert-danger"
                : "alert-success"
            }`}
          >
            <div className="d-flex align-items-center">
              <i className={`bi ${
                status.includes("❌") || status.includes("⚠️")
                  ? "bi-exclamation-triangle-fill"
                  : "bi-check-circle-fill"
              } me-2`}></i>
              <span>{status}</span>
            </div>
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setStatus("")}
            ></button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">
              <i className="bi bi-envelope me-2 text-muted"></i>
              Email Address
            </label>
            <div className="input-group">
              <span className="input-group-text bg-light">
                <i className="bi bi-envelope text-muted"></i>
              </span>
              <input
                type="email"
                className="form-control"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="Enter your staff email"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold">
              <i className="bi bi-lock me-2 text-muted"></i>
              Password
            </label>
            <div className="input-group">
              <span className="input-group-text bg-light">
                <i className="bi bi-lock text-muted"></i>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={togglePasswordVisibility}
              >
                <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="btn btn-primary w-100 py-2 fw-semibold mb-3"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Signing In...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right me-2"></i>
                Sign In
              </>
            )}
          </button>

          {/* Back to Main Page Button */}
          <button
            type="button"
            className="btn btn-outline-secondary w-100 py-2"
            onClick={goToMainPage}
            disabled={submitting}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back to Main Page
          </button>
        </form>

        {/* Additional Information */}
        <div className="text-center mt-4">
          <small className="text-muted">
            Forgot your credentials?{" "}
            <a 
              href="#" 
              className="text-decoration-none fw-semibold"
              onClick={(e) => {
                e.preventDefault();
                setStatus("📧 Please contact system administrator for password reset.");
              }}
            >
              Contact admin
            </a>
          </small>
        </div>

        {/* Role Information */}
        <div className="mt-4 p-3 bg-light rounded">
          <h6 className="fw-bold mb-2">
            <i className="bi bi-info-circle me-2 text-primary"></i>
            Available Roles:
          </h6>
          <div className="row small text-muted">
            <div className="col-12 mb-1">
              <i className="bi bi-person-check me-1"></i>
              <strong>Admin:</strong> Full system access
            </div>
            <div className="col-12 mb-1">
              <i className="bi bi-person-plus me-1"></i>
              <strong>Enrollment Officer:</strong> Customer registration & property management
            </div>
            <div className="col-12">
              <i className="bi bi-headset me-1"></i>
              <strong>Support Officer:</strong> Customer support & ticket management
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-card {
          width: 100%;
          max-width: 420px;
          border: none;
          border-radius: 16px;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%);
          border: none;
          border-radius: 8px;
          transition: all 0.3s ease;
        }
        
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(13, 110, 253, 0.4);
        }
        
        .btn-primary:disabled {
          transform: none;
          box-shadow: none;
          opacity: 0.6;
        }
        
        .btn-outline-secondary {
          border-radius: 8px;
          transition: all 0.3s ease;
        }
        
        .btn-outline-secondary:hover:not(:disabled) {
          background-color: #6c757d;
          color: white;
          transform: translateY(-2px);
        }
        
        .btn-outline-secondary:disabled {
          opacity: 0.6;
        }
        
        .form-control {
          border-radius: 8px;
          border: 1px solid #dee2e6;
          padding: 0.75rem;
          transition: all 0.3s ease;
        }
        
        .form-control:focus {
          border-color: #0d6efd;
          box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.1);
        }
        
        .input-group-text {
          border-radius: 8px 0 0 8px;
          border: 1px solid #dee2e6;
          background-color: #f8f9fa;
        }
        
        .alert {
          border-radius: 8px;
          border: none;
        }
      `}</style>
    </div>
  );
}