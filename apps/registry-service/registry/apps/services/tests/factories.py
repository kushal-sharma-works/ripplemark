import factory
from django.utils import timezone

from apps.services.models import Service, ServiceEndpoint, ServiceVersion


class ServiceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Service

    name = factory.Sequence(lambda n: f"service-{n}")
    description = "Test service"
    service_type = Service.ServiceType.API
    status = Service.Status.ACTIVE


class ServiceVersionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ServiceVersion

    service = factory.SubFactory(ServiceFactory)
    version = "1.0.0"
    changelog = "Initial release"
    endpoints = []
    dependencies = []
    created_at = factory.LazyFunction(timezone.now)
    is_current = True


class ServiceEndpointFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ServiceEndpoint

    service_version = factory.SubFactory(ServiceVersionFactory)
    path = "/health"
    method = "GET"
    request_schema = {}
    response_schema = {}
