from django.core.management.base import BaseCommand, CommandError
from auction_system.models import RFQ
from auction_system.tasks import update_bid_rankings


class Command(BaseCommand):
    help = 'Update bid rankings for all RFQs or a specific RFQ'

    def add_arguments(self, parser):
        parser.add_argument(
            '--rfq-id',
            type=str,
            help='Specific RFQ ID to update rankings for',
        )

    def handle(self, *args, **options):
        rfq_id = options.get('rfq_id')

        if rfq_id:
            try:
                rfq = RFQ.objects.get(id=rfq_id)
                update_bid_rankings(str(rfq.id))
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully updated rankings for RFQ {rfq_id}'
                    )
                )
            except RFQ.DoesNotExist:
                raise CommandError(f'RFQ with ID {rfq_id} not found')
        else:
            # Update all RFQs
            rfqs = RFQ.objects.all()
            count = 0
            for rfq in rfqs:
                update_bid_rankings(str(rfq.id))
                count += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully updated rankings for {count} RFQs'
                )
            )
