# ADR 006: NATS over Kafka

- **Status:** Accepted

## Context
Ripplemark needs lightweight inter-service eventing and async triggers without high operational overhead.

## Decision
Use NATS as the messaging backbone instead of Kafka.

## Consequences
- **Positive:** Low-latency messaging with simple operations footprint suitable for current scale.
- **Positive:** Fast local development and easier platform bootstrap.
- **Negative:** Fewer built-in stream-processing capabilities than Kafka ecosystems.
- **Mitigation:** Revisit broker choice if throughput, retention, or stream analytics requirements outgrow NATS capabilities.
