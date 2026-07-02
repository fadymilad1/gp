import logging
from django.core.mail import send_mail
from django.conf import settings
from pharmacies.models import PharmacyOrder

logger = logging.getLogger(__name__)

def send_order_confirmation_email(order_id):
    """
    Sends a pharmacy order confirmation email to the customer.
    """
    try:
        order = PharmacyOrder.objects.select_related('pharmacy', 'website_setup').get(id=order_id)
    except PharmacyOrder.DoesNotExist:
        logger.error(f"Cannot send confirmation email: Order {order_id} does not exist.")
        return False

    if order.confirmation_email_sent:
        return False

    if not order.patient_email:
        logger.warning(f"Skipping confirmation email for order {order.id}: no patient email provided.")
        return False

    # Get pharmacy name
    pharmacy_name = 'our pharmacy'
    if order.pharmacy and order.pharmacy.name:
        pharmacy_name = order.pharmacy.name
    elif hasattr(order.website_setup, 'business_info') and order.website_setup.business_info and order.website_setup.business_info.name:
        pharmacy_name = order.website_setup.business_info.name

    # Format order items summary
    order_items_list = []
    for item in order.items.all():
        order_items_list.append(f"- {item.product_name} x {item.quantity} (${item.unit_price} each)")
    order_items_summary = "\n".join(order_items_list)

    # Email details
    subject = "Your Order Is Out for Delivery 🚚"
    
    # We must format exactly as requested by the user, substituting variables:
    # {{customer_name}} -> order.patient_name
    # {{order_id}} -> order.order_number
    # {{estimated_delivery_time}} -> "30-45 minutes" (default / reasonable estimate)
    # {{order_items}} -> order_items_summary
    # {{pharmacy_name}} -> pharmacy_name
    
    body = (
        f"Dear {order.patient_name},\n\n"
        f"Great news!\n\n"
        f"Your pharmacy order has been confirmed and is now out for delivery.\n\n"
        f"Delivery Details\n\n"
        f"Order ID: {order.order_number}\n"
        f"Delivery Status: Out for Delivery\n"
        f"Estimated Delivery Time: 30-45 minutes\n\n"
        f"Order Summary\n\n"
        f"{order_items_summary}\n\n"
        f"Please make sure someone is available to receive the order at the delivery address.\n\n"
        f"If you have any questions or need assistance, feel free to contact our support team.\n\n"
        f"Thank you for choosing {pharmacy_name}.\n\n"
        f"We hope you have a great experience with Medify.\n\n"
        f"Best regards,\n\n"
        f"{pharmacy_name}\n"
        f"Medify Support"
    )

    try:
        send_mail(
            subject,
            body,
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@medify.local'),
            [order.patient_email],
            fail_silently=False,
        )
        order.confirmation_email_sent = True
        order.save(update_fields=['confirmation_email_sent'])
        logger.info(f"Successfully sent confirmation email to {order.patient_email} for order {order.id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send confirmation email for order {order.id}: {str(e)}")
        return False
