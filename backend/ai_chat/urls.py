from django.urls import path

from .views import AIAskView, AIStatusView


app_name = "ai_chat"

urlpatterns = [
    path("status/", AIStatusView.as_view(), name="status"),
    path("ask/", AIAskView.as_view(), name="ask"),
]
