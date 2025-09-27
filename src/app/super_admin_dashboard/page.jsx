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
  const router = useRouter();
  // State for Manage Admin
  const [customers, setCustomers] = useState([]);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPerPage] = useState(5);

  // State for Support Tickets
  const [tickets, setTickets] = useState([]);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketPerPage] = useState(5);

  // Hardcoded Super Admin Credentials
  const SUPER_ADMIN = {
    username: "super1",
    password: "password",
  };

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
                <div className="d-flex justify-content-between">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    disabled={customerPage === 1}
                    onClick={() => setCustomerPage((p) => p - 1)}
                  >
                    Prev
                  </button>
                  <span>
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
                       <td>new Date(prop.created_at).toLocaleDateString()
</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination */}
                <div className="d-flex justify-content-between">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    disabled={ticketPage === 1}
                    onClick={() => setTicketPage((p) => p - 1)}
                  >
                    Prev
                  </button>
                  <span>
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
          <div className="container">
            {/* Totals */}
            <div className="row g-4 mb-4">
              <div className="col-md-3">
                <div className="card shadow-sm text-center">
                  <div className="card-body">
                    <h6 className="text-muted">Customers</h6>
                    <h3>{dashboardData?.totals.totalCustomers || 0}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card shadow-sm text-center">
                  <div className="card-body">
                    <h6 className="text-muted">Properties</h6>
                    <h3>{dashboardData?.totals.totalProperties || 0}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card shadow-sm text-center">
                  <div className="card-body">
                    <h6 className="text-muted">Units</h6>
                    <h3>{dashboardData?.totals.totalUnits || 0}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card shadow-sm text-center">
                  <div className="card-body">
                    <h6 className="text-muted">Payments</h6>
                    <h3>{dashboardData?.totals.totalPayments || 0}</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="row">
              <div className="col-md-6">
                <div className="card shadow-sm">
                  <div className="card-header bg-primary text-white">
                    Recent Payments
                  </div>
                  <div className="card-body table-responsive">
                    <table className="table table-sm">
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
                              <td>{p.reference}</td>
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
                            <td colSpan="4" className="text-center text-muted">
                              No recent payments
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card shadow-sm">
                  <div className="card-header bg-info text-white">
                    Recent Tickets
                  </div>
                  <div className="card-body table-responsive">
                    <table className="table table-sm">
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
                              <td>
                                  {t.created_at
                                    ? new Date(t.created_at).toLocaleDateString()
                                    : "N/A"}
                                </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" className="text-center text-muted">
                              No recent tickets
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="col-md-12 mt-4">
                <div className="card shadow-sm">
                  <div className="card-header bg-success text-white">
                    Recent Properties
                  </div>
                  <div className="card-body table-responsive">
                    <table className="table table-sm">
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
        <td>{prop.property_name}</td>
        <td>{prop.owner_name}</td>
        <td>{prop.property_location}</td>
        <td>{prop.property_address}</td>
        <td>
          {prop.created_at
            ? new Date(prop.created_at).toLocaleDateString()
            : "N/A"}
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="5" className="text-center text-muted">
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
        );
    }
  };

  // If not authenticated → Show login form
  if (!isAuthenticated) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="card p-4 shadow-sm" style={{ width: "350px" }}>
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
    <div className="customer-support d-flex flex-column min-vh-100">
      {/* Top Navbar */}
      <nav className="navbar navbar-light bg-white sticky-top px-3 shadow-sm">
        <div className="d-flex align-items-center text-decoration-none text-dark">
          <img
            src={logo.src}
            className="logo rounded-2 d-none d-md-block"
            alt="Noretek Energy Ltd"
            width={120}
          />
        </div>
        <div className="d-flex align-items-center gap-3">
          <span className="fw-semibold">Super Admin</span>
          <button
           
            className="btn btn-sm btn-outline-danger"
              onClick={() => {
              localStorage.clear();
              router.push("/");
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="d-flex flex-grow-1">
        {/* Sidebar */}
        <aside
          className="bg-white border-end p-3 d-none d-lg-block"
          style={{ width: "250px" }}
        >
          <div className="accordion border-0" id="sidebarMenu">
            <ul className="navbar-nav">
              <li className="nav-item mx-3">
                <button
                  onClick={() => setActiveContent("Dashboard")}
                  className="btn btn-link fw-bold shadow-sm nav-link text-decoration-none"
                >
                  Dashboard
                </button>
              </li>
            </ul>
            {sidebarMenu.map((section, idx) => (
              <div className="accordion-item border-0" key={idx}>
                <h2 className="accordion-header" id={`heading${idx}`}>
                  <button
                    className="accordion-button collapsed fw-semibold shadow-none border-0"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#collapse${idx}`}
                  >
                    {section.title}
                  </button>
                </h2>
                {section.children.length > 0 && (
                  <div
                    id={`collapse${idx}`}
                    className="accordion-collapse collapse"
                  >
                    <div className="accordion-body p-2">
                      <ul className="list-unstyled mb-0">
                        {section.children.map((child, i) => (
                          <li key={i} className="p-1">
                            <button
                              onClick={() => setActiveContent(child.key)}
                              className="btn btn-link text-decoration-none p-0"
                            >
                              {child.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-grow-1 p-4 bg-light">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="fw-bold mb-0">{activeContent}</h4>
            <span className="text-muted">
              {new Date().toLocaleDateString()}
            </span>
          </div>

          {renderContent()}
        </main>
      </div>
    </div>
  );
}
