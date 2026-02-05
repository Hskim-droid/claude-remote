# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please do **NOT** open a public issue.

Instead, please report it privately by emailing the maintainer or using GitHub's private vulnerability reporting feature.

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Fix Timeline**: Depends on severity

## Security Measures

This project implements:
- Input validation and sanitization
- Path traversal prevention
- Rate limiting
- Session name restrictions
- Optional authentication for ttyd

## Best Practices for Users

1. **Use Tailscale** for remote access instead of exposing ports directly
2. **Enable ttyd authentication** if accessible from untrusted networks
3. **Keep dependencies updated**: Run `npm audit` regularly
4. **Restrict allowed paths** in configuration
