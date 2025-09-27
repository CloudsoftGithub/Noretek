"use client";

import React, { useState, useEffect, useRef } from "react";

export default function CustomerTokenPage() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState("");
  
  // Login form state
  const [loginData, setLoginData] = useState({
    userId: "",
    password: "",
    company: "Noretek Energy"
  });
  
  // Customer accounts state
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [customerTokens, setCustomerTokens] = useState([]);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Token generation state
  const [rechargeData, setRechargeData] = useState({
    meterId: "",
    amount: "",
    authorizationPassword: "",
    serialNumber: "",
    company: "Noretek Energy",
    isVendByTotalPaid: true
  });
  const [generatedToken, setGeneratedToken] = useState(null);
  
  // Price state
  const [pricePerKg, setPricePerKg] = useState(1500);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Refs for printing
  const receiptRef = useRef();

  // Conversion factor: 510 kg = 1 cubic meter
  const KG_PER_CUBIC_METER = 510;

  // Helper function to calculate cubic meters from kg
  const calculateCubicMeters = (kg) => {
    if (!kg || kg === 0) return '0.000';
    return (kg / KG_PER_CUBIC_METER).toFixed(3);
  };

  // Initialize authentication from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    if (savedToken) {
      setAuthToken(savedToken);
      setIsAuthenticated(true);
      fetchCustomerAccounts(savedToken);
    }
    
    // Load price from localStorage
    const savedPrice = localStorage.getItem("pricePerKg");
    if (savedPrice) {
      setPricePerKg(parseFloat(savedPrice));
    }
  }, []);

  // Listen for price updates from SetPricePage
  useEffect(() => {
    const handlePriceUpdate = () => {
      const savedPrice = localStorage.getItem("pricePerKg");
      if (savedPrice) {
        setPricePerKg(parseFloat(savedPrice));
        setMessage("Price per KG updated to: ₦" + savedPrice);
      }
    };

    window.addEventListener('priceUpdated', handlePriceUpdate);
    
    return () => {
      window.removeEventListener('priceUpdated', handlePriceUpdate);
    };
  }, []);

  // Filter customers when searchTerm or customers change
  useEffect(() => {
    if (!searchTerm) {
      setFilteredCustomers(customers);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredCustomers(
        customers.filter((customer) =>
          (customer.customerName || customer.name || "")
            .toLowerCase()
            .includes(term) ||
          (customer.meterNo || customer.meterId || "")
            .toLowerCase()
            .includes(term) ||
          (customer.accountNo || "")
            .toLowerCase()
            .includes(term)
        )
      );
    }
  }, [searchTerm, customers]);

  // Handle search input
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle login form changes
  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  // Login function
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    
    try {
      const response = await fetch("http://47.107.69.132:9400/API/User/Login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result && data.result.token) {
          const token = data.result.token;
          localStorage.setItem("authToken", token);
          setAuthToken(token);
          setIsAuthenticated(true);
          fetchCustomerAccounts(token);
          setMessage("Login successful!");
        } else {
          throw new Error(data.message || "Authentication failed");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      setMessage("Login failed: " + error.message);
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch customer accounts
  const fetchCustomerAccounts = async (token) => {
    setLoading(true);
    try {
      const response = await fetch("http://47.107.69.132:9400/API/Account/Read", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageNumber: 1,
          pageSize: 50,
          company: "Noretek Energy"
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result && data.result.data) {
          setCustomers(data.result.data);
        } else {
          setMessage("No customer accounts found in response");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      setMessage("Error fetching customer accounts: " + error.message);
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tokens for a specific customer
  const fetchCustomerTokens = async (customerId, meterId, customer) => {
    setLoading(true);
    setSelectedCustomer(customer);
    
    try {
      const response = await fetch("http://47.107.69.132:9400/API/Token/CreditTokenRecord/Read", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meterId: meterId,
          company: "Noretek Energy",
          pageNumber: 1,
          pageSize: 20
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result && data.result.data) {
          setCustomerTokens(data.result.data);
          setShowTokenModal(true);
        } else {
          setMessage("No tokens found for this customer");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      setMessage("Error fetching customer tokens: " + error.message);
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle recharge form changes
  const handleRechargeChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRechargeData(prev => ({ 
      ...prev, 
      [name]: type === "checkbox" ? checked : value 
    }));
  };

  // Generate token for a customer
  const generateToken = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    
    try {
      // Get price from localStorage or use default
      const savedPrice = localStorage.getItem("pricePerKg");
      const currentPricePerKg = savedPrice ? parseFloat(savedPrice) : 1500;
      
      // Calculate units based on the price per KG
      const amount = parseFloat(rechargeData.amount);
      const totalUnit = amount / currentPricePerKg; // This will give decimal values like 1.5 for 2250
      const cubicMeters = calculateCubicMeters(totalUnit);

      const response = await fetch("http://47.107.69.132:9400/API/Token/CreditToken/Generate", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...rechargeData,
          amount,
          totalUnit,
          isPreview: false
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          // Overwrite totalUnit in result for display and add cubic meters
          setGeneratedToken({ 
            ...data.result, 
            totalUnit,
            cubicMeters
          });
          setMessage("Token generated successfully!");
          fetchCustomerAccounts(authToken);
        } else {
          throw new Error(data.message || "Token generation failed");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      setMessage("Error generating token: " + error.message);
      console.error("Token generation error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Open recharge modal for a customer
  const openRechargeModal = (customer) => {
    setRechargeData({
      meterId: customer.meterNo || customer.meterId || "",
      amount: "",
      authorizationPassword: "",
      serialNumber: "",
      company: "Noretek Energy",
      isVendByTotalPaid: true
    });
    setGeneratedToken(null);
    setMessage("");
    setSelectedCustomer(customer);
    setShowRechargeModal(true);
  };

  // Print receipt
  const printReceipt = () => {
    const printContent = receiptRef.current;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Token Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background-color: #fff; }
            .receipt { border: 1px solid #000; padding: 20px; max-width: 400px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .receipt-title { font-size: 18px; margin-bottom: 10px; }
            .divider { border-top: 1px dashed #000; margin: 15px 0; }
            .receipt-item { display: flex; justify-content: space-between; margin: 8px 0; }
            .token-display { font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; letter-spacing: 2px; text-align: center; background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px dashed #ccc; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; border-top: 1px solid #000; padding-top: 10px; }
            .conversion-info { background: #e9f4ff; padding: 10px; border-radius: 5px; margin: 10px 0; font-size: 11px; }
            @media print { body { margin: 0; } .receipt { border: none; padding: 15px; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setAuthToken("");
    setIsAuthenticated(false);
    setCustomers([]);
    setCustomerTokens([]);
    setMessage("You have been logged out");
    setSearchTerm("");
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Format token for display
  const formatToken = (token) => {
    if (!token) return 'N/A';
    return token.replace(/(.{4})/g, '$1 ').trim();
  };

  // Format units to show decimal places when needed
  const formatUnits = (units) => {
    if (!units && units !== 0) return 'N/A';
    // Check if units is a whole number
    return units % 1 === 0 ? units.toString() : units.toFixed(2);
  };

  // Calculate volume examples for display
  const getVolumeExamples = () => {
    const examples = [
      { amount: pricePerKg, kg: 1, volume: calculateCubicMeters(1) },
      { amount: pricePerKg * 2, kg: 2, volume: calculateCubicMeters(2) },
      { amount: pricePerKg * 5, kg: 5, volume: calculateCubicMeters(5) }
    ];
    return examples;
  };

  return (
    <>
    <div className="container-fluid " style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-dark primaryColor mb-4">
        <div className="container">
          <span className="navbar-brand fw-bold">
            <i className="fas fa-bolt me-2"></i>Noretek Energy Token Manager
          </span>
          {isAuthenticated && (
            <div className="d-flex align-items-center">
              <span className="text-light me-3">
                <i className="fas fa-money-bill-wave me-1"></i> Price: ₦{pricePerKg}/KG
              </span>
              <span className="text-light me-3">
                <i className="fas fa-cube me-1"></i> {KG_PER_CUBIC_METER} kg = 1 m³
              </span>
              <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt me-1"></i> Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="display-5 fw-bold text-dark">Customer Token Management</h1>
            <p className="lead">View and manage tokens for registered customer accounts</p>
            <div className="alert alert-info d-flex align-items-center">
              <i className="fas fa-info-circle me-2"></i>
              <div>
                <strong>Gas Volume Conversion:</strong> {KG_PER_CUBIC_METER} kg = 1 cubic meter
                <br />
                <small>Current pricing: ₦{pricePerKg} per KG ({calculateCubicMeters(pricePerKg / pricePerKg)} m³ for ₦{pricePerKg})</small>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form (shown when not authenticated) */}
        {!isAuthenticated && (
          <div className="row justify-content-center">
            <div className="col-md-6">
              <div className="card shadow">
                <div className="card-header primaryColor text-center">
                  <h4>Login to Access System</h4>
                </div>
                <div className="card-body">
                  <form onSubmit={handleLogin}>
                    <div className="mb-3">
                      <label className="form-label">User ID:</label>
                      <input
                        type="text"
                        className="form-control shadow-none"
                        name="userId"
                        value={loginData.userId}
                        onChange={handleLoginChange}
                        required
                        placeholder="Enter your user ID"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Password:</label>
                      <input
                        type="password"
                        className="form-control shadow-none"
                        name="password"
                        value={loginData.password}
                        onChange={handleLoginChange}
                        required
                        placeholder="Enter your password"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Company:</label>
                      <input
                        type="text"
                        className="form-control"
                        name="company"
                        value={loginData.company}
                        onChange={handleLoginChange}
                        required
                        readOnly
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn primaryColor w-100"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Logging in...
                        </>
                      ) : (
                        "Login"
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customer Accounts (shown when authenticated) */}
        {isAuthenticated && (
          <>
            {/* Stats Cards */}
            <div className="row mb-4">
              <div className="col-md-3 mb-3">
                <div className="card stats-card text-center">
                  <i className="fas fa-users fa-2x titleColor mb-2"></i>
                  <div className="stats-number">{filteredCustomers.length}</div>
                  <div className="stats-label">Registered Customers</div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="card stats-card text-center">
                  <i className="fas fa-bolt fa-2x text-success mb-2"></i>
                  <div className="stats-number">
                    {filteredCustomers.filter(customer => customer.balance > 0).length}
                  </div>
                  <div className="stats-label">Active Accounts</div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="card stats-card text-center">
                  <i className="fas fa-dollar-sign fa-2x text-warning mb-2"></i>
                  <div className="stats-number">
                    ${filteredCustomers.reduce((acc, customer) => acc + (customer.balance || 0), 0).toFixed(2)}
                  </div>
                  <div className="stats-label">Total Amount Consumed</div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="card stats-card text-center">
                  <i className="fas fa-cube fa-2x text-info mb-2"></i>
                  <div className="stats-number">{KG_PER_CUBIC_METER}:1</div>
                  <div className="stats-label">KG per Cubic Meter</div>
                </div>
              </div>
            </div>

            {/* Volume Examples Card */}
            <div className="card mb-4 shadow-sm">
              <div className="card-header bg-info text-white">
                <h6 className="mb-0">
                  <i className="fas fa-calculator me-2"></i>Gas Volume Examples
                </h6>
              </div>
              <div className="card-body">
                <div className="row">
                  {getVolumeExamples().map((example, index) => (
                    <div key={index} className="col-md-4 mb-2">
                      <div className="text-center p-2 bg-light rounded">
                        <div className="fw-bold">₦{example.amount.toLocaleString()}</div>
                        <div className="text-muted small">{example.kg} KG = {example.volume} m³</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`alert ${message.includes("success") ? "alert-success" : "alert-danger"} mb-4`}>
                {message}
              </div>
            )}

            {/* Search Bar */}
            <div className="row mb-3">
              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, meter number, or account number..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  disabled={loading}
                />
              </div>
              <div className="col-md-6 text-end">
                <a href="/set_price" className="btn btn-outline-primary">
                  <i className="fas fa-cog me-1"></i> Configure Price
                </a>
              </div>
            </div>

            {/* Customer Accounts Table */}
            <div className="card shadow">
              <div className="card-header primaryColor d-flex justify-content-between align-items-center">
                <h5 className="mb-0"><i className="fas fa-list-alt me-2"></i>Registered Customer Accounts</h5>
                <button 
                  className="btn btn-outline-light btn-sm" 
                  onClick={() => fetchCustomerAccounts(authToken)}
                  disabled={loading}
                >
                  <i className="fas fa-sync-alt me-1"></i> Refresh
                </button>
              </div>
              <div className="card-body">
                {loading && !showTokenModal && !showRechargeModal ? (
                  <div className="text-center my-5">
                    <div className="spinner-border titleColor" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading customer accounts...</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th className="titleColor">Customer Name</th>
                          <th className="titleColor">Meter Number</th>
                          <th className="titleColor">Account Number</th>
                          <th className="titleColor">Balance</th>
                          <th className="titleColor">Status</th>
                          <th className="titleColor">Last Update</th>
                          <th className="titleColor">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer, index) => (
                            <tr key={`customer-${customer.id || customer.accountNo || index}`}>
                              <td className="fw-bold">{customer.customerName || customer.name || 'N/A'}</td>
                              <td>{customer.meterNo || customer.meterId || 'N/A'}</td>
                              <td>{customer.accountNo || 'N/A'}</td>
                              <td>${customer.balance?.toFixed(2) || '0.00'}</td>
                              <td>
                                <span className={`badge ${(customer.balance > 0) ? 'bg-success' : 'bg-warning'}`}>
                                  {(customer.balance > 0) ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td>{formatDate(customer.updateTime || customer.lastUpdate)}</td>
                              <td>
                                <div className="btn-group">
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => fetchCustomerTokens(customer.id, customer.meterNo || customer.meterId, customer)}
                                    title="View Tokens"
                                    disabled={loading}
                                  >
                                    <i className="fas fa-key me-1"></i> Tokens
                                  </button>
                                  <button
                                    className="btn btn-success btn-sm"
                                    onClick={() => openRechargeModal(customer)}
                                    title="Recharge"
                                    disabled={loading}
                                  >
                                    <i className="fas fa-bolt me-1"></i> Recharge
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="text-center py-4">
                              No customer accounts found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Token Modal */}
        {showTokenModal && (
          <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-xl">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">
                    <i className="fas fa-key me-2"></i>
                    Token History for {selectedCustomer?.customerName || selectedCustomer?.name || 'Customer'}
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={() => setShowTokenModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  {loading ? (
                    <div className="text-center my-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2">Loading tokens...</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Token Value</th>
                            <th>Amount</th>
                            <th>Units (KG)</th>
                            <th>Volume (m³)</th>
                            <th>Generated On</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerTokens.length > 0 ? (
                            customerTokens.map((token, index) => {
                              const units = token.totalUnit || 0;
                              const cubicMeters = calculateCubicMeters(units);
                              return (
                                <tr key={`token-${token.id || index}`}>
                                  <td className="font-monospace">{formatToken(token.token)}</td>
                                  <td>₦{token.totalPaid?.toFixed(2) || '0.00'}</td>
                                  <td>{formatUnits(units)} KG</td>
                                  <td>{cubicMeters} m³</td>
                                  <td>{formatDate(token.createDate)}</td>
                                  <td>
                                    <span className="badge bg-success">
                                      {token.status || 'Completed'}
                                    </span>
                                  </td>
                                  <td>
                                    <button 
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={() => {
                                        setGeneratedToken({
                                          ...token,
                                          cubicMeters: cubicMeters
                                        });
                                        setTimeout(printReceipt, 100);
                                      }}
                                    >
                                      <i className="fas fa-print me-1"></i> Print
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="7" className="text-center py-4">
                                No tokens found for this customer.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowTokenModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recharge Modal */}
        {showRechargeModal && (
          <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header bg-success text-white">
                  <h5 className="modal-title">
                    <i className="fas fa-bolt me-2"></i>
                    Recharge Meter: {rechargeData.meterId}
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={() => setShowRechargeModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={generateToken}>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Amount (NGN)</label>
                        <input
                          type="number"
                          className="form-control"
                          name="amount"
                          value={rechargeData.amount}
                          onChange={handleRechargeChange}
                          required
                          step="0.01"
                          min="0"
                          placeholder={`Enter amount (₦${pricePerKg} = 1KG)`}
                        />
                        <small className="text-muted">
                          You will get 1KG for every ₦{pricePerKg} paid (e.g., ₦{(pricePerKg * 1.5).toFixed(2)} = 1.5KG).
                        </small>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Estimated Volume</label>
                        <div className="form-control bg-light">
                          {rechargeData.amount ? 
                            `${formatUnits(rechargeData.amount / pricePerKg)} KG = ${calculateCubicMeters(rechargeData.amount / pricePerKg)} m³`
                            : '0 KG = 0.000 m³'
                          }
                        </div>
                        <small className="text-muted">
                          Conversion: {KG_PER_CUBIC_METER} kg = 1 cubic meter
                        </small>
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Authorization Password</label>
                        <input
                          type="password"
                          className="form-control"
                          name="authorizationPassword"
                          value={rechargeData.authorizationPassword}
                          onChange={handleRechargeChange}
                          placeholder="Optional authorization password"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Serial Number</label>
                        <input
                          type="text"
                          className="form-control"
                          name="serialNumber"
                          value={rechargeData.serialNumber}
                          onChange={handleRechargeChange}
                          placeholder="Optional serial number"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-3 form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        name="isVendByTotalPaid"
                        checked={rechargeData.isVendByTotalPaid}
                        onChange={handleRechargeChange}
                        id="isVendByTotalPaid"
                      />
                      <label className="form-check-label" htmlFor="isVendByTotalPaid">
                        Vend by Total Paid
                      </label>
                    </div>
                    
                    <button 
                      type="submit"
                      className="btn btn-success w-100 py-2"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Generating Token...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-bolt me-2"></i>Generate Token
                        </>
                      )}
                    </button>
                  </form>

                  {generatedToken && (
                    <div className="mt-4 p-3 bg-light rounded">
                      <h6 className="text-center mb-3">
                        <i className="fas fa-check-circle text-success me-2"></i>
                        Token Generated Successfully!
                      </h6>
                      <div className="token-display font-monospace text-center p-3 mb-3">
                        {formatToken(generatedToken.token)}
                      </div>
                      <div className="row mb-3">
                        <div className="col-md-4">
                          <div className="text-center">
                            <strong>Amount Paid</strong><br/>
                            <span className="h5 text-success">₦{generatedToken.totalPaid?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="text-center">
                            <strong>Units (KG)</strong><br/>
                            <span className="h5 text-primary">{formatUnits(generatedToken.totalUnit)} KG</span>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="text-center">
                            <strong>Volume (m³)</strong><br/>
                            <span className="h5 text-info">{generatedToken.cubicMeters || calculateCubicMeters(generatedToken.totalUnit)} m³</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="alert alert-info mb-3">
                        <h6 className="mb-2">Gas Volume Information:</h6>
                        <p className="mb-2 small">
                          <strong>Conversion:</strong> {KG_PER_CUBIC_METER} kg = 1 cubic meter<br/>
                          <strong>Your purchase:</strong> {formatUnits(generatedToken.totalUnit)} kg = {generatedToken.cubicMeters || calculateCubicMeters(generatedToken.totalUnit)} cubic meters
                        </p>
                        <h6 className="mb-2">How to use your token:</h6>
                        <ol className="mb-0 small">
                          <li>Press the 'Enter' button on your meter</li>
                          <li>Enter the 20-digit token when prompted</li>
                          <li>Press 'Enter' again to confirm</li>
                          <li>Wait for the meter to validate and load the units</li>
                        </ol>
                      </div>
                      
                      <div className="text-center">
                        <button className="btn btn-primary me-2" onClick={printReceipt}>
                          <i className="fas fa-print me-1"></i> Print Receipt
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => setShowRechargeModal(false)}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Template (Hidden) */}
        <div ref={receiptRef} style={{ display: 'none' }}>
          <div className="receipt">
            <div className="header">
              <div className="company-name">Noretek Energy</div>
              <div className="receipt-title">GAS TOKEN RECEIPT</div>
              <div>Price: ₦{pricePerKg} per KG</div>
            </div>
            
            <div className="receipt-item">
              <span>Customer Name:</span>
              <span>{selectedCustomer?.customerName || selectedCustomer?.name || 'N/A'}</span>
            </div>
            
            <div className="receipt-item">
              <span>Meter Number:</span>
              <span>{selectedCustomer?.meterNo || selectedCustomer?.meterId || 'N/A'}</span>
            </div>
            
            <div className="receipt-item">
              <span>Account Number:</span>
              <span>{selectedCustomer?.accountNo || 'N/A'}</span>
            </div>
            
            <div className="divider"></div>
            
            {generatedToken && (
              <>
                <div className="token-display">
                  {formatToken(generatedToken.token)}
                </div>
                
                <div className="receipt-item">
                  <span>Amount Paid:</span>
                  <span>₦{generatedToken.totalPaid?.toFixed(2) || '0.00'}</span>
                </div>
                
                <div className="receipt-item">
                  <span>Units (KG):</span>
                  <span>{formatUnits(generatedToken.totalUnit)} KG</span>
                </div>
                
                <div className="receipt-item">
                  <span>Volume (m³):</span>
                  <span>{generatedToken.cubicMeters || calculateCubicMeters(generatedToken.totalUnit)} m³</span>
                </div>
                
                <div className="receipt-item">
                  <span>Price per KG:</span>
                  <span>₦{pricePerKg}</span>
                </div>
                
                {generatedToken.tax && (
                  <div className="receipt-item">
                    <span>Tax:</span>
                    <span>₦{generatedToken.tax?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                
                <div className="divider"></div>
                
                <div className="conversion-info">
                  <strong>Gas Volume Conversion:</strong><br/>
                  {KG_PER_CUBIC_METER} kg = 1 cubic meter<br/>
                  Your purchase: {formatUnits(generatedToken.totalUnit)} kg = {generatedToken.cubicMeters || calculateCubicMeters(generatedToken.totalUnit)} m³
                </div>
                
                <div className="divider"></div>
              </>
            )}
            
            <div className="receipt-item">
              <span>Date:</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            
            <div className="receipt-item">
              <span>Time:</span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
            
            <div className="footer">
              <div>Thank you for your purchase!</div>
              <div>For assistance, contact support@noretekenergy.com</div>
              <div style={{ fontSize: '10px', marginTop: '5px' }}>
                Conversion: {KG_PER_CUBIC_METER} kg = 1 cubic meter
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-dark text-white py-4 mt-5">
          <div className="container">
            <div className="row">
              <div className="col-md-6">
                <h5>Noretek Energy</h5>
                <p>Token Management System</p>
                <small>Gas Volume: {KG_PER_CUBIC_METER} kg = 1 cubic meter</small>
              </div>
              <div className="col-md-6 text-md-end">
                <p>Contact: support@noretekenergy.com</p>
                <p>Current Price: ₦{pricePerKg} per KG</p>
              </div>
            </div>
            <hr />
            <div className="text-center">
              <p className="mb-0">© 2025 Noretek Energy. All rights reserved.</p>
            </div>
          </div>
        </footer>
       
      </div>

      {/* Add Font Awesome for icons */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      <style jsx>{`
        .primaryColor {
          background-color: #0d6efd;
          color: white;
        }
        .stats-card {
          text-align: center;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
        }
        .stats-card:hover {
          transform: translateY(-5px);
        }
        .stats-number {
          font-size: 2rem;
          font-weight: 700;
          margin: 10px 0;
        }
        .stats-label {
          font-size: 0.9rem;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .table th {
          background-color: #f8f9fa;
          border-top: none;
          font-weight: 600;
        }
        .badge {
          font-size: 0.8rem;
          padding: 0.4em 0.6em;
        }
        .font-monospace {
          font-family: 'Courier New', monospace;
          letter-spacing: 1px;
        }
        .token-display {
          font-family: 'Courier New', monospace;
          font-size: 1.2rem;
          font-weight: bold;
          background: linear-gradient(120deg, #f6d365, #fda085);
          color: #fff;
          padding: 15px;
          border-radius: 5px;
          text-align: center;
          margin: 10px 0;
          letter-spacing: 2px;
        }
        .conversion-info {
          background: #e9f4ff;
          padding: 10px;
          border-radius: 5px;
          margin: 10px 0;
          font-size: 11px;
        }
      `}</style>
    </div>
    
    </>
  );
}