import os
from django.core.asgi import get_asgi_application
from registry.observability import setup_observability

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "registry.settings.dev")
setup_observability("registry-service")

application = get_asgi_application()
