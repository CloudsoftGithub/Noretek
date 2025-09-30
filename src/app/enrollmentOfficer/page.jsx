"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import PropertyForm from "@/MainComponent/(SubComponents)/EnrollmentComponent/PropertyForm";
import PropertyUnitForm from "@/MainComponent/(SubComponents)/EnrollmentComponent/PropertyUnitForm";
import PropertyTablesEnrollment from "@/MainComponent/(SubComponents)/EnrollmentComponent/PropertyTablesEnrollment";
import PropertyUnitTablesEnrollment from "@/MainComponent/(SubComponents)/EnrollmentComponent/PropertyUnitTablesEnrollment";
import CustomerSignUp from "@/MainComponent/(SubComponents)/EnrollmentComponent/CreateCustomer";
import UserList from "@/MainComponent/UserList";

import "./dashboard.css";

export default function Dashboard() {
  const router = useRouter();
  const [activeContent, setActiveContent] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Login states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState(null);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      // On desktop, sidebar should be open by default
      // On mobile, sidebar should be closed by default
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Fetch Dashboard Data
  useEffect(() => {
    if (user) {
      const fetchDashboard = async () => {
        try {
          const res = await fetch("/api/dashboard");
          const data = await res.json();
          if (data.success) setDashboardData(data);
        } catch (err) {
          console.error("Dashboard fetch error:", err);
        }
      };
      fetchDashboard();
    }
  }, [user]);

  // Decode JWT payload
  const decodeJwtPayload = (token) => {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const check = () => {
      const token = localStorage.getItem("token");
      const stored =
        localStorage.getItem("user") || localStorage.getItem("staff");
      if (!token || !stored) {
        setCheckingAuth(false);
        return;
      }

      const payload = decodeJwtPayload(token);
      if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
        localStorage.removeItem("token");
        setCheckingAuth(false);
        return;
      }

      try {
        const parsedUser = JSON.parse(stored);
        if (parsedUser.role === "Enrollment Officer") {
          setUser(parsedUser);
        } else if (parsedUser.role === "Admin") {
          router.push("/admin_dashboard");
        } else if (parsedUser.role === "Support Officer") {
          router.push("/support_dashboard");
        } else {
          localStorage.clear();
        }
      } catch {
        localStorage.clear();
      }
      setCheckingAuth(false);
    };
    check();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/stafflogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) {
        setLoginError(data.error || "Invalid credentials");
        setLoggingIn(false);
        return;
      }
      const loggedUser = data.user || data.staff;
      if (!loggedUser) {
        setLoginError("Login response missing user data");
        setLoggingIn(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(loggedUser));
      setUser(loggedUser);
      setEmail("");
      setPassword("");
    } catch (err) {
      setLoginError("Server error");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    router.push("/");
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleMenuClick = (key) => {
    setActiveContent(key);
    // Close sidebar on mobile after menu selection
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const sidebarMenu = [
    {
      title: "ENROLLMENT",
      children: [
        { name: "Add Property", key: "Add Property", icon: "bi-house-add" },
        { name: "Add Property Unit", key: "Add Property Unit", icon: "bi-columns-gap" },
        { name: "Create Customer", key: "Create Customer", icon: "bi-person-plus" },
        { name: "All Enrollment", key: "All Enrollment", icon: "bi-people" },
      ],
    },
  ];

  const renderContent = () => {
    switch (activeContent) {
      case "Add Property":
        return (
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Add New Property</h5>
              <PropertyForm />
            </div>
          </div>
        );
      case "Add Property Unit":
        return (
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Add Property Unit</h5>
              <PropertyUnitForm />
            </div>
          </div>
        );
      case "Create Customer":
        return (
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Create New Customer</h5>
              <CustomerSignUp />
            </div>
          </div>
        );
      case "All Enrollment":
        return (
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">All Enrollment Data</h5>
              <UserList />
            </div>
          </div>
        );
      case "Dashboard":
      default:
        return (
          <div className="container-fluid">
            {/* Welcome Header */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="card bg-primary text-white">
                  <div className="card-body">
                    <div className="row align-items-center">
                      <div className="col-md-8">
                        <h4 className="card-title mb-2">Welcome, Enrollment Officer!</h4>
                        <p className="card-text mb-0">
                          Manage properties, units, and customer enrollments efficiently.
                        </p>
                      </div>
                      <div className="col-md-4 text-md-end">
                        <i className="bi bi-person-check display-4 opacity-75"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Stats */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <div className="card stats-card border-start border-primary border-4">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="card-subtitle text-muted">Properties</h6>
                        <h3 className="card-title mt-2">{dashboardData?.totals.totalProperties || 0}</h3>
                      </div>
                      <div className="bg-primary bg-opacity-10 p-3 rounded">
                        <i className="bi bi-house text-primary fs-4"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card stats-card border-start border-success border-4">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="card-subtitle text-muted">Property Units</h6>
                        <h3 className="card-title mt-2">{dashboardData?.totals.totalUnits || 0}</h3>
                      </div>
                      <div className="bg-success bg-opacity-10 p-3 rounded">
                        <i className="bi bi-columns text-success fs-4"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card stats-card border-start border-info border-4">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="card-subtitle text-muted">Customers</h6>
                        <h3 className="card-title mt-2">{dashboardData?.totals.totalCustomers || 0}</h3>
                      </div>
                      <div className="bg-info bg-opacity-10 p-3 rounded">
                        <i className="bi bi-people text-info fs-4"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card stats-card border-start border-warning border-4">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="card-subtitle text-muted">Enrollments</h6>
                        <h3 className="card-title mt-2">{dashboardData?.totals.totalEnrollments || 0}</h3>
                      </div>
                      <div className="bg-warning bg-opacity-10 p-3 rounded">
                        <i className="bi bi-check-circle text-warning fs-4"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Sections */}
            <div className="row g-4">
              {/* Property Information */}
              <div className="col-12 col-lg-6">
                <div className="card h-100">
                  <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">
                      <i className="bi bi-house me-2"></i>
                      Property Information
                    </h5>
                    <span className="badge bg-light text-primary">{dashboardData?.totals.totalProperties || 0}</span>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <PropertyTablesEnrollment />
                    </div>
                  </div>
                </div>
              </div>

              {/* Property Unit Information */}
              <div className="col-12 col-lg-6">
                <div className="card h-100">
                  <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">
                      <i className="bi bi-columns me-2"></i>
                      Property Unit Information
                    </h5>
                    <span className="badge bg-light text-success">{dashboardData?.totals.totalUnits || 0}</span>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <PropertyUnitTablesEnrollment />
                    </div>
                  </div>
                </div>
              </div>

              {/* All Enrollment Report */}
              <div className="col-12">
                <div className="card h-100">
                  <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">
                      <i className="bi bi-people me-2"></i>
                      All Enrollment Report
                    </h5>
                    <span className="badge bg-light text-info">{dashboardData?.totals.totalCustomers || 0}</span>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <UserList />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  if (checkingAuth) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5>Checking authentication...</h5>
          <p className="text-muted">Please wait while we verify your credentials.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="card p-4 shadow-sm login-card">
          <div className="text-center mb-4">
            <div className="bg-primary bg-opacity-10 d-inline-flex p-3 rounded-circle mb-3">
              <i className="bi bi-person-check text-primary fs-1"></i>
            </div>
            <h4 className="fw-bold text-primary">Enrollment Officer</h4>
            <p className="text-muted">Sign in to your account</p>
          </div>
          {loginError && (
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {loginError}
            </div>
          )}
          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Email Address</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-envelope"></i>
                </span>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label fw-semibold">Password</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary w-100 py-2 fw-semibold"
              disabled={loggingIn}
            >
              {loggingIn ? (
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
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout d-flex">
      {/* Mobile Overlay */}
      {sidebarOpen && isMobile && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar - Enrollment Officer Style */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="logo">
            <i className="bi bi-person-check"></i>
            <div>
              <span className="fw-bold">Noretek</span>
              <small className="d-block text-muted">Enrollment Officer</small>
            </div>
          </div>
          <button 
            className="sidebar-close d-lg-none"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        
        <div className="sidebar-content">
          {/* Dashboard Menu Item */}
          <div className="menu-section">
            <div 
              className={`menu-item ${activeContent === "Dashboard" ? "active" : ""}`}
              onClick={() => handleMenuClick("Dashboard")}
            >
              <i className="bi bi-speedometer2"></i>
              <span>Dashboard</span>
            </div>
          </div>

          {/* Enrollment Section */}
          {sidebarMenu.map((section, idx) => (
            <div key={idx} className="menu-section">
              <div className="menu-title">{section.title}</div>
              {section.children.map((child, i) => (
                <div
                  key={i}
                  className={`menu-item ${activeContent === child.key ? "active" : ""}`}
                  onClick={() => handleMenuClick(child.key)}
                >
                  <i className={`bi ${child.icon}`}></i>
                  <span>{child.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Mobile Footer */}
        <div className="sidebar-footer d-lg-none">
          <div className="user-info">
            <i className="bi bi-person-circle me-2"></i>
            <div>
              <div className="fw-semibold">{user.name || user.email}</div>
              <small className="text-muted">Enrollment Officer</small>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-sm btn-outline-light w-100 mt-3"
          >
            <i className="bi bi-box-arrow-right me-2"></i>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow-1">
        <nav className="topbar">
          <div className="left d-flex align-items-center">
            <button 
              className="sidebar-toggle me-3 d-lg-none"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <i className="bi bi-list"></i>
            </button>
            <h4 className="mb-0 fw-bold text-primary">{activeContent}</h4>
          </div>
          <div className="right d-flex align-items-center gap-3">
            <div className="d-none d-lg-flex align-items-center gap-2 text-muted">
              <i className="bi bi-person-circle"></i>
              <span>{user.name || user.email}</span>
            </div>
            <div className="d-none d-md-flex align-items-center gap-2 text-muted">
              <i className="bi bi-calendar"></i>
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-sm btn-outline-danger d-none d-lg-flex align-items-center"
            >
              <i className="bi bi-box-arrow-right me-2"></i>
              Logout
            </button>
          </div>
        </nav>
        
        <div className="content-area p-3 p-lg-4">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}