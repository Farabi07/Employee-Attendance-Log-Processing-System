import os
import sys
import django
import requests
from datetime import datetime


# Set up Django environment
sys.path.append('/home/farhad/Desktop/Dream_projects/dream_tourism_it/')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'start_project.settings')
django.setup()

from cms.models import Review

def import_images_to_cloudflare():
    print('farabi')
    objects = Review.objects.filter(cloudflare_image__isnull=True)

    
    endpoint = 'https://api.cloudflare.com/client/v4/accounts/f8b413899d5239382d13a2665326b04e/images/v1'
    headers = {
        'Authorization': 'Bearer Ook1HC9KydDm4YfqkmVH5KnoNsSugDDqgLFj4QHi',
    }

  
    for obj in objects:
        files = {'file': obj.image.file}
        response = requests.post(endpoint, headers=headers, files=files)
        response.raise_for_status()
        json_data = response.json()
        variants = json_data.get('result', {}).get('variants', [])
        if variants:
            cloudflare_image = variants[0]
            print(f"Cloudflare image URL for {obj}: {cloudflare_image}")
          
            obj.cloudflare_image = cloudflare_image
            obj.save()
        else:
            print(f"No variants found for {obj} in the Cloudflare response")


import_images_to_cloudflare()
