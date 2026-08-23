import os
import sys
import django
import json
import requests
from datetime import datetime
from django.core.files.base import ContentFile

# Set up Django environment
sys.path.append('/home/farhad/Desktop/Dream_projects/dream_tourism_it/')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'start_project.settings')
django.setup()

from cms.models import Review

def save_review_from_json(review_data):
    supplier = review_data.get('supplier')
    reviewer_name = review_data.get('reviewer_name')
    reviewer_picture_url = review_data.get('reviewer_picture_url')
    rating = review_data.get('rating')
    text = review_data.get('text')
    title = review_data.get('title')
    published_at = datetime.fromtimestamp(review_data.get('published_at'))
    url = review_data.get('url')

    if not supplier or not reviewer_name or not reviewer_picture_url:
        print("Incomplete review data. Skipping.")
        return None

    try:
        response = requests.get(reviewer_picture_url)
        if response.status_code == 200:
            # Create Review instance
            review_instance = Review.objects.create(
                supplier=supplier,
                reviewer_name=reviewer_name,
                rating=rating,
                text=text,
                title=title,
                publication=published_at,
                url=url
            )
            
            # Save image to ImageField
            image_name = f'{reviewer_name}_picture.jpg'
            review_instance.image.save(
                image_name,
                ContentFile(response.content),
                save=True
            )
            print(f"Review '{title}' by {reviewer_name} saved successfully.")
            return review_instance
        else:
            print(f"Failed to download image from {reviewer_picture_url}. Status code: {response.status_code}")
    except Exception as e:
        print(f"Error downloading image from {reviewer_picture_url}: {e}")

    return None

def process_reviews_from_file(file_path):
    try:
        with open(file_path, 'r') as file:
            reviews_data = json.load(file)
            if isinstance(reviews_data, list):
                for review_data in reviews_data:
                    save_review_from_json(review_data)
            else:
                print("Invalid JSON format. Expecting a list of review objects.")
    except FileNotFoundError:
        print(f"File '{file_path}' not found.")
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from '{file_path}': {e}")

# Specify the path to your JSON file
json_file_path = '/home/farhad/Desktop/Dream_projects/dream_tourism_it/scripts/data.json'
process_reviews_from_file(json_file_path)
