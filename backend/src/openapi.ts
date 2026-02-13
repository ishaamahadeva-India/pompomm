/**
 * OpenAPI 3.0 contract for the Poolmarket API.
 * Served at GET /openapi.json for tooling and documentation.
 */
export const openApiSpec = {
  openapi: "3.0.3",
  info: { title: "Poolmarket API", version: "1.0.0", description: "Creator performance and distribution platform API." },
  servers: [{ url: "/", description: "API root" }],
  paths: {
    "/health": {
      get: { summary: "Health check", responses: { 200: { description: "OK", content: { "application/json": { schema: { type: "object", properties: { status: {}, ts: {} } } } } } } },
    },
    "/auth/login": {
      post: {
        summary: "Login (mobile + OTP demo)",
        requestBody: { content: { "application/json": { schema: { type: "object", required: ["mobile_number"], properties: { mobile_number: { type: "string" }, otp: { type: "string" }, device_hash: { type: "string" } } } } } },
        responses: { 200: { description: "Returns user, accessToken, refreshToken, expiresIn" }, 400: { description: "Invalid input" } },
      },
    },
    "/auth/refresh": {
      post: {
        summary: "Refresh access token",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { refreshToken: { type: "string" } } } } } },
        responses: { 200: { description: "New accessToken, refreshToken, expiresIn" }, 401: { description: "Invalid or expired refresh token" } },
      },
    },
    "/auth/me": {
      get: { summary: "Current user profile", security: [{ bearerAuth: [] }], responses: { 200: { description: "User profile" }, 401: { description: "Not logged in" } } },
      patch: { summary: "Update profile", security: [{ bearerAuth: [] }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { display_name: {}, unique_creator_id: {}, bio: {}, email: {} } } } } }, responses: { 200: { description: "Updated" }, 400: { description: "Invalid data" } } },
    },
    "/campaigns": {
      get: { summary: "List campaigns", parameters: [{ name: "status", in: "query", schema: { type: "string" } }, { name: "category", in: "query", schema: { type: "string" } }], responses: { 200: { description: "List of campaigns" } } },
    },
    "/distribution/campaigns": {
      get: { summary: "List active distribution campaigns (public)", parameters: [{ name: "status", in: "query", schema: { type: "string", default: "active" } }], responses: { 200: { description: "campaigns array" } } },
    },
    "/distribution/campaigns/{id}": {
      get: { summary: "Get distribution campaign by id", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { 200: { description: "Campaign" }, 404: { description: "Not found" } } },
    },
    "/leaderboard/{campaignId}": {
      get: { summary: "Leaderboard for campaign", parameters: [{ name: "campaignId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { 200: { description: "entries, currentUserRank" } } },
    },
    "/admin/overview": {
      get: { summary: "Admin dashboard metrics", security: [{ bearerAuth: [] }], responses: { 200: { description: "total_users, revenue_summary, etc." }, 403: { description: "Admin required" } } },
    },
    "/admin/users": {
      get: { summary: "List users (admin)", security: [{ bearerAuth: [] }], parameters: [{ name: "search", in: "query", schema: { type: "string" } }], responses: { 200: { description: "users array" } } },
    },
    "/admin/users/{id}": {
      get: { summary: "User detail + CRS + tier history", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { 200: { description: "user, crs, tier_history" }, 404: { description: "Not found" } } },
    },
    "/admin/distribution/campaigns": {
      get: { summary: "List all distribution campaigns (admin)", security: [{ bearerAuth: [] }], responses: { 200: { description: "campaigns" } } },
      post: { summary: "Create distribution campaign", security: [{ bearerAuth: [] }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { title: {}, description: {}, sponsor_name: {}, total_budget: {}, payout_model: {}, start_time: {}, end_time: {} } } } } }, responses: { 201: { description: "Created campaign" } } },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
};
