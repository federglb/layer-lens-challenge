// MongoDB seed script
// Run with: mongosh mongodb://localhost:27017/jobprocessor db/seed.js

db = db.getSiblingDB('jobprocessor');

// Clear existing jobs
db.jobs.deleteMany({});

// Sample jobs with various statuses
const jobs = [
  {
    name: "Data Export - Q4 Report",
    job_type: "export",
    status: "completed",
    config: { format: "csv", includeHeaders: true },
    retry_count: 0,
    created_at: new Date(Date.now() - 86400000 * 2), // 2 days ago
    updated_at: new Date(Date.now() - 86400000 * 2 + 5000),
  },
  {
    name: "Analyze Customer Segments",
    job_type: "analyze",
    status: "completed",
    config: { algorithm: "kmeans", clusters: 5 },
    retry_count: 0,
    created_at: new Date(Date.now() - 86400000), // 1 day ago
    updated_at: new Date(Date.now() - 86400000 + 3000),
  },
  {
    name: "Process Daily Transactions",
    job_type: "process",
    status: "failed",
    config: { batch_size: 1000 },
    error_message: "Simulated processing failure",
    retry_count: 1,
    created_at: new Date(Date.now() - 3600000 * 5), // 5 hours ago
    updated_at: new Date(Date.now() - 3600000 * 5 + 4000),
  },
  {
    name: "Export User Activity Logs",
    job_type: "export",
    status: "pending",
    config: { date_range: "last_30_days" },
    retry_count: 0,
    created_at: new Date(Date.now() - 3600000), // 1 hour ago
    updated_at: new Date(Date.now() - 3600000),
  },
  {
    name: "Analyze Sales Trends",
    job_type: "analyze",
    status: "processing",
    config: { period: "monthly", metrics: ["revenue", "units"] },
    retry_count: 0,
    created_at: new Date(Date.now() - 60000), // 1 minute ago
    updated_at: new Date(Date.now() - 30000),
  },
];

// Insert jobs
db.jobs.insertMany(jobs);

print(`Seeded ${jobs.length} jobs into the database.`);

// Show the jobs
print("\nSeeded jobs:");
db.jobs.find().forEach(job => {
  print(`  - ${job.name} (${job.status})`);
});
