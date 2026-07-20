# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |

## Reporting a Vulnerability

Report potential vulnerabilities through [GitHub Private Vulnerability Reporting](https://github.com/kim1124/comins-table/security/advisories/new). Do not open a public issue, pull request, or discussion for an unpatched vulnerability.

Include the affected version, impact, reproduction steps or a proof of concept, and any known mitigations. Do not include credentials, personal data, or unrelated production data.

## Response Process

- The maintainer targets an initial acknowledgement within three business days.
- The report will be triaged for impact, exploitability, affected versions, and an appropriate disclosure plan.
- The reporter will receive a status update at least every seven days while investigation or remediation remains active.
- Remediation timing depends on severity, complexity, and release risk. A fixed patch deadline is not guaranteed.

## Release Security Controls

- Keep Private Vulnerability Reporting, dependency alerts, secret scanning, and push protection active.
- Require maintainer two-factor authentication for account and release approval.
- Publish only through `.github/workflows/publish.yml`, the GitHub `npm` environment, and the registered npm trusted publisher.
- Use OIDC trusted publishing and `npm stage publish`; do not create or store a long-lived npm automation token for releases.
- Verify the requested package version, the consumer install, the complete project gate, and the dry-run package contents before staging a release.

## Coordinated Disclosure

The maintainer and reporter should coordinate public disclosure after a remediation or mitigation is available. The maintainer will decide whether to publish a GitHub security advisory or request a CVE based on the confirmed impact.
