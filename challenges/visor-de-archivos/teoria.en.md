## What it is

**Path traversal** (or directory traversal) happens when an application builds a file path from a user-controlled value and **does not validate** that the result stays inside the intended folder.

In file systems, `..` means "the folder above". If the application joins `docs/` with what the user types, a name like `../../something` climbs up and can reach files that were never meant to be public: configuration, keys, source code.

## Goal

The viewer should only show public documents. The "About" page mentions where the company keeps its internal files. Read the `flag.txt` file in that folder. The flag has the format `CYBERLAB{...}`.

## How to mitigate it

- Don't build paths from user input; prefer identifiers that the server maps to files (allowlist).
- If unavoidable, resolve the final path and **check it is still inside** the base directory (`path.resolve` + prefix check).
- Run the service as a least-privilege user with access only to what it needs.
