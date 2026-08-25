# Intelligence and verification governance

## Evidence pipeline

1. A researcher or opted-in contributor proposes a service, policy, consent-interface, or tracking observation.
2. ConsentLens stores only the provider-level observation; browsing destinations and personal records remain local.
3. A reviewer verifies the domain, source URL, scope, product, effective date, and confidence.
4. A reviewed record is added to `shared/intel/`, then compiled into the extension and read by the backend.
5. Material changes create a new record version or review date; stale records are marked accordingly.

## Public profiles

Public profiles show observed services, source-backed policy facts, confidence, sources, review date, and applicability. They distinguish an observed relationship from proof of personal-data transfer.

## Company claims and ConsentLens Verified

A claim proves neither compliance nor verification. It creates a manual review case. A future `ConsentLens Verified` status must include: domain-ownership validation, published control criteria, evidence review, scope, issue and expiry dates, periodic reassessment, public reasons for suspension/revocation, and an appeal path.

Payment may fund an assessment but can never suppress a public record, remove evidence, or change a rating without an underlying, reviewable change.
