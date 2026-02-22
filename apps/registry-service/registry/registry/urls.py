from django.contrib import admin
from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.services.views import ServiceEndpointViewSet, ServiceVersionViewSet, ServiceViewSet
from apps.snapshots.views import DependencySnapshotViewSet
from apps.teams.views import ServiceOwnershipViewSet, TeamMembershipViewSet, TeamViewSet
from registry.health_views import live, metrics, ready

router = DefaultRouter()
router.register(r"services", ServiceViewSet, basename="service")
router.register(r"service-versions", ServiceVersionViewSet, basename="service-version")
router.register(r"service-endpoints", ServiceEndpointViewSet, basename="service-endpoint")
router.register(r"teams", TeamViewSet, basename="team")
router.register(r"team-memberships", TeamMembershipViewSet, basename="team-membership")
router.register(r"ownerships", ServiceOwnershipViewSet, basename="ownership")
router.register(r"snapshots", DependencySnapshotViewSet, basename="snapshot")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/drf-token/", obtain_auth_token, name="drf_token"),
    path("health/live", live, name="health_live"),
    path("health/ready", ready, name="health_ready"),
    path("metrics", metrics, name="metrics"),
]
