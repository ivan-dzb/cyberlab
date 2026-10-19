---
titulo: "Vocabulary: CVE, CWE, CVSS, EPSS and KEV"
tiempo_min: 30
ultima_revision: 2026-10-18
---

## Summary (5 min)

Five acronyms appear in every vulnerability report. They answer different questions:

| Acronym | Question it answers |
|---|---|
| **CVE** | What is *this specific* vulnerability called? |
| **CWE** | What *kind* of weakness is it? |
| **CVSS** | How *severe* is it in the abstract? |
| **EPSS** | How *likely* is it to be exploited soon? |
| **KEV** | Is it *already* being exploited for real? |

## CVE – the identifier

A **CVE** (*Common Vulnerabilities and Exposures*) is a public, unique identifier for a specific vulnerability in a specific product, formatted `CVE-YEAR-NUMBER` (for example `CVE-2021-44228`). A CVE is **not** a score or a patch; it's a common name so everyone talks about the same thing.

## CWE – the weakness class

**CWE** (*Common Weakness Enumeration*) is a community-developed list of software and hardware weaknesses: the generic *root cause* (for example "SQL injection", "buffer overflow"). Many different CVEs share the same CWE. It's useful for developers: eliminating a class of bug prevents many future CVEs. MITRE also publishes the annual *CWE Top 25*.

## CVSS – technical severity

**CVSS v4.0** (FIRST, released Nov 1, 2023) has four metric groups:

- **Base**: intrinsic characteristics. Exploitability: *Attack Vector* (Network/Adjacent/Local/Physical), *Attack Complexity*, *Attack Requirements*, *Privileges Required*, *User Interaction*. Impact on the vulnerable system (VC/VI/VA) and on subsequent systems (SC/SI/SA).
- **Threat**: adjusts for exploit maturity (replaces v3.1's "Temporal").
- **Environmental**: adjusts for your environment and compensating controls.
- **Supplemental**: extra context that does **not** change the score (e.g. *Automatable*, *Safety*).

Qualitative scale: None 0.0 · Low 0.1–3.9 · Medium 4.0–6.9 · High 7.0–8.9 · Critical 9.0–10.0.
Nomenclature: **CVSS-B** (Base only), **CVSS-BT**, **CVSS-BE**, **CVSS-BTE**. A bare "9.8" with no version or groups is incomplete information. CVSS v3.1 still appears widely in older databases.

> CVSS measures **severity**, not **risk**.

## EPSS – exploitation probability

**EPSS** (*Exploit Prediction Scoring System*, FIRST) is a machine-learning model estimating the probability a CVE will be exploited in the wild within the next 30 days. It publishes a daily score from 0 to 1 and a percentile per CVE; the data is free (CSV, API). It helps focus limited resources; it is **not** meant to decide alone.

## KEV – confirmed exploitation

The **KEV catalog** (*Known Exploited Vulnerabilities*, CISA) lists vulnerabilities with confirmed active exploitation. CISA says it should be used as an **input** to a prioritization framework. Each entry includes the CVE, date added, due date, and whether it's known to be used in ransomware campaigns.

**Current development:** in June 2026 CISA issued **BOD 26-04** (*Prioritizing Security Updates Based on Risk*), which per secondary coverage supersedes BOD 19-02 and BOD 22-01 and replaces "severity-only" priority with a risk model with remediation windows of 3, 14 or 60 days (or deferral). It applies to US federal agencies but is a good reference. *(Exact details still to be verified against the official text; see sources.)*

## How they combine (prioritization)

1. Is it in **KEV**? → top priority if the asset is relevant and exposed.
2. High **EPSS** → likely imminent exploitation.
3. **CVSS** (ideally BTE with your environment) → technical impact.
4. **Context**: internet exposure, asset value, compensating controls.

## Common mistakes

- Patching in CVSS-B order while ignoring exposure and real exploitation.
- Confusing CVE (instance) with CWE (class).
- Quoting "CVSS 9.8" without version or vector.
- Treating EPSS as certainty: it's a probability, not an individual prediction.
- Thinking "not in KEV" means "not exploited".

## Practice

Look up a recent CVE in NVD. Note: its CWE, CVSS vector (v3.1 or v4.0?), its EPSS (first.org/epss) and whether it's in KEV. Decide in what order you'd patch it versus another CVE with a different profile, and justify it.

## References

- [FIRST – CVSS v4.0 Specification](https://www.first.org/cvss/specification-document)
- [FIRST – EPSS](https://www.first.org/epss/)
- [CISA – KEV Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
- [MITRE – CWE](https://cwe.mitre.org/about/index.html)
