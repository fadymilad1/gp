from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import User


class Command(BaseCommand):
    help = (
        "Delete all hospital/pharmacy users and cascade related data. "
        "Use --dry-run to see counts without deleting."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show how many users would be deleted without deleting them.",
        )
        parser.add_argument(
            "--include-superusers",
            action="store_true",
            help="Also delete superusers with hospital/pharmacy business_type.",
        )

    def handle(self, *args, **options):
        qs = User.objects.filter(business_type__in=["hospital", "pharmacy"])
        if not options["include_superusers"]:
            qs = qs.filter(is_superuser=False)

        count = qs.count()
        if options["dry_run"]:
            self.stdout.write(self.style.WARNING(f"Dry run: {count} users would be deleted."))
            return

        if count == 0:
            self.stdout.write(self.style.SUCCESS("No hospital/pharmacy users to delete."))
            return

        with transaction.atomic():
            qs.delete()

        self.stdout.write(self.style.SUCCESS(f"Deleted {count} users (hospital/pharmacy)."))
