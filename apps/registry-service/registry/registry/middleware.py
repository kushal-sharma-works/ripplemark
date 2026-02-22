import uuid

import structlog
from django.utils.deprecation import MiddlewareMixin
from opentelemetry import trace


class CorrelationIdMiddleware(MiddlewareMixin):
    header_name = "X-Correlation-ID"

    def process_request(self, request):
        correlation_id = request.headers.get(self.header_name) or str(uuid.uuid4())
        request.correlation_id = correlation_id

        span = trace.get_current_span()
        span_context = span.get_span_context() if span else None
        trace_id = format(span_context.trace_id, "032x") if span_context and span_context.is_valid else None
        span_id = format(span_context.span_id, "016x") if span_context and span_context.is_valid else None

        request.trace_id = trace_id
        request.span_id = span_id
        structlog.contextvars.bind_contextvars(
            correlation_id=correlation_id,
            trace_id=trace_id,
            span_id=span_id,
        )

    def process_response(self, request, response):
        correlation_id = getattr(request, "correlation_id", None)
        if correlation_id:
            response[self.header_name] = correlation_id
        trace_id = getattr(request, "trace_id", None)
        span_id = getattr(request, "span_id", None)
        if trace_id:
            response["X-Trace-Id"] = trace_id
        if span_id:
            response["X-Span-Id"] = span_id
        structlog.contextvars.clear_contextvars()
        return response
