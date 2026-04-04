#!/usr/bin/env bash

# Integration Test: Tenant Provisioning API
# Tests the full flow of creating a tenant and checking provisioning

set -e

API_URL="${API_URL:-http://localhost:3000}"
ADMIN_TOKEN="${ADMIN_TOKEN:-test-token}"

echo "🧪 Integration Test: Tenant Provisioning API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Note: These tests assume:
# 1. The API server is running on localhost:3000
# 2. Admin authentication is properly configured
# 3. Database migrations have been applied

echo "ℹ️  API_URL: $API_URL"
echo "ℹ️  Make sure the dev server is running: pnpm dev"
echo ""
echo "Tests:"
echo "  1. Create a test tenant via POST /api/admin/tenants"
echo "  2. Verify feature flags were created"
echo "  3. Verify template pages were provisioned"
echo "  4. Test feature flag toggle via POST /api/admin/feature-flags/toggle"
echo "  5. Verify pages become hidden when feature is disabled"
echo ""

echo "⚠️  NOTE: This is a manual integration test guide."
echo "     Run the dev server first: pnpm dev"
echo "     Then make requests like:"
echo ""
echo "     # Create tenant:"
echo "     curl -X POST $API_URL/api/admin/tenants \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"name\": \"Test\", \"domain\": \"test.local\", \"plan\": \"starter\"}'"
echo ""
echo "     # Get feature flags:"
echo "     curl $API_URL/api/admin/feature-flags?tenant_id=1"
echo ""
echo "     # Toggle feature:"
echo "     curl -X POST $API_URL/api/admin/feature-flags/toggle \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"tenant_id\": 1, \"feature_key\": \"contact_form\", \"enabled\": false}'"
echo ""
