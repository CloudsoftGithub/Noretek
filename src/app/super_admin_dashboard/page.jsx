"use client";
import AdminForm from "@/MainComponent/(SubComponents)/AdminComponent/AdminForm";
import AdminTables from "@/MainComponent/(SubComponents)/AdminComponent/AdminTable";
import { useState, useEffect } from "react";
import logo from "./logo.png";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [activeContent, setActiveContent] = useState("Dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  // State for Manage Admin
  const [customers, setCustomers] = useState([]);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPerPage] = useState(10);

  // State for Support Tickets
  const [tickets, setTickets] = useState([]);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketPerPage] = useState(10);

  // Hardcoded Super Admin Credentials
  const SUPER_ADMIN = {
    username: "super1",
    password: "password",
  };

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 992);
      if (window.innerWidth >= 992) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === SUPER_ADMIN.username && password === SUPER_ADMIN.password) {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Invalid username or password");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    localStorage.clear();
    router.push("/");
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleMenuClick = (key) => {
    setActiveContent(key);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const sidebarMenu = [
    {
      title: "Assignment",
      children: [
        { name: "Add Staff", key: "Add Staff" },
        { name: "Filter by Role", key: "Filter by Role" },
      ],
    },
    {
      title: "Management",
      children: [
        { name: "All Users", key: "Manage Admin" },
        { name: "View Customer Support", key: "Customer Support Unit" },
      ],
    },
  ];

  // Fetch Dashboard Data
  useEffect(() => {
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
  }, []);

  // Fetch Customers
  useEffect(() => {
    if (activeContent === "Manage Admin") {
      fetch("/api/customer-signup-api")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setCustomers(data.customers || []);
        })
        .catch((err) => console.error("Error fetching customers:", err));
    }
  }, [activeContent]);

  // Fetch Tickets
  useEffect(() => {
    if (activeContent === "Customer Support Unit") {
      fetch("/api/tickets")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setTickets(data.tickets || []);
        })
        .catch((err) => console.error("Error fetching tickets:", err));
    }
  }, [activeContent]);

  // Pagination Helpers
  const paginate = (array, page, perPage) =>
    array.slice((page - 1) * perPage, page * perPage);

  const renderContent = () => {
    switch (activeContent) {
      case "Add Staff":
        return (
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title titleColor">Admin Form Report</h5>
              <AdminForm />
            </div>
          </div>
        );
      case "Filter by Role":
        return (
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title titleColor">Filter By Role</h5>
              <AdminTables />
            </div>
          </div>
        );
      case "Manage Admin":
        return (
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">All Customers</h5>
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>Property</th>
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(customers, customerPage, customerPerPage).map(
                      (c) => (
                        <tr key={c._id}>
                          <td>{c.name}</td>
                          <td>{c.email}</td>
                          <td>{c.phone}</td>
                          <td>{c.address}</td>
                          <td>{c.propertyName?.property_name || "N/A"}</td>
                          <td>
                            {c.propertyUnit
                              ? `${c.propertyUnit.unit_description} - Block ${c.propertyUnit.blockno}`
                              : "N/A"}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
                {/* Pagination */}
                <div className="d-flex justify-content-between align-items-center">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    disabled={customerPage === 1}
                    onClick={() => setCustomerPage((p) => p - 1)}
                  >
                    Prev
                  </button>
                  <span className="text-muted">
                    Page {customerPage} of{" "}
                    {Math.ceil(customers.length / customerPerPage)}
                  </span>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    disabled={
                      customerPage >=
                      Math.ceil(customers.length / customerPerPage)
                    }
                    onClick={() => setCustomerPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case "Customer Support Unit":
        return (
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">All Support Tickets</h5>
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Category</th>
                      <th>Created By</th>
                      <th>Meter ID</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(tickets, ticketPage, ticketPerPage).map((t) => (
                      <tr key={t._id}>
                        <td>{t.title}</td>
                        <td>
                          <span
                            className={`badge ${
                              t.status === "Open"
                                ? "bg-warning"
                                : t.status === "Resolved"
                                ? "bg-success"
                                : "bg-secondary"
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td>{t.priority}</td>
                        <td>{t.category}</td>
                        <td>{t.created_by}</td>
                        <td>{t.meter_id}</td>
                        <td>
                          {t.created_at
                            ? new Date(t.created_at).toLocaleDateString()
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination */}
                <div className="d-flex justify-content-between align-items-center">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    disabled={ticketPage === 1}
                    onClick={() => setTicketPage((p) => p - 1)}
                  >
                    Prev
                  </button>
                  <span className="text-muted">
                    Page {ticketPage} of{" "}
                    {Math.ceil(tickets.length / ticketPerPage)}
                  </span>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    disabled={
                      ticketPage >= Math.ceil(tickets.length / ticketPerPage)
                    }
                    onClick={() => setTicketPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case "Dashboard":
      default:
        return (
          <div className="container-fluid">
            {/* Totals */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <div className="card shadow-sm text-center h-100">
                  <div className="card-body p-3">
                    <h6 className="text-muted mb-2">Customers</h6>
                    <h3 className="mb-0">{dashboardData?.totals.totalCustomers || 0}</h3>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card shadow-sm text-center h-100">
                  <div className="card-body p-3">
                    <h6 className="text-muted mb-2">Properties</h6>
                    <h3 className="mb-0">{dashboardData?.totals.totalProperties || 0}</h3>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card shadow-sm text-center h-100">
                  <div className="card-body p-3">
                    <h6 className="text-muted mb-2">Units</h6>
                    <h3 className="mb-0">{dashboardData?.totals.totalUnits || 0}</h3>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card shadow-sm text-center h-100">
                  <div className="card-body p-3">
                    <h6 className="text-muted mb-2">Payments</h6>
                    <h3 className="mb-0">{dashboardData?.totals.totalPayments || 0}</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="row g-3">
              <div className="col-12 col-lg-6">
                <div className="card shadow-sm h-100">
                  <div className="card-header bg-primary text-white">
                    Recent Payments
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead>
                          <tr>
                            <th>Reference</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData?.recent.payments?.length > 0 ? (
                            dashboardData.recent.payments.map((p) => (
                              <tr key={p._id}>
                                <td className="text-truncate" style={{maxWidth: '100px'}}>{p.reference}</td>
                                <td>₦{p.amount}</td>
                                <td>
                                  <span
                                    className={`badge ${
                                      p.status === "success"
                                        ? "bg-success"
                                        : p.status === "pending"
                                        ? "bg-warning"
                                        : "bg-danger"
                                    }`}
                                  >
                                    {p.status}
                                  </span>
                                </td>
                                <td>
                                  {p.created_at
                                    ? new Date(p.created_at).toLocaleDateString()
                                    : "N/A"}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="text-center text-muted py-3">
                                No recent payments
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div className="card shadow-sm h-100">
                  <div className="card-header bg-info text-white">
                    Recent Tickets
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData?.recent.tickets?.length > 0 ? (
                            dashboardData.recent.tickets.map((t) => (
                              <tr key={t._id}>
                                <td className="text-truncate" style={{maxWidth: '150px'}}>{t.title}</td>
                                <td>
                                  <span
                                    className={`badge ${
                                      t.status === "Open"
                                        ? "bg-warning"
                                        : t.status === "Resolved"
                                        ? "bg-success"
                                        : "bg-secondary"
                                    }`}
                                  >
                                    {t.status}
                                  </span>
                                </td>
                                <td>
                                  {t.created_at
                                    ? new Date(t.created_at).toLocaleDateString()
                                    : "N/A"}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="3" className="text-center text-muted py-3">
                                No recent tickets
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 mt-3">
                <div className="card shadow-sm">
                  <div className="card-header bg-success text-white">
                    Recent Properties
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead>
                          <tr>
                            <th>Property Name</th>
                            <th>Owner</th>
                            <th>Location</th>
                            <th>Address</th>
                            <th>Date Captured</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData?.recent.properties?.length > 0 ? (
                            dashboardData.recent.properties.map((prop) => (
                              <tr key={prop._id}>
                                <td className="text-truncate" style={{maxWidth: '120px'}}>{prop.property_name}</td>
                                <td className="text-truncate" style={{maxWidth: '120px'}}>{prop.owner_name}</td>
                                <td className="text-truncate" style={{maxWidth: '120px'}}>{prop.property_location}</td>
                                <td className="text-truncate" style={{maxWidth: '150px'}}>{prop.property_address}</td>
                                <td>
                                  {prop.created_at
                                    ? new Date(prop.created_at).toLocaleDateString()
                                    : "N/A"}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="text-center text-muted py-3">
                                No recent properties
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  // If not authenticated → Show login form
  if (!isAuthenticated) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="card p-4 shadow-sm login-card">
          <h4 className="text-center mb-3 fw-bold">Super Admin Login</h4>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
            <button type="submit" className="btn btn-primary w-100">
              Login
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

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="d-flex align-items-center text-decoration-none text-dark">
            <img
              src={logo.src}
              className="logo rounded-2"
              alt="Noretek Energy Ltd"
              width={120}
            />
          </div>
          <button 
            className="sidebar-close d-lg-none"
            onClick={() => setSidebarOpen(false)}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        
        <div className="sidebar-content">
          <div className="menu-section">
            <div 
              className={`menu-item ${activeContent === "Dashboard" ? "active" : ""}`}
              onClick={() => handleMenuClick("Dashboard")}
            >
              <i className="bi bi-speedometer2"></i>
              <span>Dashboard</span>
            </div>
          </div>

          {sidebarMenu.map((section, idx) => (
            <div key={idx} className="menu-section">
              <div className="menu-title">{section.title}</div>
              {section.children.map((child, i) => (
                <div
                  key={i}
                  className={`menu-item ${
                    activeContent === child.key ? "active" : ""
                  }`}
                  onClick={() => handleMenuClick(child.key)}
                >
                  <i className={`bi ${
                    child.key === "Add Staff" ? "bi-person-plus" :
                    child.key === "Filter by Role" ? "bi-funnel" :
                    child.key === "Manage Admin" ? "bi-people" :
                    "bi-headset"
                  }`}></i>
                  <span>{child.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-footer d-lg-none">
          <div className="user-info">
            <span className="fw-semibold">Super Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-sm btn-outline-danger w-100 mt-2"
          >
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
            >
              <i className="bi bi-list"></i>
            </button>
            <h4 className="mb-0">{activeContent}</h4>
          </div>
          <div className="right d-flex align-items-center gap-3">
            <span className="fw-semibold d-none d-lg-inline">Super Admin</span>
            <span className="text-muted d-none d-md-inline">
              {new Date().toLocaleDateString()}
            </span>
            <button
              onClick={handleLogout}
              className="btn btn-sm btn-outline-danger d-none d-lg-block"
            >
              Logout
            </button>
          </div>
        </nav>
        
        <div className="content-area p-3 p-lg-4 bg-light">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}