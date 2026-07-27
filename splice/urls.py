"""
URL routing for Splice REST API and Editor UI.

Routes for:
- Browser editor UI (/splice/editor/{project_id}/)
- REST API endpoints (/splice/api/v1/)
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from splice.views import (
    LocalEngineViewSet, LocalEngineSessionViewSet,
    LocalProcessingJobViewSet, RenderPlanViewSet,
    EditorProjectViewSet, EditorView,
)

app_name = 'splice'

router = DefaultRouter()
router.register(r'engines', LocalEngineViewSet, basename='local-engine')
router.register(r'sessions', LocalEngineSessionViewSet, basename='local-engine-session')
router.register(r'jobs', LocalProcessingJobViewSet, basename='local-processing-job')
router.register(r'render-plans', RenderPlanViewSet, basename='render-plan')
router.register(r'projects', EditorProjectViewSet, basename='editor-project')

urlpatterns = [
    # Browser editor UI
    path('editor/<uuid:project_id>/', EditorView.as_view(), name='editor'),

    # REST API
    path('api/v1/', include(router.urls)),
]
