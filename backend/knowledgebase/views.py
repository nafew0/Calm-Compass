from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from subscriptions.services import LicenseService

from .models import Behavior, BehaviorCategory, DecoderState
from .serializers import (
    BehaviorCategorySerializer,
    BehaviorCategoryDetailSerializer,
    BehaviorDetailSerializer,
    BehaviorListSerializer,
    DecoderStateSerializer,
)


class HasCalmCompassAccess(permissions.BasePermission):
    message = "You do not have access to CalmCompass."

    def has_permission(self, request, view):
        return LicenseService.has_calm_compass_access(request.user)


def get_published_behaviors_queryset():
    return Behavior.objects.select_related("category").filter(
        is_published=True,
        category__is_active=True,
    )


def get_category_queryset():
    return BehaviorCategory.objects.filter(is_active=True).annotate(
        behavior_count=Count(
            "behaviors",
            filter=Q(behaviors__is_published=True),
        )
    )


def get_empty_decoder_state_payload():
    return {"behavior": None, "viewed_at": None}


class BehaviorCategoryListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, HasCalmCompassAccess]
    serializer_class = BehaviorCategorySerializer
    pagination_class = None

    def get_queryset(self):
        return (
            get_category_queryset()
            .filter(behavior_count__gt=0)
            .order_by("display_order", "name")
        )


class BehaviorCategoryDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated, HasCalmCompassAccess]
    serializer_class = BehaviorCategoryDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return get_category_queryset().prefetch_related(
            Prefetch(
                "behaviors",
                queryset=get_published_behaviors_queryset().order_by("title"),
                to_attr="published_behaviors",
            )
        )


class BehaviorListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, HasCalmCompassAccess]
    serializer_class = BehaviorListSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = get_published_behaviors_queryset()
        search_query = (self.request.query_params.get("search") or "").strip()
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) | Q(search_text__icontains=search_query)
            )
        return queryset.order_by("category__display_order", "title")


class BehaviorDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated, HasCalmCompassAccess]
    serializer_class = BehaviorDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return get_published_behaviors_queryset()


class DecoderStateView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasCalmCompassAccess]

    def get(self, request):
        state = (
            DecoderState.objects.select_related("last_viewed_behavior__category")
            .filter(user=request.user)
            .first()
        )
        if state is None or state.last_viewed_behavior is None:
            return Response(get_empty_decoder_state_payload())
        return Response(DecoderStateSerializer(state).data)


class BehaviorViewTrackingView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasCalmCompassAccess]

    def post(self, request, slug):
        behavior = get_object_or_404(get_published_behaviors_queryset(), slug=slug)
        state, _ = DecoderState.objects.update_or_create(
            user=request.user,
            defaults={
                "last_viewed_behavior": behavior,
                "last_viewed_at": timezone.now(),
            },
        )
        state.last_viewed_behavior = behavior
        return Response(DecoderStateSerializer(state).data)
