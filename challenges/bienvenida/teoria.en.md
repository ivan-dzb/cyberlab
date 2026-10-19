## What it is

A *flag* is a secret string that proves you completed a challenge. In this challenge the flag is hidden in a simple web page running in **your own container**, isolated from the network and from other users.

## What you should know

Everything a web server sends to your browser is within your reach: the HTML, the comments, the HTTP headers. The browser only displays part of it. Developer tools (F12) let you see the rest.

## Goal

Find the flag, which has the format `CYBERLAB{...}`.

## How to mitigate it

Never put secrets in HTML, comments or JavaScript sent to the client: anyone can read them.
