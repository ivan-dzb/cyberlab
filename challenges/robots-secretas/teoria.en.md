## What it is

A website almost always has more pages than it links to. Part of reconnaissance is **discovering content that does not appear in the navigation**: internal panels, backups, old versions.

There is a file meant for search engines, `robots.txt`, that tells crawlers which paths they should **not** index. It is public: anyone can read it.

## Goal

The store keeps an internal section holding a key. Find it. The flag has the format `CYBERLAB{...}`.

## How to mitigate it

`robots.txt` is not a security control: asking a crawler to stay out does not stop a human, and it even announces where the sensitive paths are. Anything that must not be public has to be protected with authentication and authorization.
