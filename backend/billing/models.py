from django.db import models

from commons.currencies import CURRENCY_CHOICES


class PlatformSettings(models.Model):
	"""Singleton: the platform owner's own subscription pricing, set from
	their dashboard — never hardcoded, so they can change it any time
	without a deploy."""

	monthly_price = models.DecimalField(max_digits=10, decimal_places=2, default=29)
	yearly_price = models.DecimalField(max_digits=10, decimal_places=2, default=290)
	currency = models.CharField(max_length=10, choices=CURRENCY_CHOICES, default='usd')

	updated_at = models.DateTimeField(auto_now=True)

	@classmethod
	def current(cls):
		obj, _created = cls.objects.get_or_create(pk=1)
		return obj

	def save(self, *args, **kwargs):
		self.pk = 1
		super().save(*args, **kwargs)
