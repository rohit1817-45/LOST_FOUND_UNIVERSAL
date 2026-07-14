"""Comprehensive backend API tests for ULFN."""
import requests
import sys
from datetime import datetime

BASE_URL = "https://reunite-lost-found.preview.emergentagent.com/api"

class ULFNTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.tokens = {}
        self.users = {}
        self.test_case_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, msg, level="INFO"):
        print(f"[{level}] {msg}")

    def test(self, name, method, endpoint, expected_status, data=None, headers=None, params=None):
        """Run a single API test."""
        url = f"{self.base_url}/{endpoint}"
        h = headers or {}
        h.setdefault('Content-Type', 'application/json')
        
        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=h, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=h, params=params, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=h, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=h, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - {name} (Status: {response.status_code})", "PASS")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ FAILED - {name} (Expected {expected_status}, got {response.status_code})", "FAIL")
                self.log(f"   Response: {response.text[:200]}", "FAIL")
                self.failed_tests.append({"test": name, "expected": expected_status, "got": response.status_code, "response": response.text[:200]})
                return False, {}

        except Exception as e:
            self.log(f"❌ FAILED - {name} (Error: {str(e)})", "FAIL")
            self.failed_tests.append({"test": name, "error": str(e)})
            return False, {}

    def auth_header(self, role):
        """Get Authorization header for a role."""
        token = self.tokens.get(role)
        if token:
            return {"Authorization": f"Bearer {token}"}
        return {}

    def test_health(self):
        """Test health endpoint."""
        self.log("\n=== Testing Health & Root ===")
        self.test("Health check", "GET", "health", 200)
        self.test("Root endpoint", "GET", "", 200)

    def test_auth(self):
        """Test authentication endpoints."""
        self.log("\n=== Testing Authentication ===")
        
        # Test login with demo accounts
        accounts = [
            ("demo@ulfn.app", "Demo1234!", "user"),
            ("ngo@ulfn.app", "Demo1234!", "ngo"),
            ("police@ulfn.app", "Demo1234!", "police"),
            ("admin@ulfn.app", "Demo1234!", "admin"),
        ]
        
        for email, password, role in accounts:
            success, resp = self.test(
                f"Login as {role}",
                "POST",
                "auth/login",
                200,
                data={"email": email, "password": password}
            )
            if success and "token" in resp:
                self.tokens[role] = resp["token"]
                self.users[role] = resp.get("user", {})
                self.log(f"   Stored token for {role}: {resp['token'][:20]}...")
            else:
                self.log(f"   Failed to get token for {role}", "ERROR")

        # Test /me endpoint for each role
        for role in ["user", "ngo", "police", "admin"]:
            if role in self.tokens:
                self.test(
                    f"Get /me as {role}",
                    "GET",
                    "auth/me",
                    200,
                    headers=self.auth_header(role)
                )

        # Test invalid login
        self.test(
            "Login with invalid credentials",
            "POST",
            "auth/login",
            401,
            data={"email": "invalid@test.com", "password": "wrong"}
        )

        # Test /me without auth
        self.test("Get /me without auth", "GET", "auth/me", 401)

    def test_cases_crud(self):
        """Test cases CRUD operations."""
        self.log("\n=== Testing Cases CRUD ===")
        
        # List cases (public)
        success, resp = self.test("List cases (public)", "GET", "cases", 200, params={"limit": 10})
        
        # Create a case as user
        case_data = {
            "type": "lost_pet",
            "name": "Buddy",
            "species": "dog",
            "breed": "Golden Retriever",
            "color": "golden",
            "age": "3 years",
            "gender": "male",
            "description": "Friendly golden retriever, responds to Buddy. Last seen near Central Park.",
            "last_seen_at": datetime.now().isoformat(),
            "location": {
                "lat": 37.7749,
                "lng": -122.4194,
                "address": "San Francisco, CA"
            },
            "photos": [],
            "contact_preference": "in_app",
            "priority": "normal"
        }
        
        success, resp = self.test(
            "Create lost pet case",
            "POST",
            "cases",
            200,
            data=case_data,
            headers=self.auth_header("user")
        )
        
        if success and "case" in resp:
            self.test_case_id = resp["case"]["case_id"]
            self.log(f"   Created case: {self.test_case_id}")
        
        # Get case detail
        if self.test_case_id:
            self.test(
                "Get case detail",
                "GET",
                f"cases/{self.test_case_id}",
                200
            )
        
        # Get my cases
        self.test(
            "Get my cases",
            "GET",
            "cases/mine",
            200,
            headers=self.auth_header("user")
        )

    def test_cases_search(self):
        """Test cases search and filtering."""
        self.log("\n=== Testing Cases Search & Filtering ===")
        
        # Search by text
        self.test(
            "Search cases by text (golden)",
            "GET",
            "cases",
            200,
            params={"q": "golden", "limit": 20}
        )
        
        # Filter by type
        self.test(
            "Filter by type (lost_pet,found_pet)",
            "GET",
            "cases",
            200,
            params={"type": "lost_pet,found_pet", "limit": 10}
        )
        
        # Radius search
        self.test(
            "Radius search (SF area)",
            "GET",
            "cases",
            200,
            params={"lat": 37.77, "lng": -122.42, "radius_km": 25, "limit": 20}
        )
        
        # Combined search
        self.test(
            "Combined search (text + type)",
            "GET",
            "cases",
            200,
            params={"q": "dog", "type": "lost_pet", "limit": 20}
        )

    def test_matching(self):
        """Test matching engine."""
        self.log("\n=== Testing Matching Engine ===")
        
        if self.test_case_id:
            # Recompute matches
            self.test(
                "Recompute matches",
                "POST",
                f"cases/{self.test_case_id}/rematch",
                200,
                headers=self.auth_header("user")
            )

    def test_case_assignment(self):
        """Test case assignment for NGO/Police."""
        self.log("\n=== Testing Case Assignment ===")
        
        if self.test_case_id:
            # NGO accepts a pet case
            self.test(
                "NGO accepts pet case",
                "POST",
                f"cases/{self.test_case_id}/assign",
                200,
                params={"kind": "ngo"},
                headers=self.auth_header("ngo")
            )

    def test_messaging(self):
        """Test messaging endpoints."""
        self.log("\n=== Testing Messaging ===")
        
        # Get conversations
        self.test(
            "List conversations",
            "GET",
            "conversations",
            200,
            headers=self.auth_header("user")
        )
        
        # Send a message (requires to_user_id)
        if "admin" in self.users:
            admin_id = self.users["admin"].get("user_id")
            if admin_id:
                success, resp = self.test(
                    "Send message to admin",
                    "POST",
                    "messages",
                    200,
                    data={
                        "to_user_id": admin_id,
                        "case_id": self.test_case_id,
                        "text": "Test message from automated testing"
                    },
                    headers=self.auth_header("user")
                )

    def test_notifications(self):
        """Test notifications endpoints."""
        self.log("\n=== Testing Notifications ===")
        
        # List notifications
        self.test(
            "List notifications",
            "GET",
            "notifications",
            200,
            headers=self.auth_header("user")
        )
        
        # Mark all as read
        self.test(
            "Mark all notifications as read",
            "POST",
            "notifications/read-all",
            200,
            headers=self.auth_header("user")
        )

    def test_bookmarks(self):
        """Test bookmarks."""
        self.log("\n=== Testing Bookmarks ===")
        
        if self.test_case_id:
            # Bookmark a case
            self.test(
                "Bookmark case",
                "POST",
                f"bookmarks/{self.test_case_id}",
                200,
                headers=self.auth_header("user")
            )
            
            # List bookmarks
            self.test(
                "List bookmarks",
                "GET",
                "bookmarks",
                200,
                headers=self.auth_header("user")
            )

    def test_verification(self):
        """Test verification application flow."""
        self.log("\n=== Testing Verification Flow ===")
        
        # Get my verification requests
        self.test(
            "Get my verification requests",
            "GET",
            "verifications/mine",
            200,
            headers=self.auth_header("user")
        )

    def test_ngo_queue(self):
        """Test NGO queue endpoints."""
        self.log("\n=== Testing NGO Queue ===")
        
        self.test(
            "Get NGO queue",
            "GET",
            "ngo/queue",
            200,
            headers=self.auth_header("ngo")
        )

    def test_police_queue(self):
        """Test Police queue endpoints."""
        self.log("\n=== Testing Police Queue ===")
        
        self.test(
            "Get Police queue",
            "GET",
            "police/queue",
            200,
            headers=self.auth_header("police")
        )

    def test_admin_endpoints(self):
        """Test admin endpoints."""
        self.log("\n=== Testing Admin Endpoints ===")
        
        # Get stats
        self.test(
            "Get admin stats",
            "GET",
            "admin/stats",
            200,
            headers=self.auth_header("admin")
        )
        
        # List users
        self.test(
            "List users",
            "GET",
            "admin/users",
            200,
            headers=self.auth_header("admin")
        )
        
        # List cases
        self.test(
            "List admin cases",
            "GET",
            "admin/cases",
            200,
            headers=self.auth_header("admin")
        )
        
        # List verifications
        self.test(
            "List verification requests",
            "GET",
            "admin/verifications",
            200,
            params={"status": "pending"},
            headers=self.auth_header("admin")
        )
        
        # Get audit logs
        self.test(
            "Get audit logs",
            "GET",
            "admin/audit",
            200,
            params={"limit": 50},
            headers=self.auth_header("admin")
        )
        
        # Test admin-only access (user should get 403)
        self.test(
            "Admin stats with user token (should fail)",
            "GET",
            "admin/stats",
            403,
            headers=self.auth_header("user")
        )

    def run_all_tests(self):
        """Run all tests in sequence."""
        self.log("=" * 60)
        self.log("ULFN Backend API Testing")
        self.log(f"Base URL: {self.base_url}")
        self.log("=" * 60)
        
        try:
            self.test_health()
            self.test_auth()
            self.test_cases_crud()
            self.test_cases_search()
            self.test_matching()
            self.test_case_assignment()
            self.test_messaging()
            self.test_notifications()
            self.test_bookmarks()
            self.test_verification()
            self.test_ngo_queue()
            self.test_police_queue()
            self.test_admin_endpoints()
        except Exception as e:
            self.log(f"Test suite error: {str(e)}", "ERROR")
        
        # Print summary
        self.log("\n" + "=" * 60)
        self.log("TEST SUMMARY")
        self.log("=" * 60)
        self.log(f"Total tests: {self.tests_run}")
        self.log(f"Passed: {self.tests_passed}")
        self.log(f"Failed: {self.tests_run - self.tests_passed}")
        self.log(f"Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        if self.failed_tests:
            self.log("\n=== Failed Tests ===")
            for ft in self.failed_tests:
                self.log(f"  - {ft.get('test', 'Unknown')}: {ft}")
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    tester = ULFNTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())
