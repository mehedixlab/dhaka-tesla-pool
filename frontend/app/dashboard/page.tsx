// frontend/app/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [pendingRides, setPendingRides] = useState<any[]>([]);
  const router = useRouter();

  // প্যাসেঞ্জারের ফর্ম স্টেট
  const [pickupZone, setPickupZone] = useState("Banani");
  const [dropoffZone, setDropoffZone] = useState("Mohakhali");
  const [seats, setSeats] = useState(1);

  // পেজ লোড হলে ইউজারের তথ্য ফেচ করা
  useEffect(() => {
    const storedUser = localStorage.getItem("tesla_user");
    if (!storedUser) {
      router.push("/");
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    fetchDashboardData(parsedUser.id);

    if (parsedUser.role === "DRIVER") {
      fetchPendingRides();
    }
  }, []);

  const fetchDashboardData = async (userId: string) => {
    const res = await fetch(`http://localhost:5000/api/user/${userId}/dashboard`);
    const data = await res.json();
    setDashboardData(data);
  };

  const fetchPendingRides = async () => {
    const res = await fetch("http://localhost:5000/api/rides/pending");
    const data = await res.json();
    setPendingRides(data);
  };

  // প্যাসেঞ্জার: নতুন রাইড রিকোয়েস্ট করা
  const requestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("http://localhost:5000/api/passenger/request-ride", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        passengerId: user.id,
        pickupZone,
        dropoffZone,
        seatsRequested: seats,
      }),
    });
    if (res.ok) {
      alert("Ride requested successfully!");
      fetchDashboardData(user.id);
    } else {
      const error = await res.json();
      alert("Error: " + error.error);
    }
  };

  // ড্রাইভার: রাইড এক্সেপ্ট করা
  const acceptRide = async (rideRequestId: string) => {
    if (!dashboardData?.user?.vehicles?.[0]) return alert("No vehicle found!");
    const vehicleId = dashboardData.user.vehicles[0].id;

    const res = await fetch("http://localhost:5000/api/driver/accept-ride", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverId: user.id,
        vehicleId: vehicleId,
        rideRequestId,
      }),
    });

    if (res.ok) {
      alert("Ride accepted! Pool updated.");
      fetchDashboardData(user.id);
      fetchPendingRides();
    } else {
      const error = await res.json();
      alert("Failed: " + error.error);
    }
  };

  // ড্রাইভার: রাইড স্ট্যাটাস আপডেট করা (Arrived, Start, Complete)
  const updateRideStatus = async (rideRequestId: string, newStatus: string) => {
    const res = await fetch("http://localhost:5000/api/ride/status", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rideRequestId,
        status: newStatus,
      }),
    });

    if (res.ok) {
      alert(`Status updated to ${newStatus}`);
      fetchDashboardData(user.id); // ড্যাশবোর্ড রিফ্রেশ করা
    } else {
      const error = await res.json();
      alert("Failed to update status: " + error.error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("tesla_user");
    router.push("/");
  };

  if (!user || !dashboardData) return <div className="text-center mt-20 font-bold">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="bg-white p-6 rounded-xl shadow mb-6 flex justify-between items-center border-t-4 border-red-600">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome, {user.name}</h1>
            <p className="text-gray-500 font-medium">{user.role} Dashboard</p>
          </div>
          <button onClick={handleLogout} className="bg-gray-200 text-gray-800 px-4 py-2 rounded font-bold hover:bg-gray-300">
            Logout
          </button>
        </div>

        {/* ========================================================= */}
        {/* PASSENGER VIEW */}
        {/* ========================================================= */}
        {user.role === "PASSENGER" && (
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* রাইড রিকোয়েস্ট ফর্ম */}
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-lg font-bold mb-4">Request a Ride</h2>
              <form onSubmit={requestRide} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Pickup Zone</label>
                  <select className="w-full mt-1 p-2 border rounded" value={pickupZone} onChange={(e) => setPickupZone(e.target.value)}>
                    <option value="Banani">Banani</option>
                    <option value="Gulshan 1">Gulshan 1</option>
                    <option value="Mohakhali">Mohakhali</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Drop-off Zone</label>
                  <select className="w-full mt-1 p-2 border rounded" value={dropoffZone} onChange={(e) => setDropoffZone(e.target.value)}>
                    <option value="Mohakhali">Mohakhali</option>
                    <option value="Gulshan 1">Gulshan 1</option>
                    <option value="Banani">Banani</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Seats (Max 3)</label>
                  <input type="number" min="1" max="3" className="w-full mt-1 p-2 border rounded" value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
                </div>
                <button type="submit" className="w-full bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700">
                  Request Ride
                </button>
              </form>
            </div>

            {/* ইউজারের নিজস্ব রাইড হিস্ট্রি */}
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-lg font-bold mb-4">Your Recent Rides</h2>
              {dashboardData.history.length === 0 ? (
                <p className="text-gray-500 text-sm">No rides found.</p>
              ) : (
                <ul className="space-y-3">
                  {dashboardData.history.map((ride: any) => (
                    <li key={ride.id} className="p-3 border rounded-lg bg-gray-50 text-sm">
                      <p className="font-bold text-gray-800">{ride.pickupZone} ➡️ {ride.dropoffZone}</p>
                      <p className="text-gray-600">Status: <span className="font-bold text-blue-600">{ride.status}</span></p>
                      <p className="text-gray-600">Fare: {ride.fare} BDT (Seats: {ride.seatsRequested})</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* DRIVER VIEW */}
        {/* ========================================================= */}
        {user.role === "DRIVER" && (
          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* পেন্ডিং রিকোয়েস্ট লিস্ট */}
            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
              <h2 className="text-lg font-bold mb-4">Available Ride Requests</h2>
              {pendingRides.length === 0 ? (
                <p className="text-gray-500 text-sm">No new requests right now.</p>
              ) : (
                <ul className="space-y-3">
                  {pendingRides.map((ride: any) => (
                    <li key={ride.id} className="p-4 border rounded-lg shadow-sm flex justify-between items-center bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-800">{ride.passenger.name}</p>
                        <p className="text-sm text-gray-600">{ride.pickupZone} ➡️ {ride.dropoffZone}</p>
                        <p className="text-sm text-gray-500 font-semibold">Seats: {ride.seatsRequested}</p>
                      </div>
                      <button onClick={() => acceptRide(ride.id)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700">
                        Accept
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ড্রাইভারের রানিং পুল/হিস্ট্রি এবং স্ট্যাটাস আপডেট */}
            <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
              <h2 className="text-lg font-bold mb-4">Your Active Pools & History</h2>
              {dashboardData.history.length === 0 ? (
                <p className="text-gray-500 text-sm">You have no active pools.</p>
              ) : (
                <ul className="space-y-4">
                  {dashboardData.history.map((pool: any) => (
                    <li key={pool.id} className="p-4 border rounded-lg bg-gray-50">
                      <p className="font-bold text-gray-700 mb-2 text-xs">Pool ID: {pool.id} | Status: <span className="text-blue-600">{pool.status}</span></p>
                      
                      <div className="space-y-3">
                        {pool.rideRequests.map((req: any) => (
                          <div key={req.id} className="bg-white p-3 rounded border text-sm flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            
                            <div>
                                <span className="font-bold text-gray-800">{req.passenger.name}</span> 
                                <span className="text-gray-500"> ({req.pickupZone} ➡️ {req.dropoffZone})</span>
                            </div>

                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 mt-2 sm:mt-0">
    {/* w-24 সরিয়ে w-auto দেওয়া হয়েছে যাতে টেক্সট না কাটে */}
    <span className="font-bold text-blue-600 text-xs sm:text-sm w-auto text-right">{req.status}</span>
    
    {/* স্ট্যাটাস আপডেট করার অপশন */}
    {req.status !== 'COMPLETED' && req.status !== 'CANCELLED' && (
        <select 
            className="border p-1.5 rounded bg-gray-100 text-xs font-bold outline-none cursor-pointer hover:bg-gray-200 transition"
            onChange={(e) => updateRideStatus(req.id, e.target.value)}
            defaultValue=""
        >
                                        <option value="" disabled>Update Status</option>
                                        <option value="DRIVER_ARRIVED">Arrived</option>
                                        <option value="STARTED">Start</option>
                                        <option value="COMPLETED">Complete</option>
                                    </select>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
          </div>
        )}

      </div>
    </div>
  );
}