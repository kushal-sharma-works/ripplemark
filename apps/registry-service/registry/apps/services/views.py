from rest_framework import viewsets

from apps.services.models import Service, ServiceEndpoint, ServiceVersion
from apps.services.serializers import (
    ServiceEndpointSerializer,
    ServiceSerializer,
    ServiceVersionSerializer,
)


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    filterset_fields = ["service_type", "status"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at", "updated_at"]


class ServiceVersionViewSet(viewsets.ModelViewSet):
    queryset = ServiceVersion.objects.select_related("service").all()
    serializer_class = ServiceVersionSerializer
    filterset_fields = ["service", "is_current"]
    search_fields = ["service__name", "version"]
    ordering_fields = ["created_at", "version"]


class ServiceEndpointViewSet(viewsets.ModelViewSet):
    queryset = ServiceEndpoint.objects.select_related("service_version").all()
    serializer_class = ServiceEndpointSerializer
    filterset_fields = ["service_version", "method"]
    search_fields = ["path"]
    ordering_fields = ["path"]
