from django.core.files.uploadedfile import SimpleUploadedFile
from decimal import Decimal
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import User, WebsiteSetup
from pharmacies.models import Pharmacy, PharmacyOrder, PharmacyTemplatePurchase, Product


class ProductBulkUploadCsvTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(
			username='pharmacy-owner',
			email='owner@example.com',
			password='password123',
			name='Pharmacy Owner',
			business_type='pharmacy',
		)
		self.client.force_authenticate(self.user)
		self.endpoint = '/api/pharmacy/products/bulk_upload/'

	def _upload_csv(self, csv_content: str):
		upload = SimpleUploadedFile(
			'products.csv',
			csv_content.encode('utf-8'),
			content_type='text/csv',
		)
		return self.client.post(self.endpoint, {'file': upload}, format='multipart')

	def test_alias_headers_are_parsed_and_stock_is_saved(self):
		csv_content = (
			'Product Name,Category,Price,Stock Quantity,Description\n'
			'Vitamin C 1000mg,Vitamins,19.99,25,Daily immune support\n'
			'Ibuprofen 200mg,Pain Relief,9.50,10,Fast pain relief\n'
		)

		response = self._upload_csv(csv_content)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['success_count'], 2)
		self.assertEqual(response.data['created_count'], 2)
		self.assertEqual(response.data['updated_count'], 0)
		self.assertEqual(response.data['failed_count'], 0)

		products = Product.objects.order_by('name')
		self.assertEqual(products.count(), 2)
		self.assertEqual(products[0].stock, 10)
		self.assertEqual(products[1].stock, 25)

	def test_invalid_rows_are_skipped_and_valid_rows_continue(self):
		csv_content = (
			'Product Name,Category,Price,Stock Quantity,Description\n'
			'Valid Product A,Supplements,12.50,12,Valid row\n'
			'Invalid Stock Row,Supplements,8.20,abc,Invalid stock\n'
			'Invalid Price Row,Supplements,not-a-price,8,Invalid price\n'
			'Valid Product B,Supplements,5.75,7.0,Whole-number decimal stock\n'
		)

		response = self._upload_csv(csv_content)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['success_count'], 2)
		self.assertEqual(response.data['created_count'], 2)
		self.assertEqual(response.data['updated_count'], 0)
		self.assertEqual(response.data['failed_count'], 2)
		self.assertEqual(len(response.data['failed_rows']), 2)

		self.assertEqual(Product.objects.count(), 2)
		stocks = sorted(Product.objects.values_list('stock', flat=True))
		self.assertEqual(stocks, [7, 12])

		failed_row_numbers = {entry['row'] for entry in response.data['failed_rows']}
		self.assertEqual(failed_row_numbers, {3, 4})

	def test_semicolon_delimiter_and_thousand_values_are_supported(self):
		csv_content = (
			'Product Name;Category;Price;Stock Quantity;Description\n'
			'Blood Pressure Monitor;Devices;$1,299.50;1,000;Home monitoring device\n'
			'Thermometer;Devices;12.00;7,0;Decimal stock format\n'
		)

		response = self._upload_csv(csv_content)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['success_count'], 2)
		self.assertEqual(response.data['failed_count'], 0)

		product = Product.objects.get(name='Blood Pressure Monitor')
		self.assertEqual(str(product.price), '1299.50')
		self.assertEqual(product.stock, 1000)
		self.assertEqual(Product.objects.get(name='Thermometer').stock, 7)

	def test_invalid_image_url_is_ignored_without_failing_row(self):
		csv_content = (
			'Product Name,Category,Price,Stock Quantity,Description,Image\n'
			'Vitamin C 1000mg,Vitamins,19.99,25,Daily immune support,not-a-url\n'
			'Ibuprofen 200mg,Pain Relief,9.50,10,Fast pain relief,https://example.com/product.jpg\n'
		)

		response = self._upload_csv(csv_content)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['success_count'], 2)
		self.assertEqual(response.data['failed_count'], 0)

		invalid_url_product = Product.objects.get(name='Vitamin C 1000mg')
		valid_url_product = Product.objects.get(name='Ibuprofen 200mg')
		self.assertEqual(invalid_url_product.image_url, '')
		self.assertEqual(valid_url_product.image_url, 'https://example.com/product.jpg')

	def test_missing_required_columns_returns_clear_feedback(self):
		csv_content = (
			'Product Name,Category,Price,Description\n'
			'Vitamin C 1000mg,Vitamins,19.99,Daily immune support\n'
		)

		response = self._upload_csv(csv_content)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data['success_count'], 0)
		self.assertEqual(response.data['failed_count'], 1)
		self.assertEqual(response.data['processed_count'], 1)
		self.assertEqual(Product.objects.count(), 0)
		self.assertIn('Missing required columns', response.data['failed_rows'][0]['errors'][0])

	def test_json_bulk_upload_skips_invalid_rows(self):
		payload = {
			'products': [
				{
					'name': 'Valid JSON Product',
					'category': 'Supplements',
					'price': 10.5,
					'stock': 5,
					'description': 'Valid row',
				},
				{
					'name': 'Invalid JSON Product',
					'category': 'Supplements',
					'price': 4.2,
					'stock': 'not-an-integer',
					'description': 'Invalid stock',
				},
				{
					'name': 'Second Valid JSON Product',
					'category': 'Supplements',
					'price': 8.0,
					'stock': 2,
					'description': 'Valid row',
				},
			]
		}

		response = self.client.post(self.endpoint, payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['success_count'], 2)
		self.assertEqual(response.data['failed_count'], 1)
		self.assertEqual(len(response.data['failed_rows']), 1)
		self.assertEqual(Product.objects.count(), 2)

	def test_delete_all_products_works(self):
		seed_csv = (
			'Product Name,Category,Price,Stock Quantity,Description\n'
			'Delete A,General,5.00,3,Seed product\n'
			'Delete B,General,7.00,5,Seed product\n'
		)
		seed_response = self._upload_csv(seed_csv)
		self.assertEqual(seed_response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(Product.objects.count(), 2)

		response = self.client.delete('/api/pharmacy/products/delete_all/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('products deleted successfully', response.data['message'])
		self.assertEqual(Product.objects.count(), 0)


class PharmacyTemplatePurchaseApiTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(
			username='pharmacy-owner-2',
			email='owner2@example.com',
			password='password123',
			name='Pharmacy Owner',
			business_type='pharmacy',
		)
		self.client.force_authenticate(self.user)
		self.purchase_endpoint = '/api/pharmacy/pharmacies/purchase_template/'
		self.cancel_endpoint = '/api/pharmacy/pharmacies/cancel_template_purchase/'
		self.list_endpoint = '/api/pharmacy/pharmacies/template_purchases/'
		self.profile_endpoint = '/api/pharmacy/pharmacies/profile/'

	def test_purchase_template_is_persistent_and_unique_per_template(self):
		payload = {
			'template_id': 4,
			'payment_method': 'visa',
			'transaction_reference': 'tx-1234',
		}
		first_response = self.client.post(self.purchase_endpoint, payload, format='json')
		self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)

		second_response = self.client.post(
			self.purchase_endpoint,
			{**payload, 'payment_method': 'fawry', 'transaction_reference': 'tx-5678'},
			format='json',
		)
		self.assertEqual(second_response.status_code, status.HTTP_200_OK)

		self.assertEqual(PharmacyTemplatePurchase.objects.filter(template_id=4).count(), 1)
		purchase = PharmacyTemplatePurchase.objects.get(template_id=4)
		self.assertEqual(purchase.status, PharmacyTemplatePurchase.Status.ACTIVE)
		self.assertEqual(purchase.payment_method, PharmacyTemplatePurchase.PaymentMethod.FAWRY)

		website_setup = WebsiteSetup.objects.get(user=self.user)
		self.assertEqual(website_setup.template_id, 4)
		self.assertTrue(website_setup.is_paid)

	def test_profile_template_activation_requires_active_purchase(self):
		response = self.client.patch(self.profile_endpoint, {'template_id': 5}, format='json')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('purchase this template', response.data['detail'])

	def test_cancel_purchase_marks_record_and_clears_template_when_last_active(self):
		buy_response = self.client.post(
			self.purchase_endpoint,
			{
				'template_id': 6,
				'payment_method': 'visa',
				'transaction_reference': 'tx-cancel',
			},
			format='json',
		)
		self.assertIn(buy_response.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED))

		cancel_response = self.client.post(
			self.cancel_endpoint,
			{'template_id': 6},
			format='json',
		)
		self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)

		purchase = PharmacyTemplatePurchase.objects.get(template_id=6)
		self.assertEqual(purchase.status, PharmacyTemplatePurchase.Status.CANCELLED)
		self.assertIsNotNone(purchase.cancelled_at)

		profile_response = self.client.get(self.profile_endpoint)
		self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
		self.assertIsNone(profile_response.data['template_id'])

	def test_template_purchase_list_returns_records(self):
		self.client.post(
			self.purchase_endpoint,
			{'template_id': 4, 'payment_method': 'visa', 'transaction_reference': 'tx-list-a'},
			format='json',
		)
		self.client.post(
			self.purchase_endpoint,
			{'template_id': 5, 'payment_method': 'fawry', 'transaction_reference': 'tx-list-b'},
			format='json',
		)

		response = self.client.get(self.list_endpoint)
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 2)
		template_ids = {row['template_id'] for row in response.data}
		self.assertEqual(template_ids, {4, 5})


