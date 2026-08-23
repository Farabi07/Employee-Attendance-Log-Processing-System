
# email_app/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from cms.models import EmailAddress
from cms.serializers import EmailAddressSerializer

@api_view(['GET', 'POST'])

def store_and_send_email(request):
    if request.method == 'GET':
        emails = EmailAddress.objects.all()
        serializer = EmailAddressSerializer(emails, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = EmailAddressSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    