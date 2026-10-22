# Cart label follow-up — 20 October 2026

The production desktop accessibility audit with one item in the cart still flagged a label-in-name mismatch: the two visible spans yielded `Coș1` as text content, while the button was named `Coș 1 produs`. An explicit whitespace text node between the spans makes the visible label and accessible name agree without changing the visual spacing. No migration or external configuration is required. Recheck the production desktop audit with a non-empty cart after deployment.

A live chatbot gift question containing `persoana` was incorrectly classified as requiring a human. The handoff matcher now keeps ordinary gift questions, including gifts for children, with the assistant while still escalating explicit requests for a real person, order issues, complaints and safety topics. A regression test covers these cases. Recheck one new live conversation after deployment.

Message timelines now use insertion order when timestamps match, so an assistant reply cannot appear before its visitor question merely because generated IDs sort differently.
