from django.db import migrations


def populate_role_from_org_role(apps, schema_editor):
    User = apps.get_model('authentication', 'User')
    Role = apps.get_model('authentication', 'Role')

    roles_by_org_role = {
        'manager': Role.objects.get(name='MANAGER'),
        'moderator': Role.objects.get(name='MODERATOR'),
        'employee': Role.objects.get(name='EMPLOYEE'),
    }
    for org_role, role in roles_by_org_role.items():
        User.objects.filter(org_role=org_role).update(role=role)
    # Any row with an unrecognized/blank org_role (shouldn't exist given the
    # field's choices+default, but just in case) falls back to EMPLOYEE.
    User.objects.filter(role__isnull=True).update(role=roles_by_org_role['employee'])


def reverse_noop(apps, schema_editor):
    # org_role field still exists at this point in the reverse chain
    # (removed by the next migration) — nothing to restore here.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0013_seed_org_roles_and_permissions'),
    ]

    operations = [
        migrations.RunPython(populate_role_from_org_role, reverse_noop),
    ]
