from django.contrib.auth import get_user_model
from django.conf import settings

from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from django_currentuser.middleware import (get_current_authenticated_user, get_current_user)

from djoser.serializers import UserCreateSerializer

from authentication.models import *

User = get_user_model()





class PermissionListSerializer(serializers.ModelSerializer):
	created_by = serializers.SerializerMethodField()
	updated_by = serializers.SerializerMethodField()
	class Meta:
		model = Permission
		fields = '__all__'

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by
		
	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class PermissionMinimalSerializer(serializers.ModelSerializer):
	class Meta:
		model = Permission
		fields = ['id', 'name']




class PermissionSerializer(serializers.ModelSerializer):
	class Meta:
		model = Permission
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




class RoleListSerializer(serializers.ModelSerializer):
	created_by = serializers.SerializerMethodField()
	updated_by = serializers.SerializerMethodField()
	class Meta:
		model = Role
		fields = '__all__'

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by
		
	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class RoleMinimalListSerializer(serializers.ModelSerializer):
	class Meta:
		model = Role
		fields = ['id', 'name']




class RoleSerializer(serializers.ModelSerializer):
	class Meta:
		model = Role
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




class DesignationListSerializer(serializers.ModelSerializer):
	created_by = serializers.SerializerMethodField()
	updated_by = serializers.SerializerMethodField()
	class Meta:
		model = Designation
		fields = '__all__'

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by
		
	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class DesignationMinimalListSerializer(serializers.ModelSerializer):
	class Meta:
		model = Designation
		fields = ['id', 'name']




class DesignationSerializer(serializers.ModelSerializer):
	class Meta:
		model = Designation
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






# Djoser user serializer used in settings.py
class UserSerializer(UserCreateSerializer):
	class Meta(UserCreateSerializer.Meta):
		model = User
		fields = ('id', 'email', 'first_name', 'last_name', 'password')


# Don't delete it



class AdminUserListSerializer(serializers.ModelSerializer):
	role = serializers.SerializerMethodField()
	thana = serializers.SerializerMethodField()
	city = serializers.SerializerMethodField()
	country = serializers.SerializerMethodField()
	created_by = serializers.SerializerMethodField()
	updated_by = serializers.SerializerMethodField()
	
	class Meta:
		model = User
		exclude = ['password']
	
	def get_role(self, obj):
		return obj.role.name if obj.role else obj.role

	def get_thana(self, obj):
		return obj.thana.name if obj.thana else obj.thana
	
	def get_city(self, obj):
		return obj.city.name if obj.city else obj.city
	
	def get_country(self, obj):
		return obj.country.name if obj.country else obj.country
	
	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by
		
	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class AdminUserMinimalListSerializer(serializers.ModelSerializer):
	image = serializers.SerializerMethodField()
	class Meta:
		model = User
		fields = ['id', 'email', 'first_name', 'last_name', 'username', 'image']

	def get_image(self, obj):
		return str(settings.MEDIA_URL) + str(obj.image) if obj.image else None




class AdminUserListSerializerForGeneralUse(serializers.ModelSerializer):
	thana = serializers.SerializerMethodField()
	city = serializers.SerializerMethodField()
	country = serializers.SerializerMethodField()
	created_by = serializers.SerializerMethodField()
	updated_by = serializers.SerializerMethodField()
	
	class Meta:
		model = User
		exclude = ['password', 'role', 'user_type', 'last_login']
	
	def get_thana(self, obj):
		return obj.thana.name if obj.thana else obj.thana
	
	def get_city(self, obj):
		return obj.city.name if obj.city else obj.city
	
	def get_country(self, obj):
		return obj.country.name if obj.country else obj.country
	
	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by
		
	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class AdminUserSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = '__all__'

		extra_kwargs = {
			'password': {
				'write_only': True,
				'required': False,
			},
		}

	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		modelObject.set_password(validated_data["password"])
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




class CountryListSerializer(serializers.ModelSerializer):
	created_by = AdminUserMinimalListSerializer()
	updated_by = AdminUserMinimalListSerializer()
	class Meta:
		model = Country
		fields = '__all__'




class CountryMinimalListSerializer(serializers.ModelSerializer):
	class Meta:
		model = Country
		fields = ['id', 'name']




class CountrySerializer(serializers.ModelSerializer):
	class Meta:
		model = Country
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




class CityListSerializer(serializers.ModelSerializer):
	country = CountryMinimalListSerializer()
	created_by = AdminUserMinimalListSerializer()
	updated_by = AdminUserMinimalListSerializer()
	class Meta:
		model = City
		fields = '__all__'




class CityMinimalListSerializer(serializers.ModelSerializer):
	class Meta:
		model = City
		fields = ['id', 'name']




class CitySerializer(serializers.ModelSerializer):
	class Meta:
		model = City
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




class ThanaListSerializer(serializers.ModelSerializer):
	city = CityMinimalListSerializer()
	created_by = AdminUserMinimalListSerializer()
	updated_by = AdminUserMinimalListSerializer()
	class Meta:
		model = Thana
		fields = '__all__'
		



class ThanaMinimalListSerializer(serializers.ModelSerializer):
	class Meta:
		model = Thana
		fields = ['id', 'name']




class ThanaSerializer(serializers.ModelSerializer):
	class Meta:
		model = Thana
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




class AreaListSerializer(serializers.ModelSerializer):
	thana = ThanaMinimalListSerializer()
	city = CityMinimalListSerializer()
	country = CountryMinimalListSerializer()
	created_by = AdminUserMinimalListSerializer()
	updated_by = AdminUserMinimalListSerializer()
	class Meta:
		model = Area
		fields = '__all__'




