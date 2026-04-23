# ============================================
# CARGOBIT SECURITY GATEWAY - LOCUST LOAD TESTS
# Version: 1.0 - Production-Ready
# ============================================

from locust import HttpUser, task, between, events
from locust.runners import MasterRunner, WorkerRunner
import json
import random
import uuid
import time
from datetime import datetime

# ============================================
# CONFIGURATION
# ============================================

BASE_URL = "http://localhost:3004"
API_KEY = "test-api-key"

# Test Data
TEST_USERS = {
    "green": {"id": "u_1001", "role": "SHIPPER_COMPANY", "companyId": "c_2001"},
    "yellow": {"id": "u_1002", "role": "SHIPPER_COMPANY", "companyId": "c_2002"},
    "red": {"id": "u_1003", "role": "SHIPPER_COMPANY", "companyId": "c_2003"},
    "admin": {"id": "admin-001", "role": "ADMIN"},
    "support": {"id": "support-001", "role": "SUPPORT"},
    "driver": {"id": "driver-001", "role": "DRIVER_SELF_EMPLOYED"},
    "dispatcher": {"id": "dispatcher-001", "role": "DISPATCHER"},
}

TEST_ENTITIES = {
    "green": {
        "type": "transaction",
        "id": "tx_3001",
        "context": {"amount": 1200, "international": False, "iban_age_hours": 240}
    },
    "yellow": {
        "type": "transaction",
        "id": "tx_3002",
        "context": {"amount": 18000, "iban_age_hours": 12, "payout_method": "SEPA"}
    },
    "red": {
        "type": "transaction",
        "id": "tx_3003",
        "context": {"amount": 52000, "international": True, "hazmat": False, "iban_age_hours": 6}
    },
}

ACTIONS = [
    "ACCEPT_OFFER",
    "CREATE_TRANSPORT",
    "INITIATE_PAYOUT",
    "VIEW_WALLET",
    "ASSIGN_DRIVER",
    "UPDATE_STATUS",
]

# ============================================
# HELPER FUNCTIONS
# ============================================

def generate_request_id():
    return f"req-{uuid.uuid4().hex[:8]}-{int(time.time() * 1000)}"

def build_payload(risk_case="green", action="ACCEPT_OFFER"):
    user = TEST_USERS.get(risk_case, TEST_USERS["green"])
    entity = TEST_ENTITIES.get(risk_case, TEST_ENTITIES["green"])
    
    return {
        "requestId": generate_request_id(),
        "user": user,
        "action": action,
        "entity": entity,
    }

def get_headers():
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    }

# ============================================
# CUSTOM METRICS (via event handlers)
# ============================================

decision_counts = {
    "allowed": 0,
    "allowed_with_mitigation": 0,
    "blocked": 0,
    "permission_denied": 0,
}

@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    """Track custom metrics on each request"""
    if exception:
        return
    
    # Parse response and track decisions
    try:
        if hasattr(kwargs.get('response', {}), 'json'):
            body = kwargs['response'].json()
            decision = body.get('decision')
            if decision in decision_counts:
                decision_counts[decision] += 1
    except:
        pass

# ============================================
# USER CLASS 1: BASIC LOAD TEST
# ============================================

class SecurityGatewayUser(HttpUser):
    """Basic load test user - simulates normal traffic"""
    
    host = BASE_URL
    wait_time = between(1, 2)
    
    @task(10)
    def security_check_green(self):
        """70% green cases"""
        payload = build_payload("green", "ACCEPT_OFFER")
        self.client.post(
            "/api/security/check",
            json=payload,
            headers=get_headers(),
            name="/security/check [green]",
        )
    
    @task(3)
    def security_check_yellow(self):
        """20% yellow cases"""
        payload = build_payload("yellow", "INITIATE_PAYOUT")
        self.client.post(
            "/api/security/check",
            json=payload,
            headers=get_headers(),
            name="/security/check [yellow]",
        )
    
    @task(1)
    def security_check_red(self):
        """10% red cases"""
        payload = build_payload("red", "INITIATE_PAYOUT")
        self.client.post(
            "/api/security/check",
            json=payload,
            headers=get_headers(),
            name="/security/check [red]",
        )

# ============================================
# USER CLASS 2: MIXED TRAFFIC
# ============================================

class MixedTrafficUser(HttpUser):
    """Mixed traffic with various actions and risk levels"""
    
    host = BASE_URL
    wait_time = between(0.5, 1.5)
    
    @task
    def mixed_security_check(self):
        """Random mix of risk cases and actions"""
        risk_case = random.choices(
            ["green", "yellow", "red"],
            weights=[70, 20, 10]
        )[0]
        
        action = random.choice(ACTIONS)
        payload = build_payload(risk_case, action)
        
        self.client.post(
            "/api/security/check",
            json=payload,
            headers=get_headers(),
            name=f"/security/check [{risk_case}]",
        )

# ============================================
# USER CLASS 3: RED SPIKE (FRAUD WAVE)
# ============================================

class RedSpikeUser(HttpUser):
    """Simulates a fraud wave with high-risk cases"""
    
    host = BASE_URL
    wait_time = between(0.1, 0.3)
    
    @task
    def red_case_burst(self):
        """Burst of red cases"""
        payload = build_payload("red", "INITIATE_PAYOUT")
        # Randomize entity ID to avoid cache
        payload["entity"]["id"] = f"tx_red_{uuid.uuid4().hex[:8]}"
        
        self.client.post(
            "/api/security/check",
            json=payload,
            headers=get_headers(),
            name="/security/check [red-spike]",
        )

# ============================================
# USER CLASS 4: PERMISSION DENIED FLOW
# ============================================

class PermissionDeniedUser(HttpUser):
    """Tests permission denial scenarios"""
    
    host = BASE_URL
    wait_time = between(0.5, 1)
    
    @task(3)
    def driver_payout_attempt(self):
        """Driver trying to initiate payout (denied)"""
        payload = {
            "requestId": generate_request_id(),
            "user": TEST_USERS["driver"],
            "action": "INITIATE_PAYOUT",
            "entity": TEST_ENTITIES["green"],
        }
        
        self.client.post(
            "/api/security/check",
            json=payload,
            headers=get_headers(),
            name="/security/check [permission-denied]",
        )
    
    @task(1)
    def shipper_assign_driver_attempt(self):
        """Shipper trying to assign driver (denied)"""
        payload = {
            "requestId": generate_request_id(),
            "user": TEST_USERS["green"],
            "action": "ASSIGN_DRIVER",
            "entity": TEST_ENTITIES["green"],
        }
        
        self.client.post(
            "/api/security/check",
            json=payload,
            headers=get_headers(),
            name="/security/check [permission-denied]",
        )

# ============================================
# USER CLASS 5: ADMIN OPERATIONS
# ============================================

class AdminUser(HttpUser):
    """Admin operations: risk overrides, permission validation"""
    
    host = BASE_URL
    wait_time = between(2, 5)
    
    @task(3)
    def risk_override(self):
        """Admin risk override"""
        payload = {
            "entityType": "user",
            "entityId": f"u_{random.randint(1000, 9999)}",
            "newLevel": random.choice(["green", "yellow"]),
            "newScore": random.randint(10, 50),
            "reason": "Load test admin override",
            "actorId": "admin-001",
        }
        
        self.client.post(
            "/api/security/risk/override",
            json=payload,
            headers=get_headers(),
            name="/security/risk/override",
        )
    
    @task(2)
    def get_risk_status(self):
        """Get risk status for entity"""
        entity_id = random.choice(["u_1001", "u_1002", "u_1003", "c_2001"])
        
        self.client.get(
            f"/api/security/risk/user/{entity_id}",
            headers=get_headers(),
            name="/security/risk/[entity]",
        )
    
    @task(1)
    def health_check(self):
        """Health check endpoint"""
        self.client.get(
            "/api/security/health",
            name="/security/health",
        )

# ============================================
# USER CLASS 6: MITIGATION TESTING
# ============================================

