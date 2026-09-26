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
app.listen(PORT, () => {
    console.log(`🚀 Dhaka Tesla Pool API is running on http://localhost:${PORT}`);
});