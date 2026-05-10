// ⚠️  DEMO FILE - Intentional security violations for presentation
// This file demonstrates what Gitleaks catches in the PR validation pipeline

const config = {
  // ❌ VIOLATION: Hardcoded database credentials (Gitleaks: generic-password)
  database: {
    host: "cluster0.mongodb.net",
    username: "freshbonds_admin",
    password: "SuperSecret123!",
    uri: "mongodb+srv://freshbonds_admin:SuperSecret123!@cluster0.mongodb.net/freshbonds",
  },

  // ❌ VIOLATION: Hardcoded JWT secret (Gitleaks: jwt)
  auth: {
    jwtSecret: "my-super-secret-jwt-key-do-not-share",
    jwtExpiry: "24h",
  },

  // ❌ VIOLATION: Hardcoded API key (Gitleaks: generic-api-key)
  payment: {
    apiKey: "sk_live_4242424242424242",
    webhookSecret: "whsec_abcdef1234567890",
  },

  // ✅ Correct approach (for comparison in presentation)
  // database: {
  //   uri: process.env.MONGODB_URI,
  // },
  // auth: {
  //   jwtSecret: process.env.JWT_SECRET,
  // },
};

module.exports = config;
