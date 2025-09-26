// src/app/api/noretek-meter/route.js
import { NextResponse } from "next/server";

// 🔐 Hardcode your Noretek credentials here
const loginData = {
  userId: "0001",
  password: "Ntk0001@#",
  company: "Noretek Energy",
};

// Function to login and get a fresh token
async function getFreshToken() {
  try {
    console.log("🔑 Attempting to login to Noretek API...");
    
    const res = await fetch("http://47.107.69.132:9400/API/User/Login", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(loginData),
    });

    console.log("Login response status:", res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("Login failed:", errorText);
      throw new Error(`Login failed with status ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    console.log("Login response:", data);
    
    const token = data?.result?.token || data?.token || null;
    
    if (!token) {
      console.error("No token found in response:", data);
      throw new Error("No token received from login response");
    }
    
    console.log("✅ Login successful, token received");
    return token;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

// Function to fetch meters with token
async function fetchMetersWithToken(token) {
  try {
    console.log("📊 Fetching meters with token...");
    
    const res = await fetch("http://47.107.69.132:9400/API/Meter/Read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        createDateRange: [],
        updateDateRange: [],
        pageNumber: 1,
        pageSize: 1000, // Increased to get more meters
        company: "Noretek Energy",
        searchTerm: "",
        sortField: "meterId",
        sortOrder: "asc",
      }),
    });

    console.log("Meters fetch response status:", res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("Meters fetch failed:", errorText);
      return { success: false, status: res.status, error: errorText };
    }

    const data = await res.json();
    console.log("Meters response:", data);
    
    return { 
      success: true, 
      meters: data?.result?.data || data?.data || [],
      totalCount: data?.result?.totalCount || 0
    };
  } catch (error) {
    console.error("Error fetching meters:", error);
    return { success: false, error: error.message };
  }
}

export async function POST(request) {
  try {
    console.log("🚀 Noretek API endpoint called");
    
    let { token } = await request.json();
    console.log("Received token:", token ? "exists" : "null");

    let metersResult;

    // If we have a token, try using it first
    if (token) {
      metersResult = await fetchMetersWithToken(token);
      
      // If token is invalid/expired, get a fresh one
      if (!metersResult.success && metersResult.status === 401) {
        console.log("🔄 Token expired, getting fresh token...");
        token = await getFreshToken();
        metersResult = await fetchMetersWithToken(token);
      }
    } else {
      // No token provided, get a fresh one
      console.log("🆕 No token provided, getting fresh token...");
      token = await getFreshToken();
      metersResult = await fetchMetersWithToken(token);
    }

    if (!metersResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: metersResult.error || "Failed to fetch meters",
          details: metersResult
        },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully fetched ${metersResult.meters.length} meters`);

    return NextResponse.json({
      success: true,
      meters: metersResult.meters,
      totalCount: metersResult.totalCount,
      token, // Return fresh token for frontend to store
      message: `Successfully loaded ${metersResult.meters.length} meters`
    });

  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message,
        error: "Internal server error" 
      },
      { status: 500 }
    );
  }
}