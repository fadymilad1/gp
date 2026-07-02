import random
from locust import HttpUser, task, between

class MedifyPerformanceUser(HttpUser):
    # Simulated users wait between 1 to 3 seconds between actions
    wait_time = between(1, 3)

    @task(3)
    def view_homepage(self):
        """Simulate loading the main entry page."""
        self.client.get("/")

    @task(2)
    def view_hospital_pages(self):
        """Simulate fetching hospital dynamic pages (using a fallback subdomain)."""
        self.client.get("/api/hospital/public/pages/?subdomain=elahlyhospital")

    @task(2)
    def view_hospital_doctors(self):
        """Simulate loading the doctor roster."""
        self.client.get("/api/hospital/public/doctors/?subdomain=elahlyhospital")

    @task(2)
    def view_pharmacy_products(self):
        """Simulate browsing pharmacy catalog products (using a fallback owner)."""
        self.client.get("/api/pharmacy/products/public/?owner_id=a2f29550-1e61-4105-b43a-5a3ba29f6f30")

    @task(1)
    def chatbot_query(self):
        """Simulate sending a symptom query to the RAG chatbot endpoint."""
        self.client.post("/api/chatbot/", json={
            "message": "What are the common side effects of Metformin?",
            "subdomain": "markpharmacy"
        })
