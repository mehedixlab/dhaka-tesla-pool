// backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// ==========================================
// PRD Requirement: Fare Model (ভাড়া নির্ধারণ)
// passengerFare = baseFare + distanceCharge - poolDiscount
// ==========================================
const BASE_FARE = 50; // বেস ফেয়ার ৫০ টাকা
const POOL_DISCOUNT_PER_SEAT = 20; // রাইড শেয়ার (পুল) হলে প্রতি সিটে ২০ টাকা ডিসকাউন্ট

// ডেমো দূরত্বের চার্জ (যেহেতু আমরা Google Maps API ব্যবহার করছি না)
const getDistanceCharge = (pickup, dropoff) => {
    // যেকোনো জোনের জন্য আপাতত ফিক্সড ১০০ টাকা দূরত্ব চার্জ ধরছি (MVP এর জন্য)
    return 100; 
};

// ==========================================
// API ১: প্যাসেঞ্জার রাইড রিকোয়েস্ট করবে
// ==========================================
app.post('/api/passenger/request-ride', async (req, res) => {
    try {
        const { passengerId, pickupZone, dropoffZone, seatsRequested } = req.body;

        if (!passengerId || !pickupZone || !dropoffZone) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // ভাড়ার হিসাব (প্রাথমিকভাবে কোনো ডিসকাউন্ট ছাড়া)
        const distanceCharge = getDistanceCharge(pickupZone, dropoffZone);
        const estimatedFare = BASE_FARE + distanceCharge; // পুলিং কনফার্ম হলে পরে ডিসকাউন্ট যোগ হবে

        // ডাটাবেসে রিকোয়েস্ট সেভ করা
        const rideRequest = await prisma.rideRequest.create({
            data: {
                passengerId,
                pickupZone,
                dropoffZone,
                seatsRequested: seatsRequested || 1,
                fare: estimatedFare,
                status: 'REQUESTED' // PRD এর Lifecycle অনুযায়ী
            }
        });

        res.status(201).json({
            message: 'Ride requested successfully',
            rideRequest
        });
    } catch (error) {
        console.error("Error creating ride request:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// সার্ভার চালু করা
const PORT = process.env.PORT || 5000;
// ==========================================
// API ২: ড্রাইভার রাইড এক্সেপ্ট করবে (Concurrency & Locking Handle সহ)
// ==========================================
app.post('/api/driver/accept-ride', async (req, res) => {
    const { driverId, vehicleId, rideRequestId } = req.body;

    if (!driverId || !vehicleId || !rideRequestId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Prisma Transaction ব্যবহার করে Data Consistency (Concurrency) সামলানো হচ্ছে
        const result = await prisma.$transaction(async (tx) => {
            
            // ১. ড্রাইভারের কোনো রানিং (ACTIVE) পুল আছে কি না চেক করা
            let pool = await tx.pool.findFirst({
                where: { driverId, vehicleId, status: 'ACTIVE' },
                include: { rideRequests: true }
            });

            // না থাকলে নতুন পুল তৈরি করা (মানে এইমাত্র ট্রিপ শুরু হলো)
            if (!pool) {
                pool = await tx.pool.create({
                    data: { driverId, vehicleId, status: 'ACTIVE' },
                    include: { rideRequests: true }
                });
            }

            // ২. গাড়ির ক্যাপাসিটি চেক করা
            const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
            if (!vehicle) throw new Error("Vehicle not found");

            // ৩. বর্তমান পুলে কতগুলো সিট অলরেডি বুক হয়েছে তার হিসাব
            const currentlyBookedSeats = pool.rideRequests.reduce((sum, req) => sum + req.seatsRequested, 0);

            // ৪. প্যাসেঞ্জারের রিকোয়েস্টটি চেক করা (এটি কি এখনো REQUESTED স্টেটে আছে?)
            const rideReq = await tx.rideRequest.findUnique({ where: { id: rideRequestId } });

            if (!rideReq || rideReq.status !== 'REQUESTED') {
                throw new Error("Ride request is no longer available or already matched.");
            }

            // ৫. কনকারেন্সি চেক (Concurrency Lock): সিট লিমিট ক্রস করছে কি না
            if (currentlyBookedSeats + rideReq.seatsRequested > vehicle.capacity) {
                throw new Error("Seat capacity exceeded! Cannot accept this ride.");
            }

            // ৬. রিকোয়েস্ট এক্সেপ্ট করে পুলে যুক্ত করা (MATCHED)
            const updatedRideReq = await tx.rideRequest.update({
                where: { id: rideRequestId },
                data: {
                    poolId: pool.id,
                    status: 'MATCHED'
                }
            });

            // ৭. PRD অনুযায়ী Fare (ভাড়া) মডেল এবং পুল ডিসকাউন্ট অ্যাপ্লাই করা
            // যদি পুলে ১ জনের বেশি রিকোয়েস্ট থাকে (অর্থাৎ রাইড শেয়ার হচ্ছে), তবে সবাই ডিসকাউন্ট পাবে
            const totalRequestsInPool = pool.rideRequests.length + 1; 
            
            if (totalRequestsInPool > 1) {
                const discountedFare = BASE_FARE + getDistanceCharge(rideReq.pickupZone, rideReq.dropoffZone) - POOL_DISCOUNT_PER_SEAT;
                
                // পুলের সাথে যুক্ত সকল প্যাসেঞ্জারের ভাড়া আপডেট করে ডিসকাউন্ট রেট বসিয়ে দেওয়া হলো
                await tx.rideRequest.updateMany({
                    where: { poolId: pool.id },
                    data: { fare: discountedFare } 
                });
            }

            return updatedRideReq;
        });

        res.status(200).json({
            message: 'Ride accepted successfully',
            rideRequest: result
        });

    } catch (error) {
        console.error("Concurrency/Pooling Error:", error.message);
        // যদি সিট না থাকে বা এরর হয়, তবে 400 Bad Request পাঠাবে
        res.status(400).json({ error: error.message }); 
    }
});
// ==========================================
// API ৩: রাইড বা ট্রিপের স্ট্যাটাস পরিবর্তন (DRIVER_ARRIVED, STARTED, COMPLETED, CANCELLED)
// ==========================================
app.put('/api/ride/status', async (req, res) => {
    const { rideRequestId, status } = req.body;

    // PRD অনুযায়ী অনুমোদিত স্ট্যাটাসগুলো
    const validStatuses = ['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED'];

    if (!rideRequestId || !status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid or missing data' });
    }

    try {
        const updatedRide = await prisma.rideRequest.update({
            where: { id: rideRequestId },
            data: { status }
        });

        // যদি রাইড কমপ্লিট বা ক্যানসেল হয়, এবং সেই পুলের সব রাইড শেষ হয়ে যায়, তবে পুলটিও কমপ্লিট করা যেতে পারে
        // (MVP এর জন্য এটি সিম্পল রাখা হলো)

        res.status(200).json({
            message: `Ride status updated to ${status}`,
            rideRequest: updatedRide
        });
    } catch (error) {
        console.error("Error updating ride status:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==========================================
// API ৪: ড্যাশবোর্ডের জন্য ডাটা ফেচ (প্যাসেঞ্জার এবং ড্রাইভার)
// ==========================================

// ইউজারের প্রোফাইল এবং তার বর্তমান রাইডের তথ্য ফেচ করা
app.get('/api/user/:userId/dashboard', async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                vehicles: true, // যদি সে ড্রাইভার হয়
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let currentRides = [];

        if (user.role === 'PASSENGER') {
            // প্যাসেঞ্জারের ক্ষেত্রে তার নিজস্ব রিকোয়েস্টগুলো দেখাবে
            currentRides = await prisma.rideRequest.findMany({
                where: { passengerId: user.id },
                orderBy: { createdAt: 'desc' },
                take: 5 // শেষের ৫টি রাইড হিস্ট্রি
            });
        } else if (user.role === 'DRIVER') {
            // ড্রাইভারের ক্ষেত্রে তার বর্তমান পুল এবং প্যাসেঞ্জারদের দেখাবে
            currentRides = await prisma.pool.findMany({
                where: { driverId: user.id },
                include: { rideRequests: { include: { passenger: true } } },
                orderBy: { createdAt: 'desc' },
                take: 5
            });
        }

        res.status(200).json({
            user,
            history: currentRides
        });

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.listen(PORT, () => {
    console.log(`🚀 Dhaka Tesla Pool API is running on http://localhost:${PORT}`);
});