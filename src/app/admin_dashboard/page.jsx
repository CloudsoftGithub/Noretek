"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserList from "@/MainComponent/UserList";
import PropertyTables from "@/MainComponent/(SubComponents)/AdminComponent/ViewProperty";
import PropertyUnitTables from "@/MainComponent/(SubComponents)/AdminComponent/ViewPropertyUinit";
import logo from "./logo.png";

export default function AdminDashboard() {
  const [activeContent, setActiveContent] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  // ✅ State for tickets
  const [tickets, setTickets] = useState([]);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketPerPage] = useState(5);

  const router = useRouter();

  // ✅ Auth + role check
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role === "Admin") {
          setUser(parsedUser);
        } else {
          router.push("/stafflogin");
        }
      } catch (e) {
        localStorage.clear();
        router.push("/stafflogin");
      }
    } else {
      router.push("/stafflogin");
    }
    setLoading(false);
  }, [router]);

  // ✅ Fetch dashboard data
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

  // ✅ Fetch tickets when active
  useEffect(() => {
    if (activeContent === "Support Tickets") {
      fetch("/api/tickets")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setTickets(data.tickets || []);
        })
        .catch((err) => console.error("Error fetching tickets:", err));
    }
  }, [activeContent]);

  if (loading) {
    return <p className="text-center mt-5">⏳ Checking authentication...</p>;
  }
  if (!user) {
    return null;
  }

  // Sidebar menu structure
  const sidebarMenu = [
    {
      title: "Reports",
      children: [{ name: "All Enrollment", key: "All Enrollment" }],
    },
    {
      title: "View Property",
      children: [
        { name: "Property", key: "Property" },
        { name: "Property Unit", key: "Property Unit" },
      ],
    },
    {
      title: "Support",
      children: [{ name: "Support Tickets", key: "Support Tickets" }],
    },
  ];

  // ✅ Pagination helper
  const paginate = (array, page, perPage) =>
    array.slice((page - 1) * perPage, page * perPage);

  // Dynamic content renderer
  const renderContent = () => {
    switch (activeContent) {
      case "All Enrollment":
        return (
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">All Enrollment Report</h5>
              <UserList />
            </div>
          </div>
        );
      case "Property":
        return (
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Property Information</h5>
              <PropertyTables />
            </div>
          </div>
        );
      case "Property Unit":
        return (
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Unit Information</h5>
              <PropertyUnitTables />
            </div>
          </div>
        );
      case "Support Tickets":
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
      default:
        return null;
    }
  };

  return (
    <div className="customer-support d-flex flex-column min-vh-100">
      {/* ✅ Navbar with email + logout aligned right */}
      <nav className="navbar navbar-light bg-white sticky-top px-3 shadow-sm">
        <a
          href="/"
          className="d-flex align-items-center text-decoration-none text-dark"
        >
          <img
            src={logo.src}
            className="logo rounded-2 d-none d-md-block"
            alt="Noretek Energy Ltd"
            width={120}
          />
        </a>
        <div className="ms-auto d-flex align-items-center gap-3">
          <span className="text-muted">{user.email}</span>
          <button
            className="btn btn-outline-danger btn-sm"
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
        {/* Sidebar (Desktop) */}
        <aside
          className="bg-white border-end p-3 d-none d-lg-block"
          style={{ width: "250px" }}
        >
          <div className="accordion" id="sidebarMenu">
            <ul className="navbar-nav">
              <li className="nav-item mx-3">
                <button
                  onClick={() => setActiveContent("Dashboard")}
                  className="btn btn-link fw-bold shadow-sm nav-link text-decoration-none"
                >
                  Admin Dashboard
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
                        {section.children.map((child) => (
                          <li key={child.key} className="p-1">
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

          {/* Dashboard Overview */}
          {activeContent === "Dashboard" && (
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
                              <td
                                colSpan="4"
                                className="text-center text-muted"
                              >
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
                              <td
                                colSpan="3"
                                className="text-center text-muted"
                              >
                                No recent tickets
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* ✅ Recent Properties */}
                <div className="col-md-12 mt-4">
                  <div className="card shadow-sm">
                    <div className="card-header bg-success text-white">
                      Recent Properties
                    </div>
                    <div className="card-body table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Location</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData?.recent.properties?.length > 0 ? (
                            dashboardData.recent.properties.map((prop) => (
                              <tr key={prop._id}>
                                <td>{prop.property_name}</td>
                                <td>{prop.property_location}</td>
                                <td>
                                  {prop.created_at
                                    ? new Date(
                                        prop.created_at
                                      ).toLocaleDateString()
                                    : "N/A"}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="3" className="text-center text-muted">
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
          )}

          {renderContent()}
        </main>
      </div>
    </div>
  );
}
