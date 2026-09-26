"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) {
        throw new Error("Account not found! Please use a valid demo number.");
      }

      const user = await res.json();
      
      // ব্রাউজারের লোকাল স্টোরেজে ইউজারের তথ্য সেভ করে রাখা
      localStorage.setItem("tesla_user", JSON.stringify(user));
      
      // সফল হলে ড্যাশবোর্ডে নিয়ে যাবে
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border-t-4 border-red-600">
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-2">Dhaka Tesla Pool</h1>
        <p className="text-center text-gray-500 mb-6 text-sm">Share a seat. Split the fare.</p>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 01700000001"
              required
            />
          </div>
          
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Demo Accounts (For Evaluator):</h3>
          <ul className="text-sm text-gray-600 space-y-1 font-mono">
            <li>🚕 Jashim (Driver) : <span className="font-bold text-black">01700000001</span></li>
            <li>🙎‍♀️ Nusrat (Passenger): <span className="font-bold text-black">01700000002</span></li>
            <li>🙎‍♂️ Rafiq (Passenger) : <span className="font-bold text-black">01700000003</span></li>
            <li>🙎‍♀️ Shirin (Passenger): <span className="font-bold text-black">01700000004</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}