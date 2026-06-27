import os
import datetime
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from core.models import WebsiteSetup
from hospitals.models import HospitalProfile, Department, Doctor, DoctorSchedule, Appointment
from pharmacies.models import Pharmacy, Product

User = get_user_model()


class UserAuthTests(APITestCase):
    """
    Unit tests for User Authentication endpoints.
    """

    def setUp(self):
        self.signup_url = reverse('signup')
        self.login_url = reverse('login')
        self.me_url = reverse('get_current_user')
        self.delete_url = reverse('delete_account')
        
        self.user_data = {
            'email': 'testuser@example.com',
            'password': 'SecurePassword123!',
            'password_confirm': 'SecurePassword123!',
            'name': 'Test User',
            'business_type': 'hospital'
        }

    def test_signup_success(self):
        """Test registering a user successfully."""
        response = self.client.post(self.signup_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertIn('tokens', response.data)
        self.assertEqual(response.data['user']['email'], self.user_data['email'])
        
        # Verify a website setup was automatically created
        user = User.objects.get(email=self.user_data['email'])
        self.assertTrue(WebsiteSetup.objects.filter(user=user).exists())

    def test_signup_password_mismatch(self):
        """Test signup fails when password and confirmation mismatch."""
        data = self.user_data.copy()
        data['password_confirm'] = 'DifferentPassword123!'
        response = self.client.post(self.signup_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_login_success(self):
        """Test logging in an existing user."""
        # Pre-register user
        user = User.objects.create_user(
            username=self.user_data['email'],
            email=self.user_data['email'],
            password=self.user_data['password'],
            name=self.user_data['name'],
            business_type=self.user_data['business_type']
        )
        
        payload = {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])

    def test_login_invalid_credentials(self):
        """Test login fails with incorrect credentials."""
        payload = {
            'email': 'wrong@example.com',
            'password': 'wrongpassword'
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_current_user_authenticated(self):
        """Test getting details of current authenticated user."""
        user = User.objects.create_user(
            username=self.user_data['email'],
            email=self.user_data['email'],
            password=self.user_data['password'],
            name=self.user_data['name'],
            business_type=self.user_data['business_type']
        )
        self.client.force_authenticate(user=user)
        
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], user.email)

    def test_get_current_user_unauthenticated(self):
        """Test getting current user fails when not logged in."""
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_account_success(self):
        """Test permanent user account deletion."""
        user = User.objects.create_user(
            username=self.user_data['email'],
            email=self.user_data['email'],
            password=self.user_data['password'],
            name=self.user_data['name'],
            business_type=self.user_data['business_type']
        )
        self.client.force_authenticate(user=user)
        
        payload = {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
            'confirmation_text': 'DELETE'
        }
        response = self.client.post(self.delete_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(User.objects.filter(email=self.user_data['email']).exists())


class HospitalBookingTests(APITestCase):
    """
    Unit tests for Hospital Scheduling and Appointment Booking APIs.
    """

    def setUp(self):
        # Create user & setup
        self.user = User.objects.create_user(
            username='hospitaladmin@example.com',
            email='hospitaladmin@example.com',
            password='password123',
            name='Hospital Admin',
            business_type='hospital'
        )
        self.website_setup = WebsiteSetup.objects.create(
            user=self.user,
            subdomain='test-hospital'
        )
        self.profile = HospitalProfile.objects.create(
            website_setup=self.website_setup,
            name='Test Hospital'
        )
        self.department = Department.objects.create(
            website_setup=self.website_setup,
            name='Pediatrics'
        )
        self.doctor = Doctor.objects.create(
            website_setup=self.website_setup,
            department=self.department,
            name='Dr. Allison',
            specialty='Child Care',
            is_active=True
        )

        # Create doctor schedule for today (0=Sun..6=Sat mapping)
        from django.utils import timezone
        self.today = timezone.now().date()
        self.weekday = (self.today.weekday() + 1) % 7
        self.schedule = DoctorSchedule.objects.create(
            doctor=self.doctor,
            day_of_week=self.weekday,
            start_time='09:00:00',
            end_time='11:00:00',
            slot_duration_minutes=30
        )
        
        self.slots_url = reverse('hospital-booking-available-slots')
        self.booking_url = reverse('hospital-booking-create-appointment')

    def test_available_slots_retrieval(self):
        """Test retrieving available slots for a doctor on a scheduled day."""
        date_str = self.today.strftime('%Y-%m-%d')
        response = self.client.get(
            f"{self.slots_url}?doctor_id={self.doctor.id}&date={date_str}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('slots', response.data)
        # 2 hours (09:00 to 11:00) with 30 min duration should yield 4 slots
        self.assertEqual(len(response.data['slots']), 4)

    def test_create_appointment_success(self):
        """Test successfully booking a doctor's available slot."""
        from django.utils.timezone import make_aware
        import datetime as dt_module
        start_dt = make_aware(dt_module.datetime.combine(self.today, dt_module.time(9, 0)))
        end_dt = make_aware(dt_module.datetime.combine(self.today, dt_module.time(9, 30)))

        payload = {
            'doctor_id': str(self.doctor.id),
            'start_datetime': start_dt.isoformat(),
            'end_datetime': end_dt.isoformat(),
            'patient_name': 'John Doe',
            'patient_email': 'john@example.com',
            'patient_phone': '1234567890'
        }
        response = self.client.post(self.booking_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Appointment.objects.filter(doctor=self.doctor, patient_email='john@example.com').exists()
        )

    def test_create_appointment_double_booking(self):
        """Test booking fails when a slot is already booked."""
        from django.utils.timezone import make_aware
        import datetime as dt_module
        start_dt = make_aware(dt_module.datetime.combine(self.today, dt_module.time(9, 0)))
        end_dt = make_aware(dt_module.datetime.combine(self.today, dt_module.time(9, 30)))

        # Pre-create appointment
        Appointment.objects.create(
            website_setup=self.website_setup,
            doctor=self.doctor,
            start_datetime=start_dt,
            end_datetime=end_dt,
            patient_name='Patient A',
            patient_email='a@example.com',
            patient_phone='1111'
        )

        payload = {
            'doctor_id': str(self.doctor.id),
            'start_datetime': start_dt.isoformat(),
            'end_datetime': end_dt.isoformat(),
            'patient_name': 'Patient B',
            'patient_email': 'b@example.com',
            'patient_phone': '2222'
        }
        response = self.client.post(self.booking_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('error', response.data)


class PharmacyProductTests(APITestCase):
    """
    Unit tests for Pharmacy products administration.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='pharmacyadmin@example.com',
            email='pharmacyadmin@example.com',
            password='password123',
            name='Pharmacy Admin',
            business_type='pharmacy'
        )
        self.website_setup = WebsiteSetup.objects.create(
            user=self.user,
            subdomain='test-pharmacy'
        )
        self.pharmacy = Pharmacy.objects.create(
            user=self.user,
            website_setup=self.website_setup,
            name='Test Pharmacy'
        )
        self.client.force_authenticate(user=self.user)
        self.product_list_url = reverse('product-list')

    def test_create_product(self):
        """Test adding a new product to the pharmacy catalog."""
        payload = {
            'name': 'Aspirin',
            'category': 'General',
            'price': '10.50',
            'description': 'Pain reliever',
            'stock': 100
        }
        response = self.client.post(self.product_list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Product.objects.filter(name='Aspirin', website_setup=self.website_setup).exists()
        )

