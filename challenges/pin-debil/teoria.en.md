## What it is

A **brute-force** attack tries every possible combination until it finds the right one. It is feasible when the space of possibilities is small **and** the system does not slow down attempts.

A 4-digit PIN has only 10,000 combinations. Trying them by hand is tedious, but a program does it in seconds. That is why the security of a short secret depends on the system **limiting attempts**.

## Goal

Open the safe. The PIN is different in every session, so it cannot be memorized: it has to be found. The flag has the format `CYBERLAB{...}`.

## How to mitigate it

- Limit attempts (*rate limiting*) and temporarily lock out after several failures.
- Add increasing delays between attempts.
- Require longer secrets or a second factor.
- Log and alert on many failed attempts from one source.
