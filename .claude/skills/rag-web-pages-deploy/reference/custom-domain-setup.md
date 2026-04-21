# Custom domain setup — deferred

**verified:** 2026-04-21
**status:** not executed in v1; documented for future activation
**re-verify cadence:** verify the DNS IPs against GitHub docs before acting on this file

Setting up a custom domain (e.g., `ronin-advisory-group.com`) on the rag-web GitHub Pages site when the operator decides to attach one. Included here so the runbook exists before it's needed.

## DNS records (at the domain registrar)

### Apex domain (`ronin-advisory-group.com`)

Create four `A` records pointing at GitHub's Pages IPs:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

And one `AAAA` record set for IPv6:

```
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

### Subdomain (`www.ronin-advisory-group.com`)

A `CNAME` record pointing to `<owner>.github.io` (not to the full Pages URL — just the user/org subdomain).

### Before committing

Re-verify these IPs against https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site. GitHub has rotated Pages IPs historically; the registrar records must match whatever GitHub's docs say at the time of setup, not what this file was authored with.

## Repository configuration

1. Add a file `site/CNAME` containing exactly the domain on a single line (no protocol, no trailing slash, no trailing newline).
2. Commit.
3. The next deploy writes the CNAME into the Pages configuration.
4. In Settings → Pages, confirm the custom domain populates and the DNS check passes.
5. Wait for the HTTPS certificate to provision — up to 24 hours. This is Let's Encrypt via GitHub; not operator-controlled.
6. Enable **Enforce HTTPS** once the cert is ready.

## Interaction with the artifact root

Because rag-web's artifact root is `site/`, the CNAME file lives at `site/CNAME` and gets uploaded in the artifact. **Do not** put CNAME at the repo root — the builder only sees the artifact.

## Rollback of a custom domain

Remove the `site/CNAME` file and re-deploy. The site reverts to `<owner>.github.io/<repo>/`. DNS propagation may take up to 24 hours to fully revert at all resolvers.

## Subdomain vs apex trade-off

- **Subdomain (`www.`)** — simpler DNS (single CNAME), faster to provision, harder for visitors to remember, won't work if someone types the bare domain without registrar-level redirect.
- **Apex (bare domain)** — needs A+AAAA records, requires GitHub's IPs to remain stable (they do, but historical churn exists), and is what most visitors type.

Apex + automatic `www.` → apex redirect (configurable at the registrar) is the modern default.

## HTTPS enforcement

GitHub Pages provisions Let's Encrypt certificates automatically for custom domains that resolve to GitHub's IPs. "Enforce HTTPS" in Settings → Pages can only be enabled after the cert provisions. Without enforcement, both `http://` and `https://` serve content, which confuses browsers' mixed-content policies.
