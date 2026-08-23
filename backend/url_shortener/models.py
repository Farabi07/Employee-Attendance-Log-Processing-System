from django.db import models

class ShortenedURL(models.Model):
    original_url = models.URLField(unique=True)
    short_code = models.CharField(max_length=15, unique=True)

    def __str__(self):
        return self.short_code
