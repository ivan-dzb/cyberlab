## What it is

A **SQL injection** happens when an application builds a database query by **pasting user-typed text** into the statement. If that text contains SQL syntax, the database cannot tell *data* from *code*: it runs everything.

For example, a typical login does something like this:

```sql
SELECT * FROM users WHERE username = '<what you type>' AND password = '<what you type>'
```

If what you type includes a single quote, you can close the string and change the query's logic. It is one of the oldest web vulnerabilities and is still in the OWASP Top 10 (*Injection*).

## Goal

Log in as the administrator without knowing their password. The flag has the format `CYBERLAB{...}`.

## How to mitigate it

Use **parameterized queries** (*prepared statements*): the statement and the data travel separately, and data is never interpreted as SQL. Also apply least privilege to the database account and do not show internal errors to the user.
