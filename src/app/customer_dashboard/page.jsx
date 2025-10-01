"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TicketForm from "@/MainComponent/TicketForm";

export default function UserDashboard() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [userData, setUserData] = useState({
    id: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    meterId: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    promotionalEmails: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [payments, setPayments] = useState([]);

  // Support states
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Session validation and client-side hydration fix
  useEffect(() => {
    setIsClient(true);
    
    // Check for valid user session
    const checkUserSession = () => {
      const storedEmail = localStorage.getItem("userEmail");
      const userRole = localStorage.getItem("userRole");
      
      console.log("Dashboard session check:", { email: storedEmail, role: userRole });
      
      // If no email or role is not Customer, redirect to login
      if (!storedEmail || userRole !== "Customer") {
        console.log("No valid customer session, redirecting to login");
        router.push("/customer-signin");
        return false;
      }
      
      setEmail(storedEmail);
      return true;
    };

    // Only proceed if session is valid
    if (checkUserSession()) {
      fetchUserData();
    }
  }, [router]);

  // Helper to get proper ticket date
  const getTicketDate = (ticket) => {
    const dateStr = ticket.created_at || ticket.createdAt;
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  // Fetch user profile data
  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      const storedEmail = localStorage.getItem("userEmail");
      if (!storedEmail) {
        router.push("/customer-signin");
        return;
      }

      const res = await fetch(`/api/user/profile?email=${storedEmail}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          const fullName = data.user.name || "";
          const [firstName, ...lastNameParts] = fullName.split(" ");
          const lastName = lastNameParts.join(" ");

          setUserData({
            id: data.user._id,
            firstName: firstName || "",
            lastName: lastName || "",
            phone: data.user.phone || "",
            address: data.user.address || "",
            meterId: data.user.meterId || "",
          });
        }
      } else if (res.status === 401) {
        // Session expired or invalid
        console.log("Session expired, redirecting to login");
        handleLogout();
        return;
      }

      refreshPayments(storedEmail);
      fetchTickets(storedEmail);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPayments = async (email) => {
    try {
      const response = await fetch(
        `/api/payments/history?email=${encodeURIComponent(email)}`
      );
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  // Fetch tickets
  const fetchTickets = async (email) => {
    try {
      const res = await fetch(`/api/tickets?email=${email}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setTickets(data.tickets);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    }
  };

  // Fetch comments for a ticket
  const fetchComments = async (ticketId) => {
    try {
      const res = await fetch(`/api/comments?ticket_id=${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setComments(data.comments);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleLogout = () => {
    console.log("Logging out, clearing session");
    localStorage.clear();
    sessionStorage.clear();
    router.push("/customer-signin");
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSaveStatus("saving");

    try {
      const fullName = `${userData.firstName} ${userData.lastName}`.trim();

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userData.id,
          updates: {
            name: fullName,
            phone: userData.phone,
            address: userData.address,
            meterId: userData.meterId,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus(""), 2000);
        } else {
          setSaveStatus("error");
        }
      } else if (res.status === 401) {
        handleLogout();
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setSaveStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSaveStatus("password_mismatch");
      setTimeout(() => setSaveStatus(""), 3000);
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSaveStatus("password_changed");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch {
      setSaveStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotificationSettings({ ...notificationSettings, [name]: checked });
  };

  const saveNotificationSettings = async () => {
    setIsLoading(true);
    setSaveStatus("saving");
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      localStorage.setItem(
        "notificationSettings",
        JSON.stringify(notificationSettings)
      );
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch {
      setSaveStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToPaymentDashboard = () => {
    router.push("/customer_payment_dashboard");
  };

  // Show loading state until client-side rendering and session validation complete
  if (!isClient || (isLoading && !email)) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border titleColor" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "#b7e1fda7", zIndex: 9999 }}
        >
          <div className="spinner-border titleColor" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark primaryColor">
        <div className="container-fluid d-flex align-items-center justify-content-between flex-wrap px-2">
          <button
            className="btn text-white me-3 d-lg-none"
            onClick={toggleSidebar}
          >
            <i className="bi bi-list"></i>
          </button>
          <a className="navbar-brand text-white me-auto" href="#">
            Dashboard
          </a>
          <ul className="navbar-nav d-flex flex-row ms-auto">
            <li className="nav-item mx-2">
              <span className="nav-link text-white text-truncate">
                <i className="bi bi-person me-2"></i>
                {email}
              </span>
            </li>
            <li className="nav-item mx-2">
              <button className="btn btn-outline-light" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-1"></i>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Layout */}
      <div className="d-flex">
        {/* Sidebar */}
        <div
          className={`sidebar primaryColor p-2 ${
            sidebarOpen ? "d-block" : "d-none"
          } d-lg-block`}
          style={{ minHeight: "100vh", width: "250px" }}
        >
          <ul className="nav flex-column">
            {["dashboard", "transactions", "buy", "support", "settings"].map(
              (section) => (
                <li key={section} className="nav-item mb-2">
                  <a
                    href="#"
                    className={`nav-link text-white ${
                      activeSection === section
                        ? "active bg-secondary rounded"
                        : ""
                    }`}
                    onClick={() => setActiveSection(section)}
                  >
                    <i
                      className={`bi me-2 ${
                        section === "dashboard"
                          ? "bi-speedometer2"
                          : section === "transactions"
                          ? "bi-cash"
                          : section === "buy"
                          ? "bi-credit-card"
                          : section === "support"
                          ? "bi-phone"
                          : "bi-gear"
                      }`}
                    ></i>
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                  </a>
                </li>
              )
            )}
          </ul>
        </div>

        {/* Main Content */}
        <div id="main" className="flex-grow-1 p-4 bg-light">
          {/* Dashboard Section */}
          {activeSection === "dashboard" && (
            <div className="container">
              <div className="row g-4">
                <div className="col-12 col-lg-6">
                  <div className="card shadow-sm h-100">
                    <div className="card-body d-flex align-items-center">
                      <i className="bi bi-lightning-charge fs-1 titleColor me-3"></i>
                      <div>
                        <h5 className="card-title mb-1 titleColor">
                          My Meter ID
                        </h5>
                        <p className="card-text text-muted">
                          {userData.meterId || "Not assigned"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-6">
                  <div className="card shadow-sm h-100">
                    <div className="card-body d-flex align-items-center">
                      <i className="bi bi-credit-card fs-1 titleColor me-3"></i>
                      <div>
                        <h5 className="card-title mb-1 titleColor">
                          Buy Token
                        </h5>
                        <button
                          className="btn primaryColor mt-2"
                          onClick={navigateToPaymentDashboard}
                        >
                          Go to Payment Dashboard
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-6">
                  <div className="card shadow-sm h-100">
                    <div className="card-body d-flex align-items-center">
                      <i className="bi bi-clock-history fs-1 titleColor me-3"></i>
                      <div>
                        <h5 className="card-title mb-1 titleColor">
                          Recent Transactions
                        </h5>
                        <p className="card-text text-muted">
                          {payments.length > 0
                            ? `${payments.length} transactions`
                            : "No transactions yet"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-6">
                  <div className="card shadow-sm h-100">
                    <div className="card-body d-flex align-items-center">
                      <i className="bi bi-gear fs-1 titleColor me-3"></i>
                      <div>
                        <h5 className="card-title mb-1 titleColor">Settings</h5>
                        <p className="card-text text-muted">
                          Manage your account settings.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Section */}
          {activeSection === "transactions" && (
            <div className="container">
              <h2 className="mb-4 titleColor">Transaction History</h2>
              <div className="card shadow-sm">
                <div className="card-body">
                  {payments.length === 0 ? (
                    <p className="text-center text-muted display-5">
                      No transactions yet.
                    </p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-striped">
                        <thead className="table-primary">
                          <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Reference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((payment) => (
                            <tr key={payment._id || payment.id}>
                              <td>
                                {new Date(
                                  payment.createdAt || payment.created_at
                                ).toLocaleDateString()}
                              </td>
                              <td>₦{payment.amount}</td>
                              <td>
                                <span
                                  className={`badge ${
                                    payment.status === "success"
                                      ? "bg-success"
                                      : payment.status === "pending"
                                      ? "bg-warning"
                                      : "bg-danger"
                                  }`}
                                >
                                  {payment.status}
                                </span>
                              </td>
                              <td className="small">{payment.reference}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Buy Section */}
          {activeSection === "buy" && (
            <div className="container">
              <h2 className="mb-4 titleColor">Buy Tokens</h2>
              <div className="alert alert-info">
                Navigate to the payment dashboard to purchase tokens securely.
              </div>
              <button
                className="btn primaryColor btn-lg"
                onClick={navigateToPaymentDashboard}
              >
                Go to Payment Dashboard
              </button>
            </div>
          )}

          {/* Support Section */}
          {activeSection === "support" && (
            <div className="container">
              <h2 className="mb-4 titleColor">My Support Tickets</h2>

              <div className="card shadow-sm mb-4">
                <div className="card-body">
                  <h5 className="titleColor mb-3">Create New Ticket</h5>
                  <TicketForm />
                </div>
              </div>

              <div className="card shadow-sm">
                <div className="card-body">
                  <h5 className="titleColor mb-3">Submitted Tickets</h5>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Ticket #</th>
                          <th>Title</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tickets.map((t) => (
                          <tr key={t._id}>
                            <td>#{t._id.slice(-6)}</td>
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
                            <td>{getTicketDate(t)}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => {
                                  setSelectedTicket(t);
                                  fetchComments(t._id);
                                }}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                        {tickets.length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center text-muted">
                              No tickets found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === "settings" && (
            <div className="container">
              <h2 className="mb-4 titleColor">Account Settings</h2>

              {saveStatus === "saved" && (
                <div className="alert alert-success">
                  ✅ Changes saved successfully.
                </div>
              )}
              {saveStatus === "error" && (
                <div className="alert alert-danger">
                  ❌ Something went wrong. Try again.
                </div>
              )}
              {saveStatus === "password_mismatch" && (
                <div className="alert alert-warning">
                  ⚠️ Passwords do not match.
                </div>
              )}
              {saveStatus === "password_changed" && (
                <div className="alert alert-success">
                  ✅ Password updated successfully.
                </div>
              )}

              <div className="row g-4">
                <div className="col-12 col-lg-6">
                  <div className="card shadow-sm h-100">
                    <div className="card-body">
                      <h5 className="titleColor mb-3">Profile Information</h5>
                      <form onSubmit={handleProfileUpdate}>
                        <div className="mb-2">
                          <label className="form-label">First Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={userData.firstName}
                            onChange={(e) =>
                              setUserData({
                                ...userData,
                                firstName: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="mb-2">
                          <label className="form-label">Last Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={userData.lastName}
                            onChange={(e) =>
                              setUserData({
                                ...userData,
                                lastName: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="mb-2">
                          <label className="form-label">Phone</label>
                          <input
                            type="text"
                            className="form-control"
                            value={userData.phone}
                            onChange={(e) =>
                              setUserData({
                                ...userData,
                                phone: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="mb-2">
                          <label className="form-label">Address</label>
                          <input
                            type="text"
                            className="form-control"
                            value={userData.address}
                            onChange={(e) =>
                              setUserData({
                                ...userData,
                                address: e.target.value,
                              })
                            }
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn primaryColor mt-2"
                          disabled={isLoading}
                        >
                          {isLoading ? "Saving..." : "Save Changes"}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="card shadow-sm h-100">
                    <div className="card-body">
                      <h5 className="titleColor mb-3">Change Password</h5>
                      <form onSubmit={handlePasswordChange}>
                        <div className="mb-2">
                          <label className="form-label">Current Password</label>
                          <input
                            type="password"
                            className="form-control"
                            value={passwordData.currentPassword}
                            onChange={(e) =>
                              setPasswordData({
                                ...passwordData,
                                currentPassword: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="mb-2">
                          <label className="form-label">New Password</label>
                          <input
                            type="password"
                            className="form-control"
                            value={passwordData.newPassword}
                            onChange={(e) =>
                              setPasswordData({
                                ...passwordData,
                                newPassword: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="mb-2">
                          <label className="form-label">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            className="form-control"
                            value={passwordData.confirmPassword}
                            onChange={(e) =>
                              setPasswordData({
                                ...passwordData,
                                confirmPassword: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn primaryColor mt-2"
                          disabled={isLoading}
                        >
                          {isLoading ? "Updating..." : "Update Password"}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <div className="card shadow-sm">
                    <div className="card-body">
                      <h5 className="titleColor mb-3">Notification Settings</h5>
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="emailNotifications"
                          name="emailNotifications"
                          checked={notificationSettings.emailNotifications}
                          onChange={handleNotificationChange}
                        />
                        <label
                          htmlFor="emailNotifications"
                          className="form-check-label"
                        >
                          Email Notifications
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="smsNotifications"
                          name="smsNotifications"
                          checked={notificationSettings.smsNotifications}
                          onChange={handleNotificationChange}
                        />
                        <label
                          htmlFor="smsNotifications"
                          className="form-check-label"
                        >
                          SMS Notifications
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="promotionalEmails"
                          name="promotionalEmails"
                          checked={notificationSettings.promotionalEmails}
                          onChange={handleNotificationChange}
                        />
                        <label
                          htmlFor="promotionalEmails"
                          className="form-check-label"
                        >
                          Promotional Emails
                        </label>
                      </div>
                      <button
                        className="btn primaryColor mt-3"
                        onClick={saveNotificationSettings}
                        disabled={isLoading}
                      >
                        {isLoading ? "Saving..." : "Save Preferences"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ticket Modal with Chat */}
          {selectedTicket && (
            <div
              className="modal show d-block"
              tabIndex="-1"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      Ticket #{selectedTicket._id.slice(-6)} -{" "}
                      {selectedTicket.title}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setSelectedTicket(null)}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div
                      className="chat-box"
                      style={{
                        maxHeight: "400px",
                        overflowY: "auto",
                        background: "#f8f9fa",
                        padding: "1rem",
                        borderRadius: "8px",
                      }}
                    >
                      {comments.map((c) => (
                        <div
                          key={c.comment_id}
                          className={`d-flex mb-3 ${
                            c.user_role === "customer"
                              ? "justify-content-end"
                              : "justify-content-start"
                          }`}
                        >
                          <div
                            className={`p-2 rounded ${
                              c.user_role === "customer"
                                ? "bg-primary text-white"
                                : "bg-light border"
                            }`}
                            style={{ maxWidth: "70%" }}
                          >
                            <div className="small fw-bold">{c.user_name}</div>
                            <div>{c.comment}</div>
                            <div className="small text-muted">
                              {new Date(c.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                      {comments.length === 0 && (
                        <p className="text-muted text-center">
                          No comments yet
                        </p>
                      )}
                    </div>

                    <div className="mt-3">
                      <textarea
                        className="form-control mb-2"
                        placeholder="Write a reply..."
                        rows="3"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      ></textarea>
                      <button
                        className="btn btn-primary"
                        disabled={!newComment.trim()}
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/comments", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                ticket_id: selectedTicket._id,
                                comment: newComment.trim(),
                                user_name: `${userData.firstName} ${userData.lastName}`,
                                user_role: "customer",
                              }),
                            });

                            const data = await res.json();
                            if (res.ok && data.success) {
                              setComments((prev) => [...prev, data.comment]);
                              setNewComment("");
                            } else {
                              alert(data.message || "Failed to send comment");
                            }
                          } catch (err) {
                            console.error("Error sending comment:", err);
                            alert("Network error");
                          }
                        }}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSelectedTicket(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}