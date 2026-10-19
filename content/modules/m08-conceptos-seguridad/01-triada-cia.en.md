---
titulo: The CIA triad and its extensions
tiempo_min: 20
ultima_revision: 2026-10-18
---

## Summary (5 min)

Nearly all information security can be described as protecting three properties: **Confidentiality**, **Integrity** and **Availability** (*CIA*). When someone says "this is a security problem", ask: which property was broken?

## The three properties

| Property | Definition (NIST) | Broken when… | Example |
|---|---|---|---|
| **Confidentiality** | "Preserving authorized restrictions on information access and disclosure" | an unauthorized party sees it | customer database leak |
| **Integrity** | "Guarding against improper information modification or destruction"; includes *non-repudiation* and authenticity | someone alters it without permission | an attacker changes a transfer's destination |
| **Availability** | timely and reliable access to information and services | you can't use it when you need it | ransomware encrypting servers |

The confidentiality and integrity definitions come from the NIST glossary (based on 44 U.S.C. §§ 3552 and 3542, FIPS 200).

## Common extensions

- **Authenticity**: is it who/what it claims to be (user, system, message)? Relies on authentication and signatures.
- **Non-repudiation**: the sender can't deny having performed an action (digital signatures, tamper-evident logs).
- **AAA**: *Authentication* (who are you?), *Authorization* (what may you do?), *Accounting* (what did you do?). These are the mechanisms that implement CIA.
- **Privacy** and **safety**: in medical or industrial systems an integrity failure can harm people, not just data. CVSS v4.0 includes *Safety* metrics for this reason.

## Trade-offs are the norm

Properties conflict. Encrypting everything improves confidentiality but complicates recovery (availability). A hospital alarm system prioritizes availability and integrity over confidentiality. **A good professional asks which property matters most in each context.**

## How it is attacked (conceptual view)

- Confidentiality: sniffing, SQL injection that extracts data, stolen credentials.
- Integrity: parameter tampering, man-in-the-middle, malware that alters files.
- Availability: DoS/DDoS, ransomware, data deletion.

You'll see concrete techniques in the web, network and malware modules, always in a lab.

## How it is defended

- Confidentiality: encryption in transit and at rest, access control, data classification.
- Integrity: hashes and signatures, version control, input validation, verified backups.
- Availability: redundancy, backups (3-2-1), rate limiting, continuity plans.

## Common mistakes

- Reducing "security" to confidentiality and ignoring integrity and availability.
- Believing encryption equals integrity (unauthenticated encryption can be malleable; you'll see AEAD/GCM in M06).
- Not defining which data is critical before choosing controls.

## Practice

Take three recent public incidents and classify which CIA properties were broken and how.

## References

- [NIST Glossary – Confidentiality](https://csrc.nist.gov/glossary/term/confidentiality)
- [NIST Glossary – Integrity](https://csrc.nist.gov/glossary/term/integrity)
- [FIRST – CVSS v4.0](https://www.first.org/cvss/specification-document)
