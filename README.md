# 🚕 Dhaka Tesla Pool

Share a seat. Split the fare. Survive Dhaka traffic.

**Chief Tesla Engineer:** Md. Mehedi Hasan  
**Live Demo Video:** [Insert your Loom video link here]

## 📌 The Product Problem & Solution
In Dhaka's rush hour, a 3-seat Tesla (battery-powered rickshaw) often carries a single passenger while others wait. **Dhaka Tesla Pool** is an MVP ride-sharing platform that allows passengers to request rides and drivers to accept them. If multiple passengers share a route, the system intelligently pools them together, enforces seat capacities, and applies a fare discount for everyone in the pool.

## 🏗️ Architecture & ERD

### System Architecture
```mermaid
graph LR
    Client[Next.js Frontend] --> API[Node.js / Express API]
    API --> ORM[Prisma ORM]
    ORM --> DB[(PostgreSQL)]

Entity Relationship Diagram (ERD)

erDiagram
    USER ||--o{ VEHICLE : owns
    USER ||--o{ POOL : drives
    USER ||--o{ RIDE_REQUEST : makes
    VEHICLE ||--o{ POOL : assigned_to
    POOL ||--o{ RIDE_REQUEST : includes

🛠️ Tech Stack & Justification
Frontend: Next.js (React) + Tailwind CSS. Picked for its easy App Router setup, fast rendering, and clean state management for role-based dashboards.

Backend: Node.js + Express. Lightweight, highly scalable, and perfect for I/O heavy API requests.

Database: PostgreSQL. A relational database is strictly required here to enforce ACID properties, data integrity, and handle concurrency locking when multiple users request a seat.

ORM: Prisma. Chosen for its type safety, easy migration management, and excellent transaction ($transaction) support.

🚀 How to Run Locally (Docker)
1. Clone the repository:
git clone <your-repo-link>
cd dhaka-tesla-pool

2. Environment Setup:
Rename .env.example to .env. (No real secrets are included).

3. Run via Docker Compose:
docker compose up --build
This command spins up the Postgres DB, runs migrations, seeds demo data (Jashim, Nusrat, Rafiq, Shirin), and starts both the Backend (Port 5000) and Frontend (Port 3000).

4. Access the App: Open http://localhost:3000 in your browser.

🧑‍💻 Demo Accounts (Seeded)
Driver: 01700000001 (Jashim, Vehicle: Bullet, Capacity: 3)
Passengers: 01700000002 (Nusrat), 01700000003 (Rafiq), 01700000004 (Shirin)

⚡ Concurrency & Data Consistency
The Problem: What happens if Bullet has 1 seat left, and Nusrat and Shirin book it at the exact same millisecond?
The Solution: I implemented Prisma Transactions (prisma.$transaction) on the /api/driver/accept-ride endpoint. When the driver accepts a ride, the database locks the rows, calculates the currently occupied seats (excluding COMPLETED/CANCELLED rides), and verifies capacity. If the capacity is exceeded during the transaction, it throws a strict error, rolling back any changes.

🤖 AI Usage Policy
Tools Used: Gemini.

What For: Boilerplate Next.js UI generation, debugging Prisma 1-to-1 vs 1-to-Many relationship errors, and generating the Mermaid diagrams.

Accepted Suggestion: Using reduce to calculate dynamic seat capacity by filtering out completed rides.

Rejected Suggestion: AI initially suggested using MongoDB, but I rejected it in favor of PostgreSQL because relational databases handle transactions and locking much better for seat-booking concurrency.

📈 Bonus: "If Oi Tesla Goes Viral" (Scaling to 1M Users)
If we scale to 1M passengers and 100k drivers, the current architecture will face database contention and high latency. Here is how I would scale it:

1. Load Balancing & Horizontal Scaling: Deploy multiple Node.js API instances behind an API Gateway/Load Balancer (e.g., NGINX or AWS ALB).

2. Database Replicas: Use PostgreSQL Read-Replicas for fetching dashboards, while keeping the Master DB strictly for writes (booking seats).

3. Caching: Introduce Redis to cache user sessions, active drivers, and common routes to reduce DB load.

4. Geo-spatial Search: Move away from predefined zones and implement PostGIS for real-time radius matching.

5. Message Queues: Use RabbitMQ or Kafka to handle massive concurrent ride requests asynchronously so the main thread isn't blocked.