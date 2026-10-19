## What it is

A *cookie* is a small piece of data the server asks the browser to store and send back on every request. It is used to remember who you are.

The problem appears when the server stores in the cookie something that **decides permissions** (for example, your role) and then accepts it without checking. Everything in the browser is controlled by the user: they can see it and change it. This is called **broken access control** and tops the OWASP Top 10 list.

## Goal

Log in with the guest account shown by the portal and reach the administration area. The flag has the format `CYBERLAB{...}`.

## How to mitigate it

Session state and permissions are stored **on the server**. The cookie only carries a long, random, unguessable identifier, or a signed value the server verifies. Every protected request checks permissions on the server.
