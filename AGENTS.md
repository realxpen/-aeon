# AEON Engineering Instructions

## Product
AEON is an agent-native commerce experience built for the WebMCP Challenge. The core experience is: human intent -> agent constitution -> WebMCP tools -> marketplace actions -> negotiation -> human approval -> completion.

## Architecture
Keep UI, agent runtime, WebMCP adapters, business services, and persistence separated. WebMCP tools must call real application capabilities; do not create decorative/fake tool integrations.

## Safety and authority
The Agent Constitution is enforced server-side. Search, comparison, bundling, and negotiation within limits may run autonomously. Consequential purchase actions require explicit human approval.

## Demo mission
"Build me the best creator setup under ₦1M. Prioritize performance and audio quality. You can negotiate, but ask me before purchasing."

## Build discipline
Prefer the smallest reliable vertical slice. Every milestone should be runnable and verifiable before adding the next major capability. Avoid unnecessary infrastructure for the hackathon MVP.
