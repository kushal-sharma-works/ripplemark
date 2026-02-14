import uuid

from django.utils.deprecation import MiddlewareMixin


class CorrelationIdMiddleware(MiddlewareMixin):
    header_name = "X-Correlation-ID"

    def process_request(self, request):
        correlation_id = request.headers.get(self.header_name) or str(uuid.uuid4())
        request.correlation_id = correlation_id

    def process_response(self, request, response):
        correlation_id = getattr(request, "correlation_id", None)
        if correlation_id:
            response[self.header_name] = correlation_id
        return response
