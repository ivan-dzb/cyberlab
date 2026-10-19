## What it is

**IDOR** (*Insecure Direct Object Reference*) happens when an application uses an identifier the user can see or change (a number in the URL, a parameter) to locate a resource, but **does not check that the resource belongs to them**.

Being logged in is not enough: authentication answers "who are you?" and authorization answers "may you see *this*?". It is a form of **broken access control**.

## Goal

Log in with the test account, review your invoices and open one that is not yours: the management one. The flag has the format `CYBERLAB{...}`.

## How to mitigate it

On the server, every time a resource is accessed, check that it belongs to the authenticated user (or that they have permission). Unpredictable identifiers (UUIDs) help, but do not replace the ownership check.