class MitigationUser(HttpUser):
    """Tests mitigation application and verification"""
    
    host = BASE_URL
    wait_time = between(1, 2)
    
    @task(3)
    def apply_delay_mitigation(self):
        """Apply delay mitigation"""
        payload = {
            "entityType": "transaction",
            "entityId": f"tx_delay_{uuid.uuid4().hex[:8]}",
            "action": "INITIATE_PAYOUT",
            "mitigationType": "delay",
            "context": {
                "delayMinutes": 1440,
                "userId": "u_1002",
            },
        }
        
        self.client.post(
            "/api/security/mitigation/apply",
            json=payload,
            headers=get_headers(),
            name="/security/mitigation/apply [delay]",
        )
    
    @task(2)
    def apply_2fa_mitigation(self):
        """Apply 2FA mitigation"""
        payload = {
            "entityType": "transaction",
            "entityId": f"tx_2fa_{uuid.uuid4().hex[:8]}",
            "action": "ACCEPT_OFFER",
            "mitigationType": "2fa",
            "context": {
                "userId": "u_1002",
                "userPhone": "+491234567890",
            },
        }
        
        self.client.post(
            "/api/security/mitigation/apply",
            json=payload,
            headers=get_headers(),
            name="/security/mitigation/apply [2fa]",
        )
    
    @task(1)
    def apply_gps_mitigation(self):
        """Apply GPS check mitigation"""
        payload = {
            "entityType": "transaction",
            "entityId": f"tx_gps_{uuid.uuid4().hex[:8]}",
            "action": "UPDATE_STATUS",
            "mitigationType": "gps_check",
            "context": {
                "expectedGps": {"lat": 52.5200, "lng": 13.4050},
            },
        }
        
        self.client.post(
            "/api/security/mitigation/apply",
            json=payload,
            headers=get_headers(),
            name="/security/mitigation/apply [gps]",
        )

# ============================================
# USER CLASS 7: CHAOS / ERROR HANDLING
# ============================================

class ChaosUser(HttpUser):
    """Sends malformed requests to test error handling"""
    
    host = BASE_URL
    wait_time = between(0.5, 1)
    
    @task(3)
    def missing_entity(self):
        """Request with missing entity"""
        payload = {
            "requestId": generate_request_id(),
            "user": TEST_USERS["green"],
            "action": "ACCEPT_OFFER",
            # entity missing
        }
        
        self.client.post(
            "/api/security/check",
            json=payload,
            headers=get_headers(),
            name="/security/check [chaos-missing-entity]",
        )
    
    @task(2)
    def invalid_action(self):
        """Request with invalid action"""
        payload = {
            "requestId": generate_request_id(),
            "user": TEST_USERS["green"],
            "action": "INVALID_ACTION",
            "entity": TEST_ENTITIES["green"],
        }
        
        self.client.post(
            "/api/security/check",
            json=payload,
            headers=get_headers(),
            name="/security/check [chaos-invalid-action]",
        )
    
    @task(1)
    def invalid_role(self):
        """Request with invalid role"""
        payload = {
            "requestId": generate_request_id(),
            "user": {"id": "u_chaos", "role": "INVALID_ROLE"},
            "action": "ACCEPT_OFFER",
            "entity": TEST_ENTITIES["green"],
        }
        
        self.client.post(
            "/api/security/check",
            json=payload,
            headers=get_headers(),
            name="/security/check [chaos-invalid-role]",
        )

# ============================================
# USER CLASS 8: SOAK TEST (LONG DURATION)
# ============================================

class SoakTestUser(HttpUser):
    """Long duration soak test with realistic distribution"""
    
    host = BASE_URL
    wait_time = between(1, 3)
    
    def on_start(self):
        """Initialize user session"""
        self.request_count = 0
    
    @task
    def realistic_traffic(self):
        """Realistic traffic distribution"""
        self.request_count += 1
        
        # 70% green, 20% yellow, 10% red
        risk_case = random.choices(
            ["green", "yellow", "red"],
            weights=[70, 20, 10]
        )[0]
        
        # Vary actions based on risk case
        if risk_case == "green":
            actions = ["ACCEPT_OFFER", "CREATE_TRANSPORT", "VIEW_WALLET"]
        elif risk_case == "yellow":
            actions = ["INITIATE_PAYOUT", "ACCEPT_OFFER"]
        else:
            actions = ["INITIATE_PAYOUT", "ACCEPT_OFFER"]
        
        action = random.choice(actions)
        payload = build_payload(risk_case, action)
        
        # Add unique entity ID for red cases
        if risk_case == "red":
            payload["entity"]["id"] = f"tx_soak_{self.request_count}_{uuid.uuid4().hex[:6]}"
        
        self.client.post(
            "/api/security/check",
            json=payload,
            headers=get_headers(),
            name=f"/security/check [soak-{risk_case}]",
        )
