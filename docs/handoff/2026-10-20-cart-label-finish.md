# Cart label follow-up — 20 October 2026

The production desktop accessibility audit with one item in the cart still flagged a label-in-name mismatch: the two visible spans yielded `Coș1` as text content, while the button was named `Coș 1 produs`. An explicit whitespace text node between the spans makes the visible label and accessible name agree without changing the visual spacing. No migration or external configuration is required. Recheck the production desktop audit with a non-empty cart after deployment.
