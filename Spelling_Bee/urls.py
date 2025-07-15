"""
URL configuration for Spelling_Bee project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from SpellingBee_app import views

# Create separate URL patterns for API and page routes
api_patterns = [
    path('spellbee/', views.spellbee_get, name='spellbee_get'),
    path('submit/', views.submit_game, name='submit_game'),
    path('get-todays-words/', views.get_todays_words, name='get_todays_words'),
    path('get-practice-words/', views.get_practice_words, name='get_practice_words'),
    path('register-api/', views.register, name='register'),
    path('login-api/', views.login, name='login'),
    path('leaderboard-api/', views.get_leaderboard, name='leaderboard'),
]

page_patterns = [
    path('', views.home, name='home'),
    path('gameplay/', views.gameplay, name='gameplay'),
    path('practice/', views.practice, name='practice'),
    path('leaderboard/', views.leaderboard, name='leaderboard'),
    path('register/', views.register_page, name='register'),
    path('login/', views.login_page, name='login'),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('spellingbee/api/', include(api_patterns)),  # API routes under /spellingbee/api/
    path('spellingbee/', include(page_patterns)),  # Page routes under /spellingbee/
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)