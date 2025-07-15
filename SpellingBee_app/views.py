from django.shortcuts import render, redirect
from django.http import JsonResponse
from datetime import datetime
from django.utils import timezone
from .models import Spellbee
from django.core.exceptions import ObjectDoesNotExist
from django.views.decorators.csrf import csrf_exempt
import json
from .models import User
from .models import UsersResults
from datetime import date
import random
from django.conf import settings
import os
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.views.decorators.http import require_http_methods
from rest_framework.authtoken.models import Token
from django.db.models import Sum, Count, Avg, Max
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated


def home(request):
    return render(request, 'index.html')

def gameplay(request):
    return render(request, 'gameplay.html')

def practice(request):
    return render(request, 'practice.html')

def leaderboard(request):
    return render(request, 'leaderboard.html')

def register_page(request):
    return render(request, 'register.html')

def login_page(request):
    return render(request, 'login.html')

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_todays_words(request):
    today = date.today()
    try:
        spellbee = Spellbee.objects.get(spellbee_date=today)
        return JsonResponse({
            'words': spellbee.words,
            'sentences': spellbee.sentences,
            'seconds': spellbee.timer
        })
    except Spellbee.DoesNotExist:
        return JsonResponse({
            'error': 'No words available for today',
            'words': [],
            'sentences': [],
            'timer': 0
        }, status=404)



def spellbee_get(request):
    """Get spellbee data for spellbee's date"""
    try:
        spellbee = datetime.now().date()
        spellbee = Spellbee.objects.get(spellbee_date=spellbee)
        
        return JsonResponse({
            'spellbee_id': spellbee.spellbee_id,
            'date': spellbee.spellbee_date,
            'words': spellbee.words,
            'sentences': spellbee.sentences,
            'status': spellbee.status
        })
    except ObjectDoesNotExist:
        return JsonResponse({'error': 'No spellbee data found for spellbee'}, status=404)

@csrf_exempt
def submit_game(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST requests are allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        # Check for Authorization header
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            # Authenticated path
            token_key = auth_header.split(' ')[1]
            try:
                token = Token.objects.get(key=token_key)
                user = token.user
                rider_id = user.id
            except Token.DoesNotExist:
                return JsonResponse({'error': 'Invalid token'}, status=401)
        else:
            # Fallback to rider_id from request
            rider_id = data.get('rider_id')
            if not rider_id:
                return JsonResponse({'error': 'rider_id is required if no token'}, status=400)
        
        user_result = UsersResults.objects.create(
            rider_id=rider_id,
            event_id=data.get('event_id', "null"),
            mistake_words=data.get('mistake_words', 0),
            correct_words=data.get('correct_words', 0),
            total_points=data.get('total_points', 0),
            submit_date=timezone.now().date()  # Using server timestamp for consistency
        )
        
        return JsonResponse({
            'message': 'Game result submitted successfully',
            'result_id': user_result.id
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_practice_words(request):
    json_path = os.path.join(settings.BASE_DIR, 'SpellingBee_app', 'data', 'practice_words.json')

    if not os.path.exists(json_path):
        return JsonResponse({'error': 'Practice words file not found'}, status=500)

    try:
        with open(json_path, 'r', encoding='utf-8') as file:
            words_data = json.load(file)

        word_objects = words_data.get("words", [])

        if not word_objects:
            return JsonResponse({'error': 'No words found in the file'}, status=404)

        return JsonResponse({'words': word_objects})
    
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON format in practice_words.json'}, status=500)
    except Exception as e:
        return JsonResponse({'error': f'Unexpected error: {str(e)}'}, status=500)

# Add views for leaderboard
@csrf_exempt
def get_leaderboard(request):
    try:
        # Get and validate token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Invalid authorization header'}, status=401)
        
        token_key = auth_header.split(' ')[1]
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
        except Token.DoesNotExist:
            return JsonResponse({'error': 'Invalid token'}, status=401)

        timeframe = request.GET.get('timeframe', 'all')
        limit = int(request.GET.get('limit', 10))
        
        query = UsersResults.objects.all()
    
        # Apply timeframe filter
        if timeframe == 'today':
            today = timezone.now().date()
            print(f"Today's Date: {today}") #Debug print
            query = query.filter(submit_date=today)
        elif timeframe == 'week':
            query = query.filter(submit_date__gte=timezone.now().date() - timedelta(days=7))
        elif timeframe == 'month':
            query = query.filter(submit_date__gte=timezone.now().date() - timedelta(days=30))
        
        # Get aggregated results
        leaderboard_data = query.values('rider_id').annotate(
            total_score=Sum('total_points'),
            games_played=Count('id'),
            avg_score=Avg('total_points'),
            highest_score=Max('total_points')
        ).order_by('-total_score')[:limit]
        
        # Get user details
        leaderboard = []
        for entry in leaderboard_data:
            try:
                user = User.objects.get(id=entry['rider_id'])
                leaderboard.append({
                    'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                    'total_score': entry['total_score'],
                    'games_played': entry['games_played'],
                    'avg_score': round(float(entry['avg_score']), 2),
                    'highest_score': entry['highest_score']
                })
            except User.DoesNotExist:
                continue
        
        return JsonResponse({'leaderboard': leaderboard})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)



@csrf_exempt
def register(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            name = data.get('name')
            
            if User.objects.filter(email=email).exists():
                return JsonResponse({'error': 'Email already exists'}, status=400)
            
            # Create user with username as email
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=name
            )
            
            return JsonResponse({'message': 'Registration successful'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Invalid request method'}, status=405)

@csrf_exempt
@api_view(['POST'])
def login(request):
    try:
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return JsonResponse({'error': 'Email and password are required'}, status=400)
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse({'error': 'Invalid credentials'}, status=401)
        
        user = authenticate(username=email, password=password)
        
        if user is not None and user.is_active:
            # Delete any existing tokens
            Token.objects.filter(user=user).delete()
            # Create new token
            token = Token.objects.create(user=user)
            
            # Verify token works
            try:
                # Get today's words to verify token works
                today = date.today()
                spellbee = Spellbee.objects.get(spellbee_date=today)
                
                # Return token with proper format
                return JsonResponse({
                    'token': token.key,
                    'name': user.first_name or user.username,
                    'words': spellbee.words,  # Include words to avoid extra API call
                    'sentences': spellbee.sentences,
                    'seconds': spellbee.timer
                })
            except Spellbee.DoesNotExist:
                # Even if no words exist, token is still valid
                return JsonResponse({
                    'token': token.key,
                    'name': user.first_name or user.username,
                    'words': [],
                    'sentences': [],
                    'timer': 0
                })
        return JsonResponse({'error': 'Invalid credentials'}, status=401)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid request format'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)