from django.core.management.base import BaseCommand
from django.db.models import Count
from pharmacies.models import Product


class Command(BaseCommand):
    help = 'Clean up duplicate products and optionally delete all products'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete-all',
            action='store_true',
            help='Delete all products',
        )
        parser.add_argument(
            '--remove-duplicates',
            action='store_true',
            help='Remove duplicate products (keep newest)',
        )

    def handle(self, *args, **options):
        if options['delete_all']:
            count = Product.objects.count()
            Product.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS(f'Successfully deleted {count} products')
            )
            return

        if options['remove_duplicates']:
            # Find duplicates by name and category
            duplicates = (
                Product.objects.values('website_setup', 'name', 'category')
                .annotate(count=Count('id'))
                .filter(count__gt=1)
            )
            
            deleted_count = 0
            for dup in duplicates:
                # Keep the newest, delete the rest
                products = Product.objects.filter(
                    website_setup_id=dup['website_setup'],
                    name=dup['name'],
                    category=dup['category']
                ).order_by('-created_at')
                
                # Delete all except the first (newest)
                to_delete = products[1:]
                count = len(to_delete)
                for p in to_delete:
                    p.delete()
                deleted_count += count
                
                self.stdout.write(
                    f"Removed {count} duplicates of '{dup['name']}'"
                )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully removed {deleted_count} duplicate products'
                )
            )
