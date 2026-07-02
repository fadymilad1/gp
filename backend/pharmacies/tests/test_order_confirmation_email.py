from decimal import Decimal
import logging
from unittest.mock import patch
from django.core import mail
from rest_framework import status
from rest_framework.test import APITransactionTestCase

from core.models import User, WebsiteSetup
from pharmacies.models import Pharmacy, PharmacyOrder, Product, PharmacyOrderItem


class PharmacyOrderConfirmationEmailTests(APITransactionTestCase):
    def setUp(self):
        # Silence email logging during tests to keep output clean
        logging.getLogger('pharmacies.tasks').setLevel(logging.CRITICAL)

        self.owner = User.objects.create_user(
            username='pharmacy-owner-email-test',
            email='email-owner@example.com',
            password='password123',
            name='Email Test Owner',
            business_type='pharmacy',
        )

        self.website_setup = WebsiteSetup.objects.create(user=self.owner, subdomain='email-test')
        self.pharmacy = Pharmacy.objects.create(
            user=self.owner,
            website_setup=self.website_setup,
            name='Email Test Pharmacy',
            template_id=1,
        )

        self.product_a = Product.objects.create(
            pharmacy=self.pharmacy,
            website_setup=self.website_setup,
            name='Aspirin',
            category='Medicine',
            description='Pain relief',
            price=Decimal('5.50'),
            stock=100,
        )

        # Build payload for placing orders
        self.place_endpoint = '/api/pharmacy/orders/place/'
        self.payload = {
            'owner_id': str(self.owner.id),
            'client_request_id': 'req-email-001',
            'full_name': 'John Customer',
            'email': 'customer@example.com',
            'phone': '+123456789',
            'address': '789 Pharmacy Road',
            'city': 'New York',
            'state': 'NY',
            'zip_code': '10001',
            'delivery_method': 'delivery',
            'payment_method': 'cash',
            'delivery_fee': '3.00',
            'items': [
                {'product_id': str(self.product_a.id), 'quantity': 2},
            ],
        }

    def test_new_order_does_not_send_email(self):
        # Clear outbox
        mail.outbox = []

        response = self.client.post(self.place_endpoint, self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        order = PharmacyOrder.objects.get(order_number=response.data['order']['order_number'])
        self.assertEqual(order.status, PharmacyOrder.Status.PENDING)
        self.assertFalse(order.confirmation_email_sent)

        # No email should be sent when order is placed/pending
        self.assertEqual(len(mail.outbox), 0)

    def test_changing_pending_to_confirmed_sends_exactly_one_email(self):
        response = self.client.post(self.place_endpoint, self.payload, format='json')
        order_id = response.data['order']['id']

        mail.outbox = []

        # Authenticate owner to change status
        self.client.force_authenticate(self.owner)
        status_url = f'/api/pharmacy/orders/{order_id}/status/'

        status_response = self.client.patch(status_url, {'status': 'confirmed'}, format='json')
        self.assertEqual(status_response.status_code, status.HTTP_200_OK)

        order = PharmacyOrder.objects.get(id=order_id)
        self.assertEqual(order.status, PharmacyOrder.Status.CONFIRMED)
        self.assertTrue(order.confirmation_email_sent)

        # Assert exactly one email is sent
        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]

        # Verify subject and body details
        self.assertEqual(sent_email.subject, "Your Order Is Out for Delivery 🚚")
        self.assertEqual(sent_email.to, [order.patient_email])
        
        # Verify placeholders
        self.assertIn("Dear John Customer,", sent_email.body)
        self.assertIn(f"Order ID: {order.order_number}", sent_email.body)
        self.assertIn("Estimated Delivery Time: 30-45 minutes", sent_email.body)
        self.assertIn("Aspirin x 2 ($5.50 each)", sent_email.body)
        self.assertIn("Thank you for choosing Email Test Pharmacy.", sent_email.body)

    def test_saving_confirmed_order_again_does_not_send_duplicate_emails(self):
        response = self.client.post(self.place_endpoint, self.payload, format='json')
        order_id = response.data['order']['id']

        self.client.force_authenticate(self.owner)
        status_url = f'/api/pharmacy/orders/{order_id}/status/'

        # Transition to confirmed (sends first email)
        self.client.patch(status_url, {'status': 'confirmed'}, format='json')
        mail.outbox = []

        # Re-save / edit order or save confirmed order again
        order = PharmacyOrder.objects.get(id=order_id)
        order.patient_phone = '+999999999'
        order.save()

        # No additional email should be sent
        self.assertEqual(len(mail.outbox), 0)

        # Trigger patch status update to confirmed again (simulating duplicate save attempt)
        self.client.patch(status_url, {'status': 'confirmed'}, format='json')
        self.assertEqual(len(mail.outbox), 0)

    def test_cancelling_or_editing_after_confirmed_does_not_resend_email(self):
        response = self.client.post(self.place_endpoint, self.payload, format='json')
        order_id = response.data['order']['id']

        self.client.force_authenticate(self.owner)
        status_url = f'/api/pharmacy/orders/{order_id}/status/'

        # Confirm
        self.client.patch(status_url, {'status': 'confirmed'}, format='json')
        mail.outbox = []

        # Edit/cancel order
        cancel_response = self.client.patch(status_url, {'status': 'cancelled'}, format='json')
        self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)

        # Verify no new email sent during cancellation
        self.assertEqual(len(mail.outbox), 0)

    def test_email_sending_failure_does_not_break_status_update(self):
        response = self.client.post(self.place_endpoint, self.payload, format='json')
        order_id = response.data['order']['id']

        self.client.force_authenticate(self.owner)
        status_url = f'/api/pharmacy/orders/{order_id}/status/'

        # Mock send_mail to raise an exception
        with patch('pharmacies.tasks.send_mail', side_code=Exception("SMTP Connection Error")) as mock_send:
            mock_send.side_effect = Exception("SMTP Connection Error")
            
            # Status update should succeed even if email fails to send
            status_response = self.client.patch(status_url, {'status': 'confirmed'}, format='json')
            self.assertEqual(status_response.status_code, status.HTTP_200_OK)

            order = PharmacyOrder.objects.get(id=order_id)
            self.assertEqual(order.status, PharmacyOrder.Status.CONFIRMED)
            # Flag should remain False since send failed
            self.assertFalse(order.confirmation_email_sent)
