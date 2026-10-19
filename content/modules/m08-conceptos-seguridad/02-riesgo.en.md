---
titulo: "Risk: threat, vulnerability and impact"
tiempo_min: 25
ultima_revision: 2026-10-18
---

## Summary (5 min)

Security doesn't aim for "zero risk" (impossible) but to **manage it**: understand what can happen, how likely it is, how much it would hurt, and what to do about it.

## The ingredients

- **Asset**: anything of value (data, systems, reputation, people).
- **Threat**: something or someone that can cause harm (an attacker, malware, human error, a fire).
- **Vulnerability**: a weakness a threat can exploit (unpatched software, weak password, missing process).
- **Likelihood** and **impact**: how possible it is and how severe it would be.
- **Control** (or countermeasure): what reduces likelihood or impact.

Simplified relation: **risk ≈ likelihood × impact**, where likelihood depends on a capable threat *and* an exploitable vulnerability both existing. Without a vulnerability or a threat, the risk of that scenario is low.

## Four ways to treat a risk

1. **Mitigate**: apply controls (patch, MFA, segment).
2. **Transfer**: insurance, third-party contracts.
3. **Accept**: knowingly assume it (documented, with an owner).
4. **Avoid**: eliminate the activity that causes it.

What remains after controls is **residual risk**.

## Severity ≠ risk

A "critical" vulnerability on an isolated server may matter less than a "medium" one on an internet-facing service that is already being exploited. Risk depends on **context**: exposure, asset value, compensating controls and evidence of active exploitation. You'll apply this in lesson 05.

## The NIST CSF 2.0 framework

The *Cybersecurity Framework 2.0* (NIST, Feb 26, 2024) organizes risk management into **six functions**:

| Function | Core idea |
|---|---|
| **Govern (GV)** | Cybersecurity risk strategy, policy, roles and oversight (includes organizational context and supply chain risk). *New in 2.0.* |
| **Identify (ID)** | Understand current assets, risks and context |
| **Protect (PR)** | Safeguards: identity and access, training, data and platform security |
| **Detect (DE)** | Find and analyze possible attacks and compromises |
| **Respond (RS)** | Take action on a detected incident |
| **Recover (RC)** | Restore affected operations and services |

It is a voluntary framework applicable to organizations of any size or sector.

## How it works in practice

For any system: list assets → identify realistic threats → find vulnerabilities → estimate impact/likelihood → choose controls → record what you accept. A **risk register** is the living document that holds this (covered in depth in M47).

## Common mistakes

- Treating everything as critical (if everything is a priority, nothing is).
- Measuring only the vulnerability and ignoring the affected asset.
- Accepting risks with no owner or review date.
- Thinking risk is purely technical: there is also legal, operational and reputational risk.

## Practice

Pick a service you use (email, banking). List 3 assets, 3 threats, 3 possible vulnerabilities and one control per scenario.

## References

- [NIST CSWP 29 – Cybersecurity Framework 2.0](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf)
