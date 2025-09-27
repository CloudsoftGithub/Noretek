"use client";

import React, { useState, useEffect } from "react";

export default function CustomerPage() {
  // Login state
  const [loginData, setLoginData] = useState({
    userId: "",
    password: "",
    company: "Noretek Energy",
  });
  const [token, setToken] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Customer form state
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    type: 0,
    phone: "",
    address: "",
    certifiName: "",
    certifiNo: "",
    remark: "",
    company: "Noretek Energy",
    
    // Property fields
    property_id: "",
    unit_id: "",
    property_name: "",
    unit_description: "",
    blockno: "",
    meter_id: ""
  });
  const [formMessage, setFormMessage] = useState("");
  const [formMessageType, setFormMessageType] = useState("");

  // Property and unit state
  const [properties, setProperties] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [propertyLoading, setPropertyLoading] = useState(false);

  // UserList customers state - for auto-filling data
  const [userListCustomers, setUserListCustomers] = useState([]);

  // Table state
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
    totalPages: 1,
    totalRecords: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("customerId");
  const [sortOrder, setSortOrder] = useState("asc");

  // Auto-refresh ID state
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastGeneratedId, setLastGeneratedId] = useState("");

  // Options for dropdowns
  const customerTypes = [
    { value: 0, label: "Residential" },
    { value: 1, label: "Commercial" },
    { value: 2, label: "Industrial" }
  ];

  // Initialize token from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  // Fetch customers when token or filters change
  useEffect(() => {
    if (token) {
      fetchCustomers();
    }
    // eslint-disable-next-line
  }, [token, pagination.pageNumber, pagination.pageSize, searchTerm, sortField, sortOrder]);

  // Auto-generate customer ID when token is available and not editing
  useEffect(() => {
    if (token && !isEditing && autoRefreshEnabled) {
      generateCustomerId();
    }
  }, [token, isEditing, autoRefreshEnabled]);

  // Auto-refresh ID after successful form submission
  useEffect(() => {
    if (formMessageType === "success" && !isEditing && autoRefreshEnabled) {
      const timer = setTimeout(() => {
        generateCustomerId();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formMessageType, isEditing, autoRefreshEnabled]);

  // Fetch properties, units, and userList customers when token is available
  useEffect(() => {
    if (token) {
      fetchPropertiesAndUnits();
      fetchUserListCustomers();
    }
  }, [token]);

  // Fetch userList customers for auto-filling
  const fetchUserListCustomers = async () => {
    try {
      const res = await fetch("/api/customer-signup-api");
      const data = await res.json();
      if (data.success) {
        setUserListCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Error fetching user list customers:", error);
    }
  };

  // Auto-populate property details when property is selected
  useEffect(() => {
    if (formData.property_id) {
      const selectedProperty = properties.find(p => p._id === formData.property_id);
      if (selectedProperty) {
        setFormData(prev => ({
          ...prev,
          property_name: selectedProperty.property_name || ""
        }));
        
        // Filter units for the selected property and enhance with customer info
        const unitsForProperty = properties
          .filter(p => p._id === formData.property_id)
          .flatMap(p => p.units || []);
        
        // Enhance units with customer information from userList
        const enhancedUnits = unitsForProperty.map(unit => {
          const matchingCustomer = userListCustomers.find(customer => {
            return customer.propertyUnit?._id === unit._id || 
                   (customer.propertyUnit?.unit_description === unit.unit_description && 
                    customer.propertyUnit?.blockno === unit.blockno);
          });
          
          return {
            ...unit,
            customerName: matchingCustomer?.name || '',
            customerPhone: matchingCustomer?.phone || '',
            hasCustomerData: !!matchingCustomer,
            hasCertificateData: !!(matchingCustomer?.certifiName || matchingCustomer?.certifiNo)
          };
        });
        
        setFilteredUnits(enhancedUnits);
        
        // Reset unit selection when property changes
        setFormData(prev => ({ 
          ...prev, 
          unit_id: "", 
          unit_description: "", 
          blockno: "", 
          meter_id: "" 
        }));
      }
    }
  }, [formData.property_id, properties, userListCustomers]);

  // Auto-populate customer details when unit is selected - FIXED CERTIFICATE DATA
  useEffect(() => {
    if (formData.unit_id) {
      const selectedUnit = filteredUnits.find(u => u._id === formData.unit_id);
      if (selectedUnit) {
        // First set the basic unit details
        setFormData(prev => ({
          ...prev,
          unit_description: selectedUnit.unit_description || "",
          blockno: selectedUnit.blockno || "",
          meter_id: selectedUnit.meter_id || ""
        }));

        // Now try to find matching customer data from userList
        const matchingCustomer = userListCustomers.find(customer => {
          return customer.propertyUnit?._id === formData.unit_id || 
                 (customer.propertyUnit?.unit_description === selectedUnit.unit_description && 
                  customer.propertyUnit?.blockno === selectedUnit.blockno);
        });

        if (matchingCustomer) {
          // Auto-fill customer details from userList data INCLUDING CERTIFICATE DATA
          setFormData(prev => ({
            ...prev,
            customerName: matchingCustomer.name || prev.customerName,
            phone: matchingCustomer.phone || prev.phone,
            address: matchingCustomer.address || prev.address,
            certifiName: matchingCustomer.certifiName || prev.certifiName,
            certifiNo: matchingCustomer.certifiNo || prev.certifiNo
          }));
        }
      }
    }
  }, [formData.unit_id, filteredUnits, userListCustomers]);

  // Fetch properties and units
  const fetchPropertiesAndUnits = async () => {
    setPropertyLoading(true);
    try {
      // Fetch properties
      const propertiesRes = await fetch("/api/property");
      const propertiesData = await propertiesRes.json();

      // Fetch units
      const unitsRes = await fetch("/api/property_unit");
      const unitsData = await unitsRes.json();

      // Combine properties with their units
      const propertiesWithUnits = propertiesData.map(property => ({
        ...property,
        units: unitsData.filter(unit => unit.property_id?._id === property._id)
      }));

      setProperties(propertiesWithUnits);
    } catch (error) {
      console.error("Error fetching properties and units:", error);
      setFormMessage("❌ Error loading properties and units");
      setFormMessageType("error");
    } finally {
      setPropertyLoading(false);
    }
  };

  // Improved customer ID generation with collision detection and 4-digit limit
  const generateCustomerId = async () => {
    if (!token || isEditing || !autoRefreshEnabled) return;

    try {
      const res = await fetch("http://47.107.69.132:9400/API/Customer/Read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          createDateRange: [],
          updateDateRange: [],
          pageNumber: 1,
          pageSize: 1000,
          company: "Noretek Energy",
          searchTerm: "",
          sortField: "customerId",
          sortOrder: "desc",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const allCustomers = data?.result?.data || [];
        
        const existingIds = allCustomers.map(customer => customer.customerId).filter(id => id);
        
        let highestNumber = 0;
        existingIds.forEach(id => {
          const idMatch = id.match(/([A-Za-z]*)(\d+)/);
          if (idMatch && idMatch.length >= 3) {
            const numericPart = parseInt(idMatch[2], 10);
            if (numericPart > highestNumber && numericPart < 10000) {
              highestNumber = numericPart;
            }
          }
        });

        const newNumber = highestNumber + 1;
        
        if (newNumber > 9999) {
          let availableNumber = 1;
          for (let i = 1; i <= 9999; i++) {
            const testId = `CUST${i.toString().padStart(4, "0")}`;
            if (!existingIds.includes(testId)) {
              availableNumber = i;
              break;
            }
          }
          const newId = `CUST${availableNumber.toString().padStart(4, "0")}`;
          setFormData(prev => ({ ...prev, customerId: newId }));
          setLastGeneratedId(newId);
        } else {
          const newId = `CUST${newNumber.toString().padStart(4, "0")}`;
          
          if (existingIds.includes(newId)) {
            let safeNumber = newNumber + 1;
            while (safeNumber <= 9999) {
              const safeId = `CUST${safeNumber.toString().padStart(4, "0")}`;
              if (!existingIds.includes(safeId)) {
                setFormData(prev => ({ ...prev, customerId: safeId }));
                setLastGeneratedId(safeId);
                return;
              }
              safeNumber++;
            }
            let availableNumber = 1;
            for (let i = 1; i <= 9999; i++) {
              const testId = `CUST${i.toString().padStart(4, "0")}`;
              if (!existingIds.includes(testId)) {
                availableNumber = i;
                break;
              }
            }
            const finalId = `CUST${availableNumber.toString().padStart(4, "0")}`;
            setFormData(prev => ({ ...prev, customerId: finalId }));
            setLastGeneratedId(finalId);
          } else {
            setFormData(prev => ({ ...prev, customerId: newId }));
            setLastGeneratedId(newId);
          }
        }
      } else {
        const fallbackId = "CUST0001";
        setFormData(prev => ({ ...prev, customerId: fallbackId }));
        setLastGeneratedId(fallbackId);
      }
    } catch (error) {
      console.error("Error generating customer ID:", error);
      const fallbackId = "CUST0001";
      setFormData(prev => ({ ...prev, customerId: fallbackId }));
      setLastGeneratedId(fallbackId);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      customerId: "",
      customerName: "",
      type: 0,
      phone: "",
      address: "",
      certifiName: "",
      certifiNo: "",
      remark: "",
      company: "Noretek Energy",
     
      property_id: "",
      unit_id: "",
      property_name: "",
      unit_description: "",
      blockno: "",
      meter_id: ""
    });
    setFilteredUnits([]);
    setIsEditing(false);
    setFormMessage("");
    setFormMessageType("");
    
    setAutoRefreshEnabled(true);
    if (token) {
      setTimeout(() => generateCustomerId(), 500);
    }
  };

  // Toggle auto-refresh functionality
  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
    if (!autoRefreshEnabled && token && !isEditing) {
      generateCustomerId();
    }
  };

  // Login handlers
  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("http://47.107.69.132:9400/API/User/Login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData?.message || `HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      if (data?.result?.token) {
        localStorage.setItem("token", data.result.token);
        setToken(data.result.token);
        setAutoRefreshEnabled(true);
        // Fetch userList data after login
        fetchUserListCustomers();
      } else {
        setLoginError(data?.message || "Login failed. Check credentials.");
      }
    } catch (err) {
      setLoginError("An error occurred: " + err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Customer form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["type"].includes(name)) {
      const numericValue = value === "" ? 0 : parseInt(value, 10);
      setFormData(prev => ({ ...prev, [name]: isNaN(numericValue) ? 0 : numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMessage("");
    setFormMessageType("");
    setLoading(true);

    try {
      const checkRes = await fetch("http://47.107.69.132:9400/API/Customer/Read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          createDateRange: [],
          updateDateRange: [],
          pageNumber: 1,
          pageSize: 1,
          company: "Noretek Energy",
          searchTerm: formData.customerId,
          sortField: "customerId",
          sortOrder: "asc",
        }),
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const existingCustomer = checkData?.result?.data?.[0];
        
        if (existingCustomer && existingCustomer.customerId === formData.customerId && !isEditing) {
          setFormMessage("⚠️ Customer ID was already taken. Generating new ID...");
          setFormMessageType("warning");
          await generateCustomerId();
          setLoading(false);
          return;
        }
      }

      const submitData = {
        customerId: formData.customerId,
        customerName: formData.customerName,
        type: Number(formData.type),
        phone: formData.phone || "",
        address: formData.address || "",
        certifiName: formData.certifiName || "",
        certifiNo: formData.certifiNo || "",
        company: formData.company,
       
        // Include property information
        property_id: formData.property_id,
        unit_id: formData.unit_id,
        property_name: formData.property_name,
        unit_description: formData.unit_description,
        blockno: formData.blockno,
        meter_id: formData.meter_id
      };

      const endpoint = isEditing
        ? "http://47.107.69.132:9400/API/Customer/Update"
        : "http://47.107.69.132:9400/API/Customer/Create";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify([submitData]),
      });

      if (!res.ok) {
        const errorData = await res.json();
        
        if (errorData?.message?.includes("duplicate") || errorData?.message?.includes("already exists")) {
          setFormMessage("❌ Customer ID already exists. Generating new ID...");
          setFormMessageType("error");
          await generateCustomerId();
          setLoading(false);
          return;
        }
        
        throw new Error(errorData?.message || `HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data?.result !== undefined) {
        setFormMessage(`✅ Customer ${isEditing ? "updated" : "created"} successfully.`);
        setFormMessageType("success");
        
        if (!isEditing) {
          setLastGeneratedId(formData.customerId);
          setAutoRefreshEnabled(true);
        }
        
        resetForm();
        fetchCustomers();
      } else {
        const errorMsg = data?.message || "Operation failed";
        setFormMessage(`❌ ${errorMsg}`);
        setFormMessageType("error");
      }
    } catch (err) {
      setFormMessage("❌ Error: " + err.message);
      setFormMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // Manual ID generation button handler
  const handleGenerateNewId = async () => {
    if (!isEditing) {
      setFormMessage("🔄 Generating new customer ID...");
      setFormMessageType("info");
      await generateCustomerId();
      setFormMessage("✅ New customer ID generated!");
      setFormMessageType("success");
      setTimeout(() => setFormMessage(""), 2000);
    }
  };

  // Table functions
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://47.107.69.132:9400/API/Customer/Read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          createDateRange: [],
          updateDateRange: [],
          pageNumber: pagination.pageNumber,
          pageSize: pagination.pageSize,
          company: "Noretek Energy",
          searchTerm: searchTerm,
          sortField: sortField,
          sortOrder: sortOrder,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData?.message || `HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setCustomers(data?.result?.data || []);

      if (data?.result?.pagination) {
        setPagination(prev => ({
          ...prev,
          totalPages: data.result.pagination.totalPages || 1,
          totalRecords: data.result.pagination.totalRecords || 0,
        }));
      }
    } catch (err) {
      setCustomers([]);
      setFormMessage("❌ Error fetching customers: " + err.message);
      setFormMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, pageNumber: newPage }));
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, pageNumber: 1 }));
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);
    setPagination(prev => ({
      ...prev,
      pageSize: newSize,
      pageNumber: 1
    }));
  };

  // Edit handler
  const handleEdit = (customer) => {
    setFormData({
      customerId: customer.customerId ?? "",
      customerName: customer.customerName ?? "",
      type: customer.type ?? 0,
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      certifiName: customer.certifiName ?? "",
      certifiNo: customer.certifiNo ?? "",
      company: customer.company ?? "Noretek Energy",
      
      property_id: customer.property_id ?? "",
      unit_id: customer.unit_id ?? "",
      property_name: customer.property_name ?? "",
      unit_description: customer.unit_description ?? "",
      blockno: customer.blockno ?? "",
      meter_id: customer.meter_id ?? ""
    });
    setIsEditing(true);
    setAutoRefreshEnabled(false);
    setFormMessage("");
    setFormMessageType("");
  };

  // Helper function to get label from value
  const getLabelFromValue = (value, options) => {
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  // Get matching customer data for selected property/unit
  const getSelectedCustomerData = () => {
    if (!formData.property_id || !formData.unit_id) return null;
    
    const selectedUnit = filteredUnits.find(u => u._id === formData.unit_id);
    if (!selectedUnit) return null;

    const matchingCustomer = userListCustomers.find(customer => {
      return customer.propertyUnit?._id === formData.unit_id || 
             (customer.propertyUnit?.unit_description === selectedUnit.unit_description && 
              customer.propertyUnit?.blockno === selectedUnit.blockno);
    });

    return matchingCustomer;
  };

  return (
    <div className="container mt-5">
      <style jsx>{`
        .cursor-pointer {
          cursor: pointer;
        }
        .card {
          border: none;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .card-header {
          border-bottom: 1px solid rgba(0,0,0,0.1);
          padding: 1rem 1.5rem;
        }
        .form-control:focus {
          box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25);
          border-color: #80bdff;
        }
        .btn {
          border-radius: 5px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn:disabled {
          opacity: 0.65;
        }
        .table th {
          border-top: none;
          font-weight: 600;
          color: #495057;
          background-color: #f8f9fa;
        }
        .alert {
          border: none;
          border-radius: 5px;
          padding: 0.75rem 1.25rem;
        }
        .spinner-border {
          width: 3rem;
          height: 3rem;
        }
        .input-group {
          width: auto;
        }
        .primaryColor {
          background-color: #0d6efd;
          color: white;
        }
        .titleColor {
          color: #0d6efd;
        }
        .table-container {
          overflow-x: auto;
          width: 100%;
        }
        .table {
          min-width: 1000px;
        }
        .id-field-container {
          display: flex;
          gap: 10px;
          align-items: flex-end;
        }
        .id-field {
          flex: 1;
        }
        .generate-btn {
          height: 38px;
          white-space: nowrap;
        }
        .auto-fill-badge {
          background-color: #d4edda;
          color: #155724;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.8em;
          margin-left: 5px;
        }
        .userlist-fill-badge {
          background-color: #d1ecf1;
          color: #0c5460;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.8em;
          margin-left: 5px;
        }
        .certificate-fill-badge {
          background-color: #fff3cd;
          color: #856404;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.8em;
          margin-left: 5px;
        }
        .property-unit-info {
          font-size: 0.9em;
          color: #6c757d;
        }
        .auto-refresh-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 5px;
        }
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 24px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: #0d6efd;
        }
        input:checked + .slider:before {
          transform: translateX(26px);
        }
        .id-status {
          font-size: 0.8em;
          color: #6c757d;
          margin-top: 2px;
        }
        .auto-refresh-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.8em;
          padding: 2px 8px;
          border-radius: 12px;
          background-color: #e9ecef;
        }
        .status-on {
          background-color: #d4edda;
          color: #155724;
        }
        .status-off {
          background-color: #f8d7da;
          color: #721c24;
        }
        .property-details {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin-top: 15px;
          border: 1px solid #e9ecef;
        }
        .property-detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding: 5px 0;
          border-bottom: 1px solid #e9ecef;
        }
        .property-detail-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        .property-detail-label {
          font-weight: 600;
          min-width: 120px;
          color: #495057;
        }
        .property-detail-value {
          color: #6c757d;
          text-align: right;
          flex: 1;
        }
        .userlist-info {
          background-color: #e3f2fd;
          border-left: 4px solid #2196f3;
          padding: 15px;
          margin-top: 10px;
          border-radius: 4px;
        }
        .customer-info-section {
          background-color: #f0f8ff;
          border-left: 4px solid #007bff;
          padding: 15px;
          margin-top: 10px;
          border-radius: 4px;
        }
        .customer-info-title {
          font-weight: 600;
          color: #007bff;
          margin-bottom: 10px;
          font-size: 0.95em;
        }
        .customer-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }
        .customer-info-item {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
        }
        .customer-info-label {
          font-weight: 500;
          color: #495057;
        }
        .customer-info-value {
          color: #6c757d;
        }
        .unit-dropdown-option {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .unit-customer-info {
          font-size: 0.85em;
          color: #28a745;
          font-weight: 500;
        }
        .no-customer-info {
          font-size: 0.85em;
          color: #6c757d;
          font-style: italic;
        }
        .enhanced-unit-option {
          padding: 8px 12px;
          border-bottom: 1px solid #e9ecef;
        }
        .enhanced-unit-option:last-child {
          border-bottom: none;
        }
        .unit-main-info {
          font-weight: 500;
          color: #212529;
        }
        .unit-customer-data {
          font-size: 0.85em;
          color: #28a745;
          margin-top: 2px;
        }
        .unit-no-customer {
          font-size: 0.85em;
          color: #6c757d;
          font-style: italic;
          margin-top: 2px;
        }
      `}</style>

      {/* LOGIN FORM */}
      {!token && (
        <div className="card mb-5 shadow">
          <div className="card-header bg-dark text-white text-center">
            <h4>Login to Get Token</h4>
          </div>
          <div className="card-body">
            <form onSubmit={handleLoginSubmit}>
              <div className="mb-3">
                <label className="form-label">User ID</label>
                <input
                  type="text"
                  className="form-control"
                  name="userId"
                  value={loginData.userId}
                  onChange={handleLoginChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  name="password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Company</label>
                <input
                  type="text"
                  className="form-control"
                  name="company"
                  value={loginData.company}
                  onChange={handleLoginChange}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loginLoading}
              >
                {loginLoading ? "Logging in..." : "Login"}
              </button>
              {loginError && (
                <div className="alert alert-danger mt-3">{loginError}</div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER FORM */}
      {token && (
        <div className="card mb-5 shadow-sm">
          <div className="card-header primaryColor fw-bold text-center">
            <h4>{isEditing ? "Edit Customer" : "Create New Customer"}</h4>
            <small className="text-white-50">
              {userListCustomers.length > 0 ? `✅ Loaded ${userListCustomers.length} customers from registration data` : '⏳ Loading customer data...'}
            </small>
          </div>
          <div className="card-body">
            {formMessage && (
              <div className={`alert alert-${formMessageType === "success" ? "success" : formMessageType === "warning" ? "warning" : formMessageType === "info" ? "info" : "danger"} mb-4`}>
                {formMessage}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="row g-3">
              {/* Property Information Section */}
              <div className="col-12">
                <h6 className="titleColor mb-3">
                  <i className="bi bi-building me-2"></i>
                  Property Information
                </h6>
                
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Property Name *</label>
                    <select
                      className="form-control shadow-none"
                      name="property_id"
                      value={formData.property_id}
                      onChange={handleChange}
                      required
                      disabled={propertyLoading}
                    >
                      <option value="">Select Property</option>
                      {properties.map((property) => (
                        <option key={property._id} value={property._id}>
                          {property.property_name}
                        </option>
                      ))}
                    </select>
                    {propertyLoading && (
                      <small className="text-muted">Loading properties...</small>
                    )}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Property Unit *</label>
                    <select
                      className="form-control shadow-none"
                      name="unit_id"
                      value={formData.unit_id}
                      onChange={handleChange}
                      required
                      disabled={!formData.property_id || propertyLoading}
                    >
                      <option value="">
                        {formData.property_id ? "Select Unit" : "First select a property"}
                      </option>
                      {filteredUnits.map((unit) => (
                        <option key={unit._id} value={unit._id}>
                          {unit.unit_description} - Block {unit.blockno}
                          {unit.meter_id && ` (Meter: ${unit.meter_id})`}
                          {unit.hasCustomerData ? ` | ${unit.customerName} - ${unit.customerPhone}` : ' | No customer data'}
                          {unit.hasCertificateData && ' 📄'}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted">
                      Units with registered customers show name and phone number. 📄 indicates certificate data available.
                    </small>
                  </div>
                </div>

                {/* Display Selected Property Details */}
                {(formData.property_name || formData.unit_description) && (
                  <div className="property-details">
                    <h6 className="titleColor mb-3">
                      <i className="bi bi-info-circle me-2"></i>
                      Selected Property Details
                    </h6>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="property-detail-item">
                          <span className="property-detail-label">Property Name:</span>
                          <span className="property-detail-value">{formData.property_name || "Not selected"}</span>
                        </div>
                        <div className="property-detail-item">
                          <span className="property-detail-label">Unit Description:</span>
                          <span className="property-detail-value">{formData.unit_description || "Not selected"}</span>
                        </div>
                        <div className="property-detail-item">
                          <span className="property-detail-label">Block Number:</span>
                          <span className="property-detail-value">{formData.blockno || "Not selected"}</span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="property-detail-item">
                          <span className="property-detail-label">Meter ID:</span>
                          <span className="property-detail-value">{formData.meter_id || "Not assigned"}</span>
                        </div>
                        <div className="property-detail-item">
                          <span className="property-detail-label">Property ID:</span>
                          <span className="property-detail-value">{formData.property_id || "Not selected"}</span>
                        </div>
                        <div className="property-detail-item">
                          <span className="property-detail-label">Unit ID:</span>
                          <span className="property-detail-value">{formData.unit_id || "Not selected"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Show Registered Customer Information */}
                    {(() => {
                      const customerData = getSelectedCustomerData();
                      return customerData ? (
                        <div className="customer-info-section">
                          <div className="customer-info-title">
                            <i className="bi bi-person-check me-2"></i>
                            Registered Customer Information (Auto-filled)
                          </div>
                          <div className="customer-info-grid">
                            <div className="customer-info-item">
                              <span className="customer-info-label">Name:</span>
                              <span className="customer-info-value">{customerData.name || 'N/A'}</span>
                            </div>
                            <div className="customer-info-item">
                              <span className="customer-info-label">Phone:</span>
                              <span className="customer-info-value">{customerData.phone || 'N/A'}</span>
                            </div>
                            <div className="customer-info-item">
                              <span className="customer-info-label">Address:</span>
                              <span className="customer-info-value">{customerData.address || 'N/A'}</span>
                            </div>
                            <div className="customer-info-item">
                              <span className="customer-info-label">Certificate Name:</span>
                              <span className="customer-info-value">{customerData.certifiName || 'N/A'}</span>
                            </div>
                            <div className="customer-info-item">
                              <span className="customer-info-label">Certificate Number:</span>
                              <span className="customer-info-value">{customerData.certifiNo || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      ) : formData.unit_id ? (
                        <div className="customer-info-section">
                          <div className="customer-info-title">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            No Registered Customer Data
                          </div>
                          <p className="mb-0 text-muted">No customer registration data found for this unit. Please fill in the customer details manually.</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>

              {/* Customer Information Section */}
              <div className="col-12">
                <h6 className="titleColor mb-3">
                  <i className="bi bi-person me-2"></i>
                  Customer Information
                </h6>
              </div>

              <div className="col-md-6">
                <label className="form-label">Customer ID *</label>
                <div className="id-field-container">
                  <div className="id-field">
                    <input
                      type="text"
                      className="form-control shadow-none"
                      name="customerId"
                      value={formData.customerId}
                      onChange={handleChange}
                      required
                      placeholder="Auto-generated customer ID (4 digits)"
                      readOnly={!isEditing}
                      maxLength={8}
                    />
                  </div>
                  {!isEditing && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary generate-btn"
                      onClick={handleGenerateNewId}
                      disabled={loading}
                      title="Generate new ID"
                    >
                      🔄
                    </button>
                  )}
                </div>
                <div className="auto-refresh-toggle">
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={autoRefreshEnabled} 
                      onChange={toggleAutoRefresh}
                      disabled={isEditing}
                    />
                    <span className="slider"></span>
                  </label>
                  <span className={`auto-refresh-status ${autoRefreshEnabled ? 'status-on' : 'status-off'}`}>
                    {autoRefreshEnabled ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
                  </span>
                </div>
                <small className="form-text text-muted">
                  {isEditing ? "Editing existing customer ID" : "Customer ID is auto-generated (4-digit number) and checked for duplicates"}
                </small>
                {lastGeneratedId && !isEditing && (
                  <div className="id-status">
                    Last generated: {lastGeneratedId}
                  </div>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label">Customer Name *</label>
                <input
                  type="text"
                  className="form-control shadow-none"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  required
                  placeholder="Enter customer name"
                />
                {formData.unit_id && getSelectedCustomerData() && <span className="userlist-fill-badge">Auto-filled from registration</span>}
              </div>

              <div className="col-md-6">
                <label className="form-label">Type *</label>
                <select
                  className="form-control shadow-none"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                >
                  {customerTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-control shadow-none"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />
                {formData.unit_id && getSelectedCustomerData() && <span className="userlist-fill-badge">Auto-filled from registration</span>}
              </div>

              <div className="col-md-6">
                <label className="form-label">Address</label>
                <input
                  type="text"
                  className="form-control shadow-none"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter address"
                />
                {formData.unit_id && getSelectedCustomerData() && <span className="userlist-fill-badge">Auto-filled from registration</span>}
              </div>

              <div className="col-md-6">
                <label className="form-label">Certificate Name</label>
                <input
                  type="text"
                  className="form-control shadow-none"
                  name="certifiName"
                  value={formData.certifiName}
                  onChange={handleChange}
                  placeholder="Enter certificate name"
                />
                {formData.unit_id && getSelectedCustomerData() && getSelectedCustomerData().certifiName && (
                  <span className="certificate-fill-badge">Auto-filled certificate data</span>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label">Certificate Number</label>
                <input
                  type="text"
                  className="form-control shadow-none"
                  name="certifiNo"
                  value={formData.certifiNo}
                  onChange={handleChange}
                  placeholder="Enter certificate number"
                />
                {formData.unit_id && getSelectedCustomerData() && getSelectedCustomerData().certifiNo && (
                  <span className="certificate-fill-badge">Auto-filled certificate data</span>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label">Company</label>
                <input
                  type="text"
                  className="form-control shadow-none"
                  name="company"
                  value={formData.company}
                  readOnly
                />
              </div>

              <div className="col-12">
                <label className="form-label">Remark</label>
                <textarea
                  className="form-control shadow-none"
                  name="remark"
                  value={formData.remark}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Optional remarks"
                ></textarea>
              </div>

              <div className="col-12">
                <button type="submit" className="btn primaryColor fw-bold w-100" disabled={loading}>
                  {loading ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Customer" : "Create Customer")}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    className="btn btn-secondary w-100 mt-2"
                    onClick={resetForm}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER TABLE */}
      {token && (
        <div className="card shadow mb-5">
          <div className="card-header primaryColor text-white">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <h5 className="mb-0">Customer Management</h5>
              <div className="d-flex flex-wrap gap-2">
                <form onSubmit={handleSearch} className="d-flex">
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control shadow-none"
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="btn titleColor bg-light border-opacity-50 border" type="submit" disabled={loading}>
                      Search
                    </button>
                  </div>
                </form>
                <select
                  className="form-select"
                  value={`${sortField}:${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split(':');
                    setSortField(field);
                    setSortOrder(order);
                  }}
                  disabled={loading}
                >
                  <option value="customerId:asc">Sort by Customer ID (A-Z)</option>
                  <option value="customerId:desc">Sort by Customer ID (Z-A)</option>
                  <option value="customerName:asc">Sort by Name (A-Z)</option>
                  <option value="customerName:desc">Sort by Name (Z-A)</option>
                  <option value="createDate:desc">Newest First</option>
                  <option value="createDate:asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center my-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="table table-bordered table-hover">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort("customerId")} className="cursor-pointer titleColor">
                          Customer ID {sortField === "customerId" && (
                            <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                          )}
                        </th>
                        <th onClick={() => handleSort("customerName")} className="cursor-pointer titleColor">
                          Name {sortField === "customerName" && (
                            <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                          )}
                        </th>
                        <th onClick={() => handleSort("type")} className="cursor-pointer titleColor">
                          Type {sortField === "type" && (
                            <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                          )}
                        </th>
                        <th className="titleColor">Phone</th>
                        <th className="titleColor">Address</th>
                        <th className="titleColor">Property</th>
                        <th className="titleColor">Unit</th>
                        <th className="titleColor">Block</th>
                        <th className="titleColor">Meter</th>
                        <th className="titleColor">Certificate Name</th>
                        <th className="titleColor">Certificate Number</th>
                        <th className="titleColor">Company</th>
                        <th className="titleColor">Remark</th>
                        <th className="titleColor">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.length > 0 ? (
                        customers.map((customer, index) => (
                          <tr key={index}>
                            <td>{customer.customerId}</td>
                            <td>{customer.customerName}</td>
                            <td>{getLabelFromValue(customer.type, customerTypes)}</td>
                            <td>{customer.phone || "-"}</td>
                            <td>{customer.address || "-"}</td>
                            <td>{customer.property_name || "-"}</td>
                            <td>{customer.unit_description || "-"}</td>
                            <td>{customer.blockno || "-"}</td>
                            <td>{customer.meter_id || "-"}</td>
                            <td>{customer.certifiName || "-"}</td>
                            <td>{customer.certifiNo || "-"}</td>
                            <td>{customer.company}</td>
                            <td>{customer.remark || "-"}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-warning"
                                onClick={() => handleEdit(customer)}
                                disabled={loading}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="14" className="text-center text-muted display-5 py-4">
                            No customers found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination controls */}
                <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-3">
                  <div className="text-nowrap">
                    Showing {(pagination.pageNumber - 1) * pagination.pageSize + 1} to{' '}
                    {Math.min(pagination.pageNumber * pagination.pageSize, pagination.totalRecords)} of{' '}
                    {pagination.totalRecords} customers
                  </div>
                  <div className="btn-group">
                    <button
                      className="btn primaryColor"
                      onClick={() => handlePageChange(pagination.pageNumber - 1)}
                      disabled={pagination.pageNumber === 1 || loading}
                    >
                      Previous
                    </button>
                    <span className="btn btn-light disabled">
                      Page {pagination.pageNumber} of {pagination.totalPages}
                    </span>
                    <button
                      className="btn primaryColor"
                      onClick={() => handlePageChange(pagination.pageNumber + 1)}
                      disabled={pagination.pageNumber === pagination.totalPages || loading}
                    >
                      Next
                    </button>
                  </div>
                  <div className="form-group">
                    <select
                      className="form-select"
                      value={pagination.pageSize}
                      onChange={handlePageSizeChange}
                      disabled={loading}
                    >
                      <option value="5">5 per page</option>
                      <option value="10">10 per page</option>
                      <option value="20">20 per page</option>
                      <option value="50">50 per page</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}