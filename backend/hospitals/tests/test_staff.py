from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from core.models import WebsiteSetup
from hospitals.models import HospitalProfile, HospitalStaff, Appointment

User = get_user_model()

class HospitalStaffApiTests(APITestCase):
    def setUp(self):
        # Create a hospital owner
        self.owner = User.objects.create_user(
            username='hospital-owner-staff',
            email='staff-owner@example.com',
            password='Password123!',
            name='Staff Owner',
            business_type='hospital',
        )

        self.website_setup = WebsiteSetup.objects.create(user=self.owner, subdomain='staff-owner')
        self.hospital = HospitalProfile.objects.create(
            website_setup=self.website_setup,
            name='Staff Owner Hospital',
        )

        # Create another hospital owner to test isolation
        self.other_owner = User.objects.create_user(
            username='hospital-other-staff',
            email='other-owner@example.com',
            password='Password123!',
            name='Other Owner',
            business_type='hospital',
        )

        self.other_website_setup = WebsiteSetup.objects.create(user=self.other_owner, subdomain='other-owner')
        self.other_hospital = HospitalProfile.objects.create(
            website_setup=self.other_website_setup,
            name='Other Hospital',
        )

        # Staff endpoints
        self.staff_endpoint = '/api/hospital/admin/staff/'

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
            business_type='hospital',
        )
        HospitalStaff.objects.create(user=staff_user, hospital=self.hospital)

        response = self.client.get(self.staff_endpoint)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Staff One')
        self.assertEqual(response.data[0]['email'], 'staff1@example.com')
        self.assertEqual(response.data[0]['status'], 'Active')

    def test_list_staff_isolation(self):
        # Create staff for owner's hospital
        staff_user = User.objects.create_user(
            username='staff1@example.com',
            email='staff1@example.com',
            password='Password123!',
            name='Staff One',
            business_type='hospital',
        )
        HospitalStaff.objects.create(user=staff_user, hospital=self.hospital)

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
        staff = HospitalStaff.objects.get(id=response.data['id'])
        self.assertEqual(staff.user.name, 'New Employee')
        self.assertEqual(staff.hospital, self.hospital)
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
            business_type='hospital',
        )
        staff = HospitalStaff.objects.create(user=staff_user, hospital=self.hospital)

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
            business_type='hospital',
        )
        staff = HospitalStaff.objects.create(user=staff_user, hospital=self.hospital)

        detail_url = f"{self.staff_endpoint}{staff.id}/"
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(HospitalStaff.objects.filter(id=staff.id).exists())
        self.assertFalse(User.objects.filter(id=staff_user.id).exists())

    def test_staff_cannot_manage_staff(self):
        staff_user = User.objects.create_user(
            username='staff@example.com',
            email='staff@example.com',
            password='Password123!',
            name='Employee',
            business_type='hospital',
        )
        HospitalStaff.objects.create(user=staff_user, hospital=self.hospital)

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

    def test_staff_hospital_data_access(self):
        from hospitals.models import Department, Doctor
        import datetime
        from django.utils import timezone

        # Create department & doctor
        dept = Department.objects.create(website_setup=self.website_setup, name='Cardiology')
        doc = Doctor.objects.create(website_setup=self.website_setup, department=dept, name='Dr. Staff Test', specialty='Cardiologist')

        # Create a hospital staff member
        staff_user = User.objects.create_user(
            username='staff-test@example.com',
            email='staff-test@example.com',
            password='Password123!',
            name='Hospital Staff Employee',
            business_type='hospital',
        )
        HospitalStaff.objects.create(user=staff_user, hospital=self.hospital)

        # Authenticate as staff
        self.client.force_authenticate(user=staff_user)

        # 1. Fetch hospital profile
        response = self.client.get('/api/hospital/admin/profile/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Staff Owner Hospital')

        # 2. Fetch appointments
        start_dt = timezone.make_aware(datetime.datetime(2026, 7, 3, 10, 0))
        end_dt = timezone.make_aware(datetime.datetime(2026, 7, 3, 10, 30))

        Appointment.objects.create(
            website_setup=self.website_setup,
            doctor=doc,
            patient_name='Patient Alpha',
            patient_email='alpha@example.com',
            patient_phone='123456789',
            start_datetime=start_dt,
            end_datetime=end_dt,
            status='PENDING',
        )
        response = self.client.get('/api/hospital/admin/appointments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['patient_name'], 'Patient Alpha')