class AreaMinimalListSerializer(serializers.ModelSerializer):
	class Meta:
		model = Area
		fields = ['id', 'name']




class AreaSerializer(serializers.ModelSerializer):
	class Meta:
		model = Area
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




class BranchListSerializer(serializers.ModelSerializer):
	thana = ThanaMinimalListSerializer()
	city = CityMinimalListSerializer()
	country = CountryMinimalListSerializer()
	created_by = AdminUserMinimalListSerializer()
	updated_by = AdminUserMinimalListSerializer()
	class Meta:
		model = Branch
		fields = '__all__'




class BranchMinimalListSerializer(serializers.ModelSerializer):
	class Meta:
		model = Branch
		fields = ['id', 'name', ]
		



class BranchSerializer(serializers.ModelSerializer):
	class Meta:
		model = Branch
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




class DepartmentListSerializer(serializers.ModelSerializer):
	created_by = serializers.SerializerMethodField()
	updated_by = serializers.SerializerMethodField()
	class Meta:
		model = Department
		fields = '__all__'

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by
		
	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class DepartmentMinimalListSerializer(serializers.ModelSerializer):
	class Meta:
		model = Department
		fields = ['id', 'name']




class DepartmentSerializer(serializers.ModelSerializer):
	class Meta:
		model = Department
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




class EmployeeListSerializer(serializers.ModelSerializer):
	role = RoleMinimalListSerializer()
	thana = ThanaMinimalListSerializer()
	city = CityMinimalListSerializer()
	country = CountryMinimalListSerializer()
	department = DepartmentMinimalListSerializer()
	branch = BranchMinimalListSerializer()
	created_by = AdminUserMinimalListSerializer()
	updated_by = AdminUserMinimalListSerializer()
	class Meta:
		model = Employee
		exclude = ['password']




class EmployeeMinimalListSerializer(serializers.ModelSerializer):
	class Meta:
		model = Employee
		fields = ['id', 'email', 'first_name', 'last_name', 'username']




class EmployeeSerializer(serializers.ModelSerializer):
	class Meta:
		model = Employee
		fields = '__all__'

		extra_kwargs = {
			'password': {
				'write_only': True,
				'required': False,
			}
		}
	
	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		modelObject.set_password(validated_data["password"])

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




class VendorListSerializer(serializers.ModelSerializer):
	role = RoleMinimalListSerializer()
	thana = ThanaMinimalListSerializer()
	city = CityMinimalListSerializer()
	country = CountryMinimalListSerializer()
	branch = BranchMinimalListSerializer()
	created_by = AdminUserMinimalListSerializer()
	updated_by = AdminUserMinimalListSerializer()
	class Meta:
		model = Vendor
		exclude = ['password', ]




class VendorMinimalListSerializer(serializers.ModelSerializer):
	class Meta:
		model = Vendor
		fields = ['id', 'name']




class VendorSerializer(serializers.ModelSerializer):
	class Meta:
		model = Vendor
		fields = '__all__'

		extra_kwargs = {
			'password': {
				'write_only': True,
				'required': False,
			}
		}
	
	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		modelObject.set_password(validated_data["password"])

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




class CustomerTypeListSerializer(serializers.ModelSerializer):
	created_by = serializers.SerializerMethodField()
	updated_by = serializers.SerializerMethodField()
	class Meta:
		model = CustomerType
		fields = '__all__'

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by
		
	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class CustomerTypeMinimalListSerializer(serializers.ModelSerializer):
	class Meta:
		model = CustomerType
		fields = ['id', 'name']




class CustomerTypeSerializer(serializers.ModelSerializer):
	class Meta:
		model = CustomerType
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




class CustomerListSerializer(serializers.ModelSerializer):
	role = RoleMinimalListSerializer()
	customer_type = CustomerTypeMinimalListSerializer()
	thana = ThanaMinimalListSerializer()
	city = CityMinimalListSerializer()
	country = CountryMinimalListSerializer()
	branch = BranchMinimalListSerializer()
	created_by = AdminUserMinimalListSerializer()
	updated_by = AdminUserMinimalListSerializer()
	class Meta:
		model = Customer
		exclude = ['password']




class CustomerMinimalListSerializer(serializers.ModelSerializer):
	class Meta:
		model = Customer
		fields = ['id', 'name']




class CustomerSerializer(serializers.ModelSerializer):
	class Meta:
		model = Customer
		fields = '__all__'

		extra_kwargs = {
			'password': {
				'write_only': True,
				'required': False,
			}
		}
	
	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		modelObject.set_password(validated_data["password"])
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




class QualificationListSerializer(serializers.ModelSerializer):
	employee = EmployeeMinimalListSerializer()
	created_by = AdminUserMinimalListSerializer()
	updated_by = AdminUserMinimalListSerializer()
	class Meta:
		model = Qualification
		fields = '__all__'




class QualificationMinimalListSerializer(serializers.ModelSerializer):
	class Meta:
		model = Qualification
		fields = ['id', 'name']




class QualificationSerializer(serializers.ModelSerializer):
	class Meta:
		model = Qualification
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




class LoginHistoryListSerializer(serializers.ModelSerializer):
	created_by = serializers.SerializerMethodField()
	updated_by = serializers.SerializerMethodField()
	class Meta:
		model = LoginHistory
		fields = '__all__'
	
	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by
		
	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class LoginHistorySerializer(serializers.ModelSerializer):
	class Meta:
		model = LoginHistory
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




class PasswordChangeSerializer(serializers.Serializer):
	password = serializers.CharField(max_length=64)
	confirm_password = serializers.CharField(max_length=64)
















