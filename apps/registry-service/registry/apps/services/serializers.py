from rest_framework import serializers

from apps.services.models import Service, ServiceEndpoint, ServiceVersion


class ServiceEndpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceEndpoint
        fields = "__all__"


class ServiceVersionSerializer(serializers.ModelSerializer):
    service_endpoints = ServiceEndpointSerializer(many=True, read_only=True)

    class Meta:
        model = ServiceVersion
        fields = "__all__"


class ServiceSerializer(serializers.ModelSerializer):
    versions = ServiceVersionSerializer(many=True, read_only=True)

    class Meta:
        model = Service
        fields = "__all__"
