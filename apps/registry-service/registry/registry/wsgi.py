import os
from django.core.wsgi import get_wsgi_application
from registry.observability import setup_observability

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "registry.settings.dev")
setup_observability("registry-service")

application = get_wsgi_application()
