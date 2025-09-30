"use client";
import { useState, useEffect } from "react"; // Added useEffect
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ 
    email: "", 
    password: "",
    rememberMe: false 
  });
  const [message, setMessage] = useState("");
  const [submitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isClient, setIsClient] = useState(false); // Added client-side detection

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
    
    // Load remembered email only on client side
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setForm(prev => ({ ...prev, email: rememberedEmail, rememberMe: true }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ 
      ...form, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const res = await axios.post("/api/customer-signin-api", form);

      setMessage(res.data.message);

      // Only use localStorage on client side
      if (isClient) {
        localStorage.setItem("userEmail", form.email);
        localStorage.setItem("userRole", res.data.role);
        
        if (form.rememberMe) {
          localStorage.setItem("rememberedEmail", form.email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }
      }

      // Redirect
      if (res.data.role === "Customer") {
        setMessage("✅ Signin successful! Redirecting...");
        setTimeout(() => {
          router.push("/customer_dashboard");
        }, 1500);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setMessage(err.response?.data?.message || "❌ Login failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToMainPage = () => {
    router.push("/");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="card p-4 shadow-sm login-card">
          <div className="text-center">
            <div className="bg-primary bg-opacity-10 d-inline-flex p-3 rounded-circle mb-3">
              <i className="bi bi-person-check text-primary fs-2"></i>
            </div>
            <h4 className="fw-bold text-primary mb-1">Customer Sign In</h4>
            <p className="text-muted">Loading...</p>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card p-4 shadow-sm login-card">
        {/* Header with Logo */}
        <div className="text-center mb-4">
          <div className="bg-primary bg-opacity-10 d-inline-flex p-3 rounded-circle mb-3">
            <i className="bi bi-person-check text-primary fs-2"></i>
          </div>
          <h4 className="fw-bold text-primary mb-1">Customer Sign In</h4>
          <p className="text-muted">Access your customer account</p>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`alert alert-dismissible fade show ${
              message.includes("❌") || message.toLowerCase().includes("fail") || message.toLowerCase().includes("error")
                ? "alert-danger"
                : "alert-success"
            }`}
          >
            <div className="d-flex align-items-center">
              <i className={`bi ${
                message.includes("❌") || message.toLowerCase().includes("fail") || message.toLowerCase().includes("error")
                  ? "bi-exclamation-triangle-fill"
                  : "bi-check-circle-fill"
              } me-2`}></i>
              <span>{message}</span>
            </div>
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setMessage("")}
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
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div className="mb-3">
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

          {/* Remember Me & Forgot Password */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                name="rememberMe"
                checked={form.rememberMe}
                onChange={handleChange}
                id="rememberMe"
              />
              <label className="form-check-label small text-muted" htmlFor="rememberMe">
                Remember me
              </label>
            </div>
            <a 
              href="#" 
              className="small text-decoration-none text-muted"
              onClick={(e) => {
                e.preventDefault();
                setMessage("📧 Please contact support to reset your password.");
              }}
            >
              Forgot password?
            </a>
          </div>

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
            <i className="bi bi-house me-2"></i>
            Back to Main Page
          </button>
        </form>

        {/* Additional Links */}
        <div className="text-center mt-4">
          <small className="text-muted">
            Don't have an account?{" "}
            <a 
              href="#" 
              className="text-decoration-none fw-semibold"
              onClick={(e) => {
                e.preventDefault();
                setMessage("📞 Please contact our enrollment officer to create an account.");
              }}
            >
              Contact support
            </a>
          </small>
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
        
        .form-check-input:checked {
          background-color: #0d6efd;
          border-color: #0d6efd;
        }
      `}</style>
    </div>
  );
}