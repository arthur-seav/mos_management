#!/usr/bin/env python3
"""Create private local configuration once; never overwrite existing settings."""
from pathlib import Path
import os
import secrets


def main():
    root = Path(__file__).resolve().parent.parent
    app = root / '.env'
    postgres = root / '.postgres.env'
    if app.exists() or postgres.exists():
        raise SystemExit('Refusing to overwrite existing .env or .postgres.env. Edit your existing files instead.')
    password = secrets.token_urlsafe(32)
    jwt = secrets.token_urlsafe(48)
    entries = {
        app: '\n'.join([
            'MOS_DB_URL=jdbc:postgresql://127.0.0.1:54322/mos',
            'MOS_DB_USER=mos',
            'MOS_DB_PASSWORD=' + password,
            'MOS_JWT_SECRET=' + jwt,
            'MOS_DEMO_ADMIN_PASSWORD=' + secrets.token_urlsafe(18),
            'MOS_DEMO_STAFF_PASSWORD=' + secrets.token_urlsafe(18), ''
        ]),
        postgres: '\n'.join(['POSTGRES_DB=mos', 'POSTGRES_USER=mos', 'POSTGRES_PASSWORD=' + password, ''])
    }
    for path, content in entries.items():
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as out:
            out.write(content)
    print('Created .env and .postgres.env (mode 0600). No secret values printed.')
    print('Demo account passwords are in .env. Open it locally in your editor when needed.')


if __name__ == '__main__':
    main()