class PharmacyOrderApiTests(APITestCase):
	def setUp(self):
		self.owner = User.objects.create_user(
			username='pharmacy-owner-orders',
			email='orders-owner@example.com',
			password='password123',
			name='Order Owner',
			business_type='pharmacy',
		)

		self.website_setup = WebsiteSetup.objects.create(user=self.owner, subdomain='orders-owner')
		self.pharmacy = Pharmacy.objects.create(
			user=self.owner,
			website_setup=self.website_setup,
			name='Order Owner Pharmacy',
			template_id=1,
		)

		self.product_a = Product.objects.create(
			pharmacy=self.pharmacy,
			website_setup=self.website_setup,
			name='Order Test A',
			category='General',
			description='A',
			price=Decimal('10.00'),
			stock=20,
		)
		self.product_b = Product.objects.create(
			pharmacy=self.pharmacy,
			website_setup=self.website_setup,
			name='Order Test B',
			category='General',
			description='B',
			price=Decimal('15.00'),
			stock=10,
		)

		self.place_endpoint = '/api/pharmacy/orders/place/'
		self.list_endpoint = '/api/pharmacy/orders/'

	def _build_payload(self, request_id='req-001', payment_method='card'):
		payload = {
			'owner_id': str(self.owner.id),
			'client_request_id': request_id,
			'full_name': 'Jane Patient',
			'email': 'jane@example.com',
			'phone': '+1555123456',
			'address': '123 Main St',
			'city': 'Cairo',
			'state': 'Cairo Governorate',
			'zip_code': '12345',
			'delivery_method': 'delivery',
			'payment_method': payment_method,
			'delivery_fee': '5.00',
			'items': [
				{'product_id': str(self.product_a.id), 'quantity': 2},
				{'product_id': str(self.product_b.id), 'quantity': 1},
			],
		}
		if payment_method == 'card':
			payload['payment_last4'] = '1234'
		return payload

	def test_place_order_creates_pending_order_and_reduces_stock(self):
		response = self.client.post(self.place_endpoint, self._build_payload(), format='json')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertFalse(response.data['duplicate'])
		self.assertEqual(response.data['order']['status'], 'pending')
		self.assertEqual(response.data['order']['payment_status'], 'paid')

		order = PharmacyOrder.objects.get(order_number=response.data['order']['order_number'])
		self.assertEqual(order.items.count(), 2)
		self.assertEqual(str(order.subtotal), '35.00')
		self.assertEqual(str(order.delivery_fee), '5.00')
		self.assertEqual(str(order.total), '40.00')

		self.product_a.refresh_from_db()
		self.product_b.refresh_from_db()
		self.assertEqual(self.product_a.stock, 18)
		self.assertEqual(self.product_b.stock, 9)

	def test_unseen_count_ignores_unpaid_cash_orders_until_completed(self):
		response = self.client.post(
			self.place_endpoint,
			self._build_payload(request_id='cash-unseen-1', payment_method='cash'),
			format='json',
		)
		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['order']['payment_status'], 'pending')

		self.client.force_authenticate(self.owner)

		initial_unseen_response = self.client.get('/api/pharmacy/orders/unseen_count/')
		self.assertEqual(initial_unseen_response.status_code, status.HTTP_200_OK)
		self.assertEqual(initial_unseen_response.data['count'], 0)

		order_id = response.data['order']['id']
		complete_response = self.client.patch(
			f'/api/pharmacy/orders/{order_id}/status/',
			{'status': 'completed'},
			format='json',
		)
		self.assertEqual(complete_response.status_code, status.HTTP_200_OK)
		self.assertEqual(complete_response.data['payment_status'], 'paid')

		unseen_after_completed_response = self.client.get('/api/pharmacy/orders/unseen_count/')
		self.assertEqual(unseen_after_completed_response.status_code, status.HTTP_200_OK)
		self.assertEqual(unseen_after_completed_response.data['count'], 1)

	def test_place_order_requires_delivery_fields(self):
		payload = self._build_payload()
		payload['address'] = ''
		payload['city'] = ''

		response = self.client.post(self.place_endpoint, payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(PharmacyOrder.objects.count(), 0)
		self.assertIn('delivery_details', response.data)

	def test_place_order_is_idempotent_for_same_client_request_id(self):
		payload = self._build_payload(request_id='duplicate-req-1')

		first_response = self.client.post(self.place_endpoint, payload, format='json')
		second_response = self.client.post(self.place_endpoint, payload, format='json')

		self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(second_response.status_code, status.HTTP_200_OK)
		self.assertTrue(second_response.data['duplicate'])
		self.assertEqual(PharmacyOrder.objects.count(), 1)

	def test_owner_can_list_and_update_order_status(self):
		create_response = self.client.post(self.place_endpoint, self._build_payload(), format='json')
		self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

		self.client.force_authenticate(self.owner)

		list_response = self.client.get(self.list_endpoint)
		self.assertEqual(list_response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(list_response.data), 1)

		order_id = list_response.data[0]['id']
		status_response = self.client.patch(
			f'/api/pharmacy/orders/{order_id}/status/',
			{'status': 'processing'},
			format='json',
		)
		self.assertEqual(status_response.status_code, status.HTTP_200_OK)
		self.assertEqual(status_response.data['status'], 'processing')

	def test_unseen_count_resets_after_mark_seen(self):
		create_response = self.client.post(self.place_endpoint, self._build_payload(), format='json')
		self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

		self.client.force_authenticate(self.owner)

		before_response = self.client.get('/api/pharmacy/orders/unseen_count/')
		self.assertEqual(before_response.status_code, status.HTTP_200_OK)
		self.assertEqual(before_response.data['count'], 1)

		mark_seen_response = self.client.post('/api/pharmacy/orders/mark_seen/', {}, format='json')
		self.assertEqual(mark_seen_response.status_code, status.HTTP_200_OK)
		self.assertEqual(mark_seen_response.data['marked_seen'], 1)
		self.assertEqual(mark_seen_response.data['remaining_unseen'], 0)

		after_response = self.client.get('/api/pharmacy/orders/unseen_count/')
		self.assertEqual(after_response.status_code, status.HTTP_200_OK)
		self.assertEqual(after_response.data['count'], 0)

	def test_mark_seen_endpoint_updates_only_requested_orders(self):
		first_response = self.client.post(self.place_endpoint, self._build_payload(request_id='req-100'), format='json')
		second_response = self.client.post(self.place_endpoint, self._build_payload(request_id='req-101'), format='json')
		self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)

		self.client.force_authenticate(self.owner)

		unseen_response = self.client.get('/api/pharmacy/orders/unseen_count/')
		self.assertEqual(unseen_response.status_code, status.HTTP_200_OK)
		self.assertEqual(unseen_response.data['count'], 2)

		first_order_id = first_response.data['order']['id']
		mark_response = self.client.post(
			'/api/pharmacy/orders/mark_seen/',
			{'order_ids': [first_order_id]},
			format='json',
		)
		self.assertEqual(mark_response.status_code, status.HTTP_200_OK)
		self.assertEqual(mark_response.data['marked_seen'], 1)
		self.assertEqual(mark_response.data['remaining_unseen'], 1)
