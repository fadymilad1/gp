from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from core.models import WebsiteSetup
from pharmacies.models import Pharmacy, PharmacyOrder, PharmacyStaff

User = get_user_model()

class PharmacyStaffApiTests(APITestCase):
    def setUp(self):
        # Create a pharmacy owner
        self.owner = User.objects.create_user(
            username='pharmacy-owner-staff',
            email='staff-owner@example.com',
            password='Password123!',
            name='Staff Owner',
            business_type='pharmacy',
        )

        self.website_setup = WebsiteSetup.objects.create(user=self.owner, subdomain='staff-owner')
        self.pharmacy = Pharmacy.objects.create(
            user=self.owner,
            website_setup=self.website_setup,
            name='Staff Owner Pharmacy',
            template_id=1,
        )

        # Create another pharmacy owner to test isolation
        self.other_owner = User.objects.create_user(
            username='pharmacy-other-staff',
            email='other-owner@example.com',
            password='Password123!',
            name='Other Owner',
            business_type='pharmacy',
        )

        self.other_website_setup = WebsiteSetup.objects.create(user=self.other_owner, subdomain='other-owner')
        self.other_pharmacy = Pharmacy.objects.create(
            user=self.other_owner,
            website_setup=self.other_website_setup,
            name='Other Pharmacy',
            template_id=1,
        )

        # Staff endpoints
        self.staff_endpoint = '/api/pharmacy/staff/'

    def test_list_staff_requires_auth(self):
        response = self.client.get(self.staff_endpoint)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_staff_as_owner(self):
        self.client.force_authenticate(user=self.owner)
        
        # Create a staff member manually
        staff_user = User.objects.create_user(
            username='staff1@example.com',
            email='staff1@example.com',
            password='Password123!',
            name='Staff One',
            business_type='pharmacy',
        )
        PharmacyStaff.objects.create(user=staff_user, pharmacy=self.pharmacy)

        response = self.client.get(self.staff_endpoint)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Staff One')
        self.assertEqual(response.data[0]['email'], 'staff1@example.com')
        self.assertEqual(response.data[0]['status'], 'Active')

    def test_list_staff_isolation(self):
        # Create staff for owner's pharmacy
        staff_user = User.objects.create_user(
            username='staff1@example.com',
            email='staff1@example.com',
            password='Password123!',
            name='Staff One',
            business_type='pharmacy',
        )
        PharmacyStaff.objects.create(user=staff_user, pharmacy=self.pharmacy)

        # Authenticate as other owner - should not see owner's staff
        self.client.force_authenticate(user=self.other_owner)
        response = self.client.get(self.staff_endpoint)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_create_staff_success(self):
        self.client.force_authenticate(user=self.owner)
        payload = {
            'name': 'New Employee',
            'email': 'new_employee@example.com',
            'password': 'Password123!',
            'is_active': True
        }
        response = self.client.post(self.staff_endpoint, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Employee')
        self.assertEqual(response.data['email'], 'new_employee@example.com')
        self.assertTrue(response.data['is_active'])

        # Verify DB records
        staff = PharmacyStaff.objects.get(id=response.data['id'])
        self.assertEqual(staff.user.name, 'New Employee')
        self.assertEqual(staff.pharmacy, self.pharmacy)
        self.assertTrue(staff.user.check_password('Password123!'))

    def test_create_staff_duplicate_email(self):
        self.client.force_authenticate(user=self.owner)
        
        # Create one staff member first
        payload = {
            'name': 'Employee One',
            'email': 'duplicate@example.com',
            'password': 'Password123!',
            'is_active': True
        }
        self.client.post(self.staff_endpoint, payload)

        # Try creating another with the same email
        response = self.client.post(self.staff_endpoint, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_update_staff_details(self):
        self.client.force_authenticate(user=self.owner)
        
        # Create staff
        staff_user = User.objects.create_user(
            username='staff@example.com',
            email='staff@example.com',
            password='Password123!',
            name='Original Name',
            business_type='pharmacy',
        )
        staff = PharmacyStaff.objects.create(user=staff_user, pharmacy=self.pharmacy)

        # Update details
        detail_url = f"{self.staff_endpoint}{staff.id}/"
        payload = {
            'name': 'Updated Name',
            'email': 'updated@example.com',
            'is_active': False
        }
        response = self.client.patch(detail_url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        staff.user.refresh_from_db()
        self.assertEqual(staff.user.name, 'Updated Name')
        self.assertEqual(staff.user.email, 'updated@example.com')
        self.assertFalse(staff.user.is_active)

    def test_delete_staff(self):
        self.client.force_authenticate(user=self.owner)
        
        staff_user = User.objects.create_user(
            username='staff@example.com',
            email='staff@example.com',
            password='Password123!',
            name='Delete Me',
            business_type='pharmacy',
        )
        staff = PharmacyStaff.objects.create(user=staff_user, pharmacy=self.pharmacy)

        detail_url = f"{self.staff_endpoint}{staff.id}/"
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PharmacyStaff.objects.filter(id=staff.id).exists())
        self.assertFalse(User.objects.filter(id=staff_user.id).exists())

    def test_staff_cannot_manage_staff(self):
        staff_user = User.objects.create_user(
            username='staff@example.com',
            email='staff@example.com',
            password='Password123!',
            name='Employee',
            business_type='pharmacy',
        )
        PharmacyStaff.objects.create(user=staff_user, pharmacy=self.pharmacy)

        self.client.force_authenticate(user=staff_user)
        
        # Try getting staff list
        response = self.client.get(self.staff_endpoint)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Try creating staff
        payload = {
            'name': 'Forbidden',
            'email': 'forbidden@example.com',
            'password': 'Password123!'
        }
        response = self.client.post(self.staff_endpoint, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_orders_access(self):
        # Create staff user
        staff_user = User.objects.create_user(
            username='staff@example.com',
            email='staff@example.com',
            password='Password123!',
            name='Employee',
            business_type='pharmacy',
        )
        PharmacyStaff.objects.create(user=staff_user, pharmacy=self.pharmacy)

        # Create orders for owner's pharmacy
        order = PharmacyOrder.objects.create(
            pharmacy=self.pharmacy,
            website_setup=self.website_setup,
            order_number='ORD-999',
            patient_name='Patient Test',
            patient_email='test@example.com',
            patient_phone='123',
            delivery_method='pickup',
            payment_method='cash',
            status='pending',
            total=100.00
        )

        # Authenticate as staff
        self.client.force_authenticate(user=staff_user)
        
        # Verify staff user can fetch orders of their pharmacy
        response = self.client.get('/api/pharmacy/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['order_number'], 'ORD-999')
