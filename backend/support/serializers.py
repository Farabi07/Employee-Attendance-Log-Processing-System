from django.conf import settings
from authentication.serializers import AdminUserMinimalListSerializer

from rest_framework import serializers

from django_currentuser.middleware import get_current_authenticated_user


from support.models import *



class TicketDepartmentListSerializer(serializers.ModelSerializer):
	created_by = serializers.SerializerMethodField(read_only=True)
	updated_by = serializers.SerializerMethodField(read_only=True)
	class Meta:
		model = TicketDepartment
		fields = '__all__'
		extra_kwargs = {
			'created_at':{
				'read_only': True,
			},
			'updated_at':{
				'read_only': True,
			},
			'created_by':{
				'read_only': True,
			},
			'updated_by':{
				'read_only': True,
			},
		}

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by
		
	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class TicketDepartmentSerializer(serializers.ModelSerializer):
	class Meta:
		model = TicketDepartment
		fields = '__all__'

	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.created_by = user
		modelObject.save()
		return modelObject
	
	def update(self, instance, validated_data):
		modelObject = super().update(instance=instance, validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.updated_by = user
		modelObject.save()
		return modelObject




class TicketPriorityListSerializer(serializers.ModelSerializer):
	created_by = serializers.SerializerMethodField(read_only=True)
	updated_by = serializers.SerializerMethodField(read_only=True)
	class Meta:
		model = TicketPriority
		fields = '__all__'
		extra_kwargs = {
			'created_at':{
				'read_only': True,
			},
			'updated_at':{
				'read_only': True,
			},
			'created_by':{
				'read_only': True,
			},
			'updated_by':{
				'read_only': True,
			},
		}

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by
		
	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class TicketPrioritySerializer(serializers.ModelSerializer):
	class Meta:
		model = TicketPriority
		fields = '__all__'
		# exclude = ['created_at', 'updated_at', 'created_by', 'updated_by']

	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.created_by = user
		modelObject.save()
		return modelObject
	
	def update(self, instance, validated_data):
		modelObject = super().update(instance=instance, validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.updated_by = user
		modelObject.save()
		return modelObject



class TicketStatusListSerializer(serializers.ModelSerializer):
	created_by = serializers.SerializerMethodField(read_only=True)
	updated_by = serializers.SerializerMethodField(read_only=True)
	class Meta:
		model = TicketStatus
		fields = '__all__'
		extra_kwargs = {
			'created_at':{
				'read_only': True,
			},
			'updated_at':{
				'read_only': True,
			},
			'created_by':{
				'read_only': True,
			},
			'updated_by':{
				'read_only': True,
			},
		}

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by
		
	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class TicketStatusSerializer(serializers.ModelSerializer):
	class Meta:
		model = TicketStatus
		fields = '__all__'

	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.created_by = user
		modelObject.save()
		return modelObject
	
	def update(self, instance, validated_data):
		modelObject = super().update(instance=instance, validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.updated_by = user
		modelObject.save()
		return modelObject




class TicketListSerializer(serializers.ModelSerializer):
	ticket_department = serializers.SerializerMethodField(read_only=True)
	ticket_priority = serializers.SerializerMethodField(read_only=True)
	ticket_status = serializers.SerializerMethodField(read_only=True)

	created_by = serializers.SerializerMethodField(read_only=True)
	updated_by = serializers.SerializerMethodField(read_only=True)
	class Meta:
		model = Ticket
		fields = '__all__'
		extra_kwargs = {
			'created_at':{
				'read_only': True,
			},
			'updated_at':{
				'read_only': True,
			},
			'created_by':{
				'read_only': True,
			},
			'updated_by':{
				'read_only': True,
			},
		}

	def get_ticket_department(self, obj):
		return obj.ticket_department.name if obj.ticket_department else obj.ticket_department
		
	def get_ticket_priority(self, obj):
		return obj.ticket_priority.name if obj.ticket_priority else obj.ticket_priority
		
	def get_ticket_status(self, obj):
		return obj.ticket_status.name if obj.ticket_status else obj.ticket_status
		
	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by
		
	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class TicketSerializer(serializers.ModelSerializer):
	class Meta:
		model = Ticket
		fields = '__all__'

	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.created_by = user
		modelObject.save()
		return modelObject
	
	def update(self, instance, validated_data):
		modelObject = super().update(instance=instance, validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.updated_by = user
		modelObject.save()
		return modelObject




class TicketDetailListSerializer(serializers.ModelSerializer):
	admin = serializers.SerializerMethodField(read_only=True)
	customer = serializers.SerializerMethodField(read_only=True)

	admin_image = serializers.SerializerMethodField(read_only=True)
	customer_image = serializers.SerializerMethodField(read_only=True)

	created_by = serializers.SerializerMethodField(read_only=True)
	updated_by = serializers.SerializerMethodField(read_only=True)
	class Meta:
		model = TicketDetail
		fields = ['id', 'ticket', 'admin', 'customer', 'admin_image', 'customer_image', 'message', 'created_at', 'updated_at', 'created_by', 'updated_by']
		extra_kwargs = {
			'created_at':{
				'read_only': True,
			},
			'updated_at':{
				'read_only': True,
			},
			'created_by':{
				'read_only': True,
			},
			'updated_by':{
				'read_only': True,
			},
		}

	def get_admin(self, obj):
		return str(obj.admin.first_name) +' '+ str(obj.admin.last_name) if obj.admin else obj.admin

	def get_customer(self, obj):
		return str(obj.customer.first_name) +' '+ str(obj.customer.last_name) if obj.customer else obj.customer

	def get_admin_image(self, obj):
		return str(settings.MEDIA_URL) + str(obj.admin.image) if obj.admin else obj.admin

	def get_customer_image(self, obj):
		return str(settings.MEDIA_URL) + str(obj.customer.image) if obj.customer else obj.customer

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by
		
	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class TicketDetailSerializer(serializers.ModelSerializer):
	class Meta:
		model = TicketDetail
		fields = '__all__'

	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.created_by = user
		modelObject.save()
		return modelObject
	
	def update(self, instance, validated_data):
		modelObject = super().update(instance=instance, validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.updated_by = user
		modelObject.save()
		return modelObject




class MessageListSerializer(serializers.ModelSerializer):
	sender = AdminUserMinimalListSerializer()
	receiver = AdminUserMinimalListSerializer()

	sender_image = serializers.SerializerMethodField(read_only=True)
	receiver_image = serializers.SerializerMethodField(read_only=True)
	file = serializers.SerializerMethodField()

	created_by = serializers.SerializerMethodField(read_only=True)
	updated_by = serializers.SerializerMethodField(read_only=True)
	class Meta:
		model = Message
		fields = ['id', 'sender', 'receiver', 'sender_image', 'receiver_image', 'file', 'message', 'created_at', 'updated_at', 'created_by', 'updated_by']
		extra_kwargs = {
			'created_at':{
				'read_only': True,
			},
			'updated_at':{
				'read_only': True,
			},
			'created_by':{
				'read_only': True,
			},
			'updated_by':{
				'read_only': True,
			},
		}

	def get_sender_image(self, obj):
		return str(settings.MEDIA_URL) + str(obj.sender.image) if obj.sender.image else None

	def get_receiver_image(self, obj):
		return str(settings.MEDIA_URL) + str(obj.receiver.image) if obj.receiver.image else None

	def get_file(self, obj):
		return str(settings.MEDIA_URL) + str(obj.file) if obj.file else None

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by
		
	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class MessageSerializer(serializers.ModelSerializer):
	class Meta:
		model = Message
		fields = '__all__'

	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.created_by = user
		modelObject.save()
		return modelObject
	
	def update(self, instance, validated_data):
		modelObject = super().update(instance=instance, validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.updated_by = user
		modelObject.save()
		return modelObject




class TaskTypeListSerializer(serializers.ModelSerializer):
	created_by = serializers.SerializerMethodField(read_only=True)
	updated_by = serializers.SerializerMethodField(read_only=True)
	class Meta:
		model = TaskType
		fields = '__all__'
		extra_kwargs = {
			'created_at':{
				'read_only': True,
			},
			'updated_at':{
				'read_only': True,
			},
			'created_by':{
				'read_only': True,
			},
			'updated_by':{
				'read_only': True,
			},
		}

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by
		
	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class TaskTypeMinimalListSerializer(serializers.ModelSerializer):
	class Meta:
		model = TaskType
		fields = ['id', 'name']




class TaskTypeSerializer(serializers.ModelSerializer):
	class Meta:
		model = TaskType
		fields = '__all__'

	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.created_by = user
		modelObject.save()
		return modelObject
	
	def update(self, instance, validated_data):
		modelObject = super().update(instance=instance, validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.updated_by = user
		modelObject.save()
		return modelObject




class ToDoTaskListSerializer(serializers.ModelSerializer):
	user = AdminUserMinimalListSerializer()
	task_type = TaskTypeMinimalListSerializer()

	created_by = serializers.SerializerMethodField(read_only=True)
	updated_by = serializers.SerializerMethodField(read_only=True)
	class Meta:
		model = ToDoTask
		fields = '__all__'
		extra_kwargs = {
			'created_at':{
				'read_only': True,
			},
			'updated_at':{
				'read_only': True,
			},
			'created_by':{
				'read_only': True,
			},
			'updated_by':{
				'read_only': True,
			},
		}

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by
		
	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class ToDoTaskSerializer(serializers.ModelSerializer):
	class Meta:
		model = ToDoTask
		fields = '__all__'

	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.created_by = user
		modelObject.save()
		return modelObject
	
	def update(self, instance, validated_data):
		modelObject = super().update(instance=instance, validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.updated_by = user
		modelObject.save()
		return modelObject



