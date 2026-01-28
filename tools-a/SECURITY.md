# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please follow these steps:

1. **Do not** open a public issue on GitHub
2. Email the maintainers directly with details about the vulnerability
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond to your report within 48 hours and work with you to address the issue before making it public.

## Security Best Practices

When using this project:

- **Never commit sensitive data** (API keys, passwords, tokens) to version control
- **Use environment variables** for all configuration
- **Keep dependencies updated** regularly
- **Review code changes** before deploying to production
- **Use HTTPS** in production environments
- **Implement rate limiting** for production deployments
- **Monitor logs** for suspicious activity

## Known Security Considerations

- This tool interacts with ChatGPT's web interface and may be subject to their terms of service
- Puppeteer runs a full browser instance which may have security implications
- Ensure proper CORS configuration in production
- File uploads are limited to 10MB by default

## Disclosure Policy

- We will acknowledge receipt of your vulnerability report
- We will provide an estimated timeline for addressing the issue
- We will notify you when the vulnerability is fixed
- We will credit you in the security advisory (unless you prefer to remain anonymous)

Thank you for helping keep this project secure!

