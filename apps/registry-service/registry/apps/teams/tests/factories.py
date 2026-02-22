import factory
from django.contrib.auth import get_user_model

from apps.services.models import Service
from apps.teams.models import ServiceOwnership, Team, TeamMembership

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"user-{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")


class TeamFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Team

    name = factory.Sequence(lambda n: f"Team {n}")
    description = "Team description"


class TeamMembershipFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TeamMembership

    team = factory.SubFactory(TeamFactory)
    user = factory.SubFactory(UserFactory)
    role = TeamMembership.Role.VIEWER


class ServiceOwnershipFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ServiceOwnership

    service = factory.Iterator(Service.objects.all())
    team = factory.SubFactory(TeamFactory)
    ownership_type = ServiceOwnership.OwnershipType.PRIMARY
