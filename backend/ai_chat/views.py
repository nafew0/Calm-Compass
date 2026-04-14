from django.http import Http404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from subscriptions.services import LicenseService

from .serializers import AIAskRequestSerializer, AIAskResponseSerializer, AIStatusSerializer
from .services import AIChatProviderError, AIChatService, AIChatUnavailableError


class HasCalmCompassAccess(permissions.BasePermission):
    message = "You do not have access to CalmCompass."

    def has_permission(self, request, view):
        return LicenseService.has_calm_compass_access(request.user)


class AIStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasCalmCompassAccess]

    def get(self, request):
        payload = AIChatService.get_status(request.user)
        return Response(AIStatusSerializer(payload).data)


class AIAskView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasCalmCompassAccess]

    def post(self, request):
        serializer = AIAskRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payload = AIChatService.ask(
                user=request.user,
                behavior_slug=serializer.validated_data["behavior_slug"],
                question=serializer.validated_data["question"],
            )
        except Http404:
            raise
        except AIChatUnavailableError as exc:
            return Response(
                {
                    "detail": exc.message,
                    **exc.status_payload,
                },
                status=exc.status_code,
            )
        except AIChatProviderError as exc:
            status_payload = AIChatService.get_status(request.user)
            return Response(
                {
                    "detail": str(exc),
                    **status_payload,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(AIAskResponseSerializer(payload).data)
