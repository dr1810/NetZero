from django.conf import settings
from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0012_add_modulation_event'),
    ]

    operations = [
        migrations.CreateModel(
            name='PlannerRecommendation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('device_type', models.CharField(max_length=32)),
                ('flexibility_level', models.CharField(default='medium', max_length=16)),
                ('duration_hours', models.FloatField(validators=[django.core.validators.MinValueValidator(0.5)])),
                ('earliest_start', models.TimeField()),
                ('latest_finish', models.TimeField()),
                ('recommended_start_at', models.DateTimeField()),
                ('recommended_end_at', models.DateTimeField()),
                ('carbon_intensity', models.FloatField()),
                ('estimated_savings_kg', models.FloatField(default=0.0)),
                ('alternatives', models.JSONField(blank=True, default=list)),
                ('action_type', models.CharField(choices=[('SAVE_ONLY', 'Save Only'), ('SCHEDULE_MODULATION', 'Schedule Modulation')], default='SAVE_ONLY', max_length=24)),
                ('status', models.CharField(choices=[('SAVED', 'Saved'), ('PENDING', 'Pending Execution'), ('EXECUTED', 'Executed'), ('FAILED', 'Failed')], default='SAVED', max_length=16)),
                ('scheduled_for', models.DateTimeField(blank=True, null=True)),
                ('executed_at', models.DateTimeField(blank=True, null=True)),
                ('execution_result', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('building', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='planner_recommendations', to='api.buildingprofile')),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='planner_recommendations', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.AddIndex(
            model_name='plannerrecommendation',
            index=models.Index(fields=['status', 'scheduled_for'], name='idx_planner_status_schedule'),
        ),
        migrations.AddIndex(
            model_name='plannerrecommendation',
            index=models.Index(fields=['building', 'created_at'], name='idx_planner_building_created'),
        ),
    ]