---
titulo: Threat actors and motivations
tiempo_min: 20
ultima_revision: 2026-10-18
---

## Summary (5 min)

Defending well requires knowing **against whom** and **why**. A curious student, a ransomware gang and a state intelligence service have very different resources, patience and goals; your controls must match the realistic adversary.

## Actor categories

| Actor | Typical motivation | Resources / sophistication | Example target |
|---|---|---|---|
| **Cybercriminals** | Money | Variable; professional ecosystem (access brokers, ransomware-as-a-service) | extortion, fraud, credential theft |
| **Nation-states / APTs** | Espionage, sabotage, influence | High; long, stealthy operations | government, defense, critical infrastructure |
| **Hacktivists** | Ideology | Low–medium | defacement, leaks, DDoS |
| **Insiders** | Money, revenge, negligence | Legitimate access already granted | exfiltration, sabotage, mistakes |
| **Hobbyists / script kiddies** | Curiosity, reputation | Low; use others' tools | opportunistic scanning |
| **Researchers** (white/gray hat) | Improve security, recognition | Variable | disclosure, bug bounty |

The classification is a simplification: actors overlap (criminals with state backing, recruited insiders).

## Useful concepts

- **TTP** (*Tactics, Techniques, Procedures*): how an actor operates. **MITRE ATT&CK** is the standard knowledge base for describing them (you'll meet it in M09).
- **IOC** (indicator of compromise) vs **TTP**: IOCs (hashes, IPs) expire quickly; TTPs are harder for the attacker to change.
- **Attack surface**: all the points where an actor can try to get in.
- **Opportunistic vs targeted**: most attacks are opportunistic (they look for easy wins), so basic hygiene (patching, MFA, backups) blocks a large share.
- **Attribution**: identifying the actor is hard and often uncertain; serious reports state confidence levels.

## How it is applied

When modeling risk you ask: who would want this? what capability do they have? what path would they use? (formalized as *threat modeling*, M35). A small business mostly defends against opportunistic crime; a critical infrastructure provider must consider advanced adversaries.

## Common mistakes

- "Nobody would attack me": automated attacks don't discriminate.
- Obsessing over the exotic attacker while neglecting phishing and weak credentials.
- Ignoring the insider, including the accidental one.
- Attributing with certainty from a single indicator.

## Practice

For three organizations (clinic, online store, municipality) write the most likely actor, their motivation and their most realistic entry path.

## References

- [MITRE ATT&CK](https://attack.mitre.org/) (groups and techniques)
- Actor and vector statistics: see the latest *Verizon DBIR* and *Mandiant M-Trends* (verified figures still to be added).
