"use client";
import PaymentForm from "@/MainComponent/PaymentForm";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function CustomerPaymentDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [viewingToken, setViewingToken] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [meterInfo, setMeterInfo] = useState(null);
  const [meterId, setMeterId] = useState(null);
  const [pricePerKg, setPricePerKg] = useState(1500);
  const [hasProcessedPayment, setHasProcessedPayment] = useState(false);

  // Conversion factor: 510 kg = 1 cubic meter
  const KG_PER_CUBIC_METER = 510;

  // Helper function to calculate cubic meters from kg
  const calculateCubicMeters = (kg) => {
    return (kg / KG_PER_CUBIC_METER).toFixed(3);
  };

  useEffect(() => {
    // Load price from localStorage
    const savedPrice = localStorage.getItem("pricePerKg");
    if (savedPrice) {
      setPricePerKg(parseFloat(savedPrice));
    }

    // Listen for price updates
    const handlePriceUpdate = () => {
      const updatedPrice = localStorage.getItem("pricePerKg");
      if (updatedPrice) {
        setPricePerKg(parseFloat(updatedPrice));
      }
    };

    window.addEventListener('priceUpdated', handlePriceUpdate);
    return () => {
      window.removeEventListener('priceUpdated', handlePriceUpdate);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (typeof window === "undefined") {
          setLoading(false);
          return;
        }

        const urlEmail = searchParams?.get("email");
        const storedEmail = localStorage.getItem("userEmail");
        const storedId = localStorage.getItem("userId");
        const userEmail = urlEmail || storedEmail;

        if (!userEmail) {
          window.location.href = "/customer-signin";
          return;
        }

        setUser({ email: userEmail, id: storedId });

        // Fetch user profile
        const profileRes = await fetch(
          `/api/user/profile?email=${encodeURIComponent(userEmail)}`
        );
        const profileData = await profileRes.json();
        if (profileData.success && profileData.user) {
          if (!storedId) {
            localStorage.setItem("userId", profileData.user.id);
            setUser({ email: profileData.user.email, id: profileData.user.id });
          }
          if (profileData.user.meterId) {
            setMeterId(profileData.user.meterId);
            setMeterInfo({
              customerName: profileData.user.name,
              meterNumber: profileData.user.meterId,
              status: "active",
            });
          }
        }

        // Refresh payments list
        await refreshPayments(userEmail);

        const reference = searchParams?.get("reference") || searchParams?.get("trxref");
        const paymentSuccess = searchParams?.get("payment_success");

        // Check if we've already processed this payment during this session
        const processedPayments = JSON.parse(localStorage.getItem('processedPayments') || '{}');
        
        if (reference && !paymentSuccess && !processedPayments[reference] && !hasProcessedPayment) {
          // Only verify if this is a new payment that hasn't been processed
          await verifyPayment(reference, userEmail);
          setHasProcessedPayment(true);
        } else if (paymentSuccess === "true") {
          // Handle success page redirect - use existing token without regeneration
          const savedToken = localStorage.getItem(`token_${reference}`);
          if (savedToken) {
            const tokenInfo = JSON.parse(savedToken);
            setGeneratedToken(tokenInfo);
            setShowSuccessModal(true);
          } else {
            // Fallback to last token if specific reference token not found
            const token = localStorage.getItem("lastToken");
            if (token) {
              const tokenInfo = {
                token,
                meterNumber: localStorage.getItem("lastMeter"),
                units: localStorage.getItem("lastUnits") || "0",
                reference: reference || searchParams?.get("ref") || "",
                amount: localStorage.getItem("lastNairaAmount") || localStorage.getItem("lastAmount") || "0",
              };
              setGeneratedToken(tokenInfo);
              setShowSuccessModal(true);
            }
          }
        }
      } catch (error) {
        setError("Network error. Please try again.");
        console.error("Initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    const verifyPayment = async (reference, userEmail) => {
      setVerifyingPayment(true);
      try {
        // Check if token already exists locally
        const existingToken = localStorage.getItem(`token_${reference}`);
        const isInitialVerification = !existingToken;
        
        // Use skipToken=true if token already exists to prevent regeneration
        const skipToken = !isInitialVerification;
        
        console.log(`Verifying payment: ${reference}, initial: ${isInitialVerification}, skipToken: ${skipToken}`);
        
        const response = await fetch(`/api/payments/verify?reference=${reference}&initial=${isInitialVerification}&skipToken=${skipToken}`);
        const data = await response.json();

        if (data.status && data.data.status === "success") {
          const meterNumber = data.data.metadata?.meterNumber || localStorage.getItem("meterNumber");
          const nairaAmount = data.data.metadata?.nairaAmount || (data.data.amount / 100);

          if (!meterNumber) {
            throw new Error("Meter number not found for token generation");
          }

          // Use token from API response or existing local token
          let finalToken = data.data.token;
          if (!finalToken && existingToken) {
            const existingTokenInfo = JSON.parse(existingToken);
            finalToken = existingTokenInfo.token;
          }

          if (finalToken) {
            const units = data.data.tokenInfo?.units || data.data.metadata?.units || (nairaAmount / pricePerKg).toFixed(2);
            const cubicMeters = calculateCubicMeters(parseFloat(units));

            const tokenInfo = {
              reference,
              token: finalToken,
              meterNumber,
              units: units,
              cubicMeters: cubicMeters,
              amount: nairaAmount,
              customerEmail: userEmail,
              customerName: data.data.customer_name || data.data.customer?.email || userEmail,
              timestamp: new Date().toISOString(),
            };

            setGeneratedToken(tokenInfo);

            // Store tokens locally
            localStorage.setItem("lastToken", finalToken);
            localStorage.setItem("lastMeter", meterNumber);
            localStorage.setItem("lastUnits", tokenInfo.units);
            localStorage.setItem("lastCubicMeters", tokenInfo.cubicMeters);
            localStorage.setItem("lastNairaAmount", nairaAmount.toString());
            localStorage.setItem(`token_${reference}`, JSON.stringify(tokenInfo));

            // Mark this payment as processed to prevent re-verification
            const processedPayments = JSON.parse(localStorage.getItem('processedPayments') || '{}');
            processedPayments[reference] = true;
            localStorage.setItem('processedPayments', JSON.stringify(processedPayments));

            setShowSuccessModal(true);

            // Clean URL parameters to prevent re-processing on refresh
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete("reference");
            newUrl.searchParams.delete("trxref");
            newUrl.searchParams.set("payment_success", "true");
            window.history.replaceState({}, "", newUrl);
          } else {
            console.log("No token available for this payment");
            setError("Payment successful but token generation failed. Please contact support.");
          }

          // Refresh payments list to show the new payment
          await refreshPayments(userEmail);
        } else {
          setError(data.message || `Payment failed. Status: ${data.data?.status || "unknown"}`);
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        setError("Payment verification failed. Please try again.");
      } finally {
        setVerifyingPayment(false);
      }
    };

    const refreshPayments = async (email) => {
      try {
        const response = await fetch(
          `/api/payments/history?email=${encodeURIComponent(email)}&limit=20&sortBy=created_at&sortOrder=desc`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.data && data.data.payments) {
            setPayments(data.data.payments);
            console.log(`Loaded ${data.data.payments.length} payments`);
          } else {
            console.warn('No payments data in response:', data);
            setPayments([]);
          }
        } else {
          console.error('Failed to fetch payments:', response.status);
          setPayments([]);
        }
      } catch (error) {
        console.error("Error fetching payments:", error);
        setPayments([]);
      }
    };

    fetchData();
  }, [searchParams, pricePerKg, hasProcessedPayment]);

  const formatToken = (token) => {
    if (!token) return "N/A";
    const numericToken = token.replace(/\D/g, "").substring(0, 20);
    const paddedToken = numericToken.padEnd(20, "0");
    return paddedToken.replace(/(\d{4})/g, "$1 ").trim();
  };

  const handleViewToken = (payment) => {
    const savedToken = localStorage.getItem(`token_${payment.reference}`);
    if (savedToken) {
      setSelectedPayment(payment);
      setGeneratedToken(JSON.parse(savedToken));
      setViewingToken(true);
    } else {
      setError("Token not found for this payment. Please contact support.");
    }
  };

  if (loading || verifyingPayment) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">
          {verifyingPayment
            ? "Processing your payment and generating token..."
            : "Loading your dashboard..."}
        </p>
      </div>
    );
  }

  return (
    <div className="container py-5">
      {/* Success Modal */}
      {showSuccessModal && generatedToken && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="fas fa-check-circle me-2"></i>
                  Payment Successful!
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowSuccessModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="receipt p-4 border rounded">
                  <div className="text-center mb-4">
                    <h3 className="text-primary fw-bold">Noretek Energy</h3>
                    <h5 className="text-dark">GAS TOKEN RECEIPT</h5>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <p><strong>Customer:</strong> {generatedToken.customerName || user?.email}</p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Meter Number:</strong> {generatedToken.meterNumber}</p>
                    </div>
                  </div>
                  
                  <div className="bg-dark text-light p-4 rounded text-center mb-4">
                    <h6 className="mb-2 text-warning">YOUR GAS TOKEN</h6>
                    <h2 className="display-5 font-monospace text-white mb-0">
                      {formatToken(generatedToken.token)}
                    </h2>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <p><strong>Amount Paid:</strong> ₦{parseFloat(generatedToken.amount).toLocaleString()}</p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Units Purchased:</strong> {generatedToken.units} KG</p>
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <p><strong>Volume (Cubic Meters):</strong> {generatedToken.cubicMeters || calculateCubicMeters(parseFloat(generatedToken.units))} m³</p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Price per KG:</strong> ₦{pricePerKg}</p>
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-12">
                      <p><strong>Reference:</strong> {generatedToken.reference}</p>
                    </div>
                  </div>
                  
                  <div className="alert alert-info mt-4">
                    <h6 className="mb-2">Gas Volume Information:</h6>
                    <p className="mb-2 small">
                      <strong>Conversion:</strong> 1 cubic meter = 510 kg of gas<br/>
                      <strong>Your purchase:</strong> {generatedToken.units} kg = {generatedToken.cubicMeters || calculateCubicMeters(parseFloat(generatedToken.units))} cubic meters
                    </p>
                    <h6 className="mb-2">How to use your token:</h6>
                    <ol className="mb-0 small">
                      <li>Press the 'Enter' button on your meter</li>
                      <li>Enter the 20-digit token when prompted</li>
                      <li>Press 'Enter' again to confirm</li>
                      <li>Wait for the meter to validate and load the units</li>
                    </ol>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-outline-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedToken.token.replace(/\s/g, ""));
                    alert("Token copied to clipboard!");
                  }}
                >
                  <i className="fas fa-copy me-2"></i>Copy Token
                </button>
                <button className="btn btn-primary" onClick={() => window.print()}>
                  <i className="fas fa-print me-2"></i>Print Receipt
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => setShowSuccessModal(false)}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Token Modal */}
      {viewingToken && generatedToken && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">
                  <i className="fas fa-key me-2"></i>
                  Purchased Token
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setViewingToken(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="receipt p-4 border rounded">
                  <div className="text-center mb-4">
                    <h3 className="text-primary fw-bold">Noretek Energy</h3>
                    <h5 className="text-dark">GAS TOKEN RECEIPT</h5>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <p><strong>Customer:</strong> {generatedToken.customerName || user?.email}</p>
                      <p><strong>Reference:</strong> {generatedToken.reference}</p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Meter Number:</strong> {generatedToken.meterNumber}</p>
                      <p><strong>Purchase Date:</strong> {selectedPayment?.created_at ? new Date(selectedPayment.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="bg-dark text-light p-4 rounded text-center mb-4">
                    <h6 className="mb-2 text-warning">YOUR GAS TOKEN</h6>
                    <h2 className="display-5 font-monospace text-white mb-0">
                      {formatToken(generatedToken.token)}
                    </h2>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <p><strong>Amount Paid:</strong> ₦{parseFloat(generatedToken.amount).toLocaleString()}</p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Units Purchased:</strong> {generatedToken.units} KG</p>
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <p><strong>Volume (Cubic Meters):</strong> {generatedToken.cubicMeters || calculateCubicMeters(parseFloat(generatedToken.units))} m³</p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Price per KG:</strong> ₦{pricePerKg}</p>
                    </div>
                  </div>
                  
                  <div className="alert alert-info mt-4">
                    <h6 className="mb-2">Gas Volume Information:</h6>
                    <p className="mb-2 small">
                      <strong>Conversion:</strong> 1 cubic meter = 510 kg of gas<br/>
                      <strong>Your purchase:</strong> {generatedToken.units} kg = {generatedToken.cubicMeters || calculateCubicMeters(parseFloat(generatedToken.units))} cubic meters
                    </p>
                    <h6 className="mb-2">How to use your token:</h6>
                    <ol className="mb-0 small">
                      <li>Press the 'Enter' button on your meter</li>
                      <li>Enter the 20-digit token when prompted</li>
                      <li>Press 'Enter' again to confirm</li>
                      <li>Wait for the meter to validate and load the units</li>
                    </ol>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-outline-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedToken.token.replace(/\s/g, ""));
                    alert("Token copied to clipboard!");
                  }}
                >
                  <i className="fas fa-copy me-2"></i>Copy Token
                </button>
                <button className="btn btn-primary" onClick={() => window.print()}>
                  <i className="fas fa-print me-2"></i>Print Receipt
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setViewingToken(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="row mb-4">
        <div className="col">
          <button
            className="btn btn-outline-primary mb-3"
            onClick={() => router.push("/customer_dashboard")}
          >
            <i className="fas fa-arrow-left me-2"></i>Back to Dashboard
          </button>
          <h2 className="h4 text-primary">GAS Token Purchase</h2>
          <p className="text-muted h5">Welcome back, {user?.email}</p>
          <div className="alert alert-info d-flex align-items-center">
            <i className="fas fa-info-circle me-2"></i>
            <div>
              <strong>Current Price:</strong> ₦{pricePerKg} per KG
              <br />
              <small>Example: ₦{pricePerKg} = 1.0 KG ({calculateCubicMeters(1)} m³), ₦{(pricePerKg * 1.5).toFixed(2)} = 1.5 KG ({calculateCubicMeters(1.5)} m³)</small>
              <br />
              <small className="text-muted">Conversion: 510 kg = 1 cubic meter</small>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
          ></button>
        </div>
      )}

      {/* Meter Information */}
      {meterInfo && (
        <div className="card mb-4">
          <div className="card-header bg-info text-white">
            <h5 className="mb-0">
              <i className="fas fa-info-circle me-2"></i>
              Meter Information
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <p><strong>Customer Name:</strong> {meterInfo.customerName}</p>
                <p><strong>Meter Number:</strong> {meterInfo.meterNumber}</p>
              </div>
              <div className="col-md-6">
                <p><strong>Email:</strong> {user?.email}</p>
                <p>
                  <strong>Status:</strong>
                  <span className="badge bg-success ms-2">{meterInfo.status}</span>
                </p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-light rounded">
              <h6>Pricing & Volume Information</h6>
              <p className="mb-1"><strong>Price per KG:</strong> ₦{pricePerKg}</p>
              <p className="mb-1"><strong>Volume Conversion:</strong> 510 kg = 1 cubic meter</p>
              <p className="mb-0"><strong>Calculation:</strong> Amount (₦) / {pricePerKg} = Units (KG) / 510 = Volume (m³)</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="row mb-5">
        <div className="col-md-6">
          <PaymentForm
            userEmail={user?.email}
            userId={user?.id}
            presetMeter={meterId}
            pricePerKg={pricePerKg}
          />
        </div>
        
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="fas fa-history me-2"></i> Payment History
              </h5>
            </div>
            <div className="card-body">
              {payments.length === 0 ? (
                <div className="alert alert-info">No payments yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-hover">
                    <thead className="table-primary">
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Units (KG)</th>
                        <th>Volume (m³)</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => {
                        const units = payment.metadata?.units 
                          ? parseFloat(payment.metadata.units)
                          : (payment.metadata?.nairaAmount || payment.amount) / pricePerKg;
                        const cubicMeters = calculateCubicMeters(units);
                        
                        return (
                          <tr key={payment.id || payment._id}>
                            <td>
                              {new Date(payment.created_at || payment.createdAt).toLocaleDateString()}
                            </td>
                            <td>
                              ₦{(payment.metadata?.nairaAmount || payment.amount).toLocaleString()}
                            </td>
                            <td>
                              {units.toFixed(2)} KG
                            </td>
                            <td>
                              {cubicMeters} m³
                            </td>
                            <td>
                              <span className={`badge ${payment.status === "success" ? "bg-success" : "bg-warning"}`}>
                                {payment.status}
                              </span>
                            </td>
                            <td>
                              {payment.status === "success" && (
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleViewToken(payment)}
                                  title="View Token"
                                >
                                  <i className="fas fa-print me-1"></i> Print
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Font Awesome CSS */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      <style jsx>{`
        .modal-backdrop {
          background-color: rgba(0,0,0,0.5) !important;
        }
        .font-monospace {
          font-family: 'Courier New', monospace;
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
      `}</style>
    </div>
  );
}

export default function CustomerPaymentDashboard() {
  return (
    <Suspense
      fallback={
        <div className="container py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading payment dashboard...</p>
        </div>
      }
    >
      <CustomerPaymentDashboardContent />
    </Suspense>
  );
}