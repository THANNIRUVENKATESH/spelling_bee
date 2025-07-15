from django.db import models
from django.utils import timezone
import datetime
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.contrib.auth.models import User


class Spellbee(models.Model):
    spellbee_id = models.AutoField(primary_key=True)
    spellbee_date = models.DateField(default=datetime.date.today, unique=True)  # Unique date
    words = models.JSONField(default=list)  # Store 15 words as JSON
    sentences = models.JSONField(default=list)  # Store 15 sentences as JSON
    timer = models.IntegerField(default=15)
    status = models.BooleanField(default=True)  # Active or Inactive  

    class Meta:
        db_table = "spellbee"

    def __str__(self):
        return f"{self.spellbee_date} - {len(self.words)} words"


class UsersResults(models.Model):
    rider_id = models.IntegerField(default=0)
    event_id = models.CharField(max_length=20, default="null")
    mistake_words = models.IntegerField(default=0)
    correct_words=models.IntegerField(default=0)
    total_points = models.IntegerField(default=0)
    submit_date = models.DateField(default=timezone.now)

    class Meta:
        db_table = 'user_results'

    def __str__(self):
        return f"User {self.rider_id}: {self.total_points} points"
