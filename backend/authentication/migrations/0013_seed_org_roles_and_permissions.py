from django.db import migrations


ROLE_NAMES = ['MANAGER', 'MODERATOR', 'EMPLOYEE']
PERMISSION_NAMES = ['ADD_EMPLOYEES', 'MANAGE_SUBSCRIPTION', 'MANAGE_QR']
# Managers get every capability unconditionally, matching the prior
# org_role-based is_manager() shortcut. Moderators/Employees get none here —
# a Moderator's extra capabilities stay gated by the per-organization
# moderator_can_* toggles, not by this Permission set.
MANAGER_PERMISSIONS = PERMISSION_NAMES


def seed_roles_and_permissions(apps, schema_editor):
    Role = apps.get_model('authentication', 'Role')
    Permission = apps.get_model('authentication', 'Permission')

    roles = {}
    for name in ROLE_NAMES:
        role, _ = Role.objects.get_or_create(name=name)
        roles[name] = role

    permissions = {}
    for name in PERMISSION_NAMES:
        permission, _ = Permission.objects.get_or_create(name=name)
        permissions[name] = permission

    manager_role = roles['MANAGER']
    manager_role.permissions.set([permissions[name] for name in MANAGER_PERMISSIONS])


def unseed_roles_and_permissions(apps, schema_editor):
    Role = apps.get_model('authentication', 'Role')
    Permission = apps.get_model('authentication', 'Permission')
    Role.objects.filter(name__in=ROLE_NAMES).delete()
    Permission.objects.filter(name__in=PERMISSION_NAMES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0012_user_expo_push_token'),
    ]

    operations = [
        migrations.RunPython(seed_roles_and_permissions, unseed_roles_and_permissions),
    ]
