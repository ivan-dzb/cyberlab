---
titulo: Secure design principles
tiempo_min: 25
ultima_revision: 2026-10-18
---

## Summary (5 min)

Some design ideas keep recurring since the 1970s because they work: reduce privileges, don't rely on a single barrier, fail safely, and don't trust by default. Understanding them lets you reason about systems you've never seen.

## Core principles

### Defense in depth
Multiple independent layers of control, so if one fails another contains the damage. Example: firewall + segmentation + authentication + encryption + monitoring + backups. No layer is perfect; together they raise the attacker's cost.

### Least privilege
Every user, process or service gets **only** the permissions needed for its task and only for as long as needed. A web service shouldn't run as administrator; a support account doesn't need payroll access.

### Separation of duties
Critical actions require more than one person or component (whoever approves a payment isn't whoever creates it).

### Secure defaults and fail-safe
The initial configuration must be the secure one; on error, the system must **deny** (*fail closed*), not allow.

### Economy of mechanism and open design
Simple things are easier to audit. Security shouldn't depend on design secrecy (*Kerckhoffs's principle*) but on key secrecy.

### Complete mediation
Every access to every resource is checked, always; no shortcuts like "they authenticated earlier".

### Zero Trust
Formalized by NIST in **SP 800-207** (August 2020): the focus moves from defending a perimeter to protecting users, assets and resources. No network location or device ownership grants **implicit trust**; user and device authentication and authorization happen **before** each session with a resource begins. It is not a product; it is an architectural approach.

## How the absence of these principles is attacked

- Without least privilege, compromising one service grants total control (privilege escalation).
- Without defense in depth, a single web vulnerability exposes the whole internal network.
- With implicit trust in the internal network, an attacker who gets in through phishing moves laterally unopposed.

## How it is defended

Apply the principles as a **design review**: for each component ask (1) what privileges does it really have?, (2) what happens if it fails or is compromised?, (3) what other layer contains it?, (4) what checks each access?

## Common mistakes

- Confusing "having a firewall" with defense in depth.
- Granting broad permissions "temporarily" that are never revoked.
- Believing Zero Trust can be bought: it's a strategy spanning identity, devices, network, data and continuous monitoring.
- Security through obscurity as the only protection.

## Practice

Review your lab (M11 once you build it): which service runs with more privileges than it needs? Which layer contains the damage if it falls?

## References

- [NIST SP 800-207 – Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final)
- Saltzer & Schroeder, *The Protection of Information in Computer Systems* (1975) – classic design principles paper.
