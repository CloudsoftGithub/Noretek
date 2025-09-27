"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import PropertyForm from "@/MainComponent/(SubComponents)/EnrollmentComponent/PropertyForm";
import PropertyUnitForm from "@/MainComponent/(SubComponents)/EnrollmentComponent/PropertyUnitForm";
import PropertyTablesEnrollment from "@/MainComponent/(SubComponents)/EnrollmentComponent/PropertyTablesEnrollment";
import PropertyUnitTablesEnrollment from "@/MainComponent/(SubComponents)/EnrollmentComponent/PropertyUnitTablesEnrollment";
import CustomerSignUp from "@/MainComponent/(SubComponents)/EnrollmentComponent/CreateCustomer";
import UserList from "@/MainComponent/UserList"; // ✅ show all users

import "./dashboard.css";

export default function Dashboard() {
  const router = useRouter();
  const [activeContent, setActiveContent] = useState("Dashboard");

  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Login states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

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
    router.push("/"); // ✅ redirect to homepage
};

  const sidebarMenu = [
    {
      title: "Enrollment",
      children: [
        { name: "Add Property", key: "Add Property", icon: "bi-house" },
        { name: "Add Property Unit", key: "Add Property Unit", icon: "bi-columns" },
        { name: "Create Customer", key: "Create Customer", icon: "bi-person-plus" },
        { name: "All Enrollment", key: "All Enrollment", icon: "bi-people" }, // ✅ added
      ],
    },
  ];

  const renderContent = () => {
    switch (activeContent) {
      case "Add Property":
        return <PropertyForm />;
      case "Add Property Unit":
        return <PropertyUnitForm />;
      case "Create Customer":
        return <CustomerSignUp />;
      case "All Enrollment":
        return <UserList />;
      case "Dashboard":
      default:
        return (
          <div className="row">
            {/* Property Information */}
            <div className="col-lg-12 mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">Property Information</h5>
                  <PropertyTablesEnrollment />
                </div>
              </div>
            </div>

            {/* Property Unit Information */}
            <div className="col-lg-12 mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">Property Unit Information</h5>
                  <PropertyUnitTablesEnrollment />
                </div>
              </div>
            </div>

            {/* ✅ All Enrollment Report (Users) */}
            <div className="col-lg-12 mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">All Enrollment Report</h5>
                  <UserList />
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  if (checkingAuth) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div>⏳ Checking authentication...</div>
      </div>
    );
  }

  if (!user) {
    // ✅ Login form now styled like Super Admin
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="card p-4 shadow-sm" style={{ width: "350px" }}>
          <h4 className="text-center mb-3 fw-bold">Enrollment Officer Login</h4>
          {loginError && <div className="alert alert-danger">{loginError}</div>}
          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loggingIn}
            >
              {loggingIn ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout d-flex">
      {/* Sidebar */}
      <aside className="sidebar">
        <a href="/enrollmentOfficer" className="logo mb-4">
          <i className="bi bi-lightning-charge"></i>
          <span>Noretek Enrollment</span>
        </a>
        {sidebarMenu.map((section, idx) => (
          <div key={idx} className="menu-section">
            <div className="menu-title">{section.title}</div>
            {section.children.map((child, i) => (
              <div
                key={i}
                className={`menu-item ${
                  activeContent === child.key ? "active" : ""
                }`}
                onClick={() => setActiveContent(child.key)}
              >
                <i className={`bi ${child.icon}`}></i>
                {child.name}
              </div>
            ))}
          </div>
        ))}
      </aside>

      {/* Main content */}
      <main className="flex-grow-1">
        <nav className="topbar">
          <div className="left">
            <h4 className="mb-0">{activeContent}</h4>
          </div>
          <div className="right d-flex align-items-center gap-3">
            <span className="fw-semibold">{user.email}</span>
            <button
              onClick={handleLogout}
              className="btn btn-sm btn-outline-danger"
            >
              Logout
            </button>
          </div>
        </nav>
        <div className="content-area p-4">{renderContent()}</div>
      </main>
    </div>
  );
}
