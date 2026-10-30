#!/usr/bin/env python3
"""Stdlib tests for local configuration safety and destructive-smoke guards."""
import hashlib
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent.parent


class LocalToolsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR'))
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'scripts').mkdir()
        self.script = self.root / 'scripts/configure-local.py'
        shutil.copyfile(ROOT / 'scripts/configure-local.py', self.script)

    def configure(self):
        return subprocess.run([sys.executable, str(self.script)], capture_output=True, text=True)

    def test_generated_secrets_match_and_are_private(self):
        result = self.configure()
        self.assertEqual(result.returncode, 0, result.stderr)
        app = dict(line.split('=', 1) for line in (self.root / '.env').read_text().splitlines())
        db = dict(line.split('=', 1) for line in (self.root / '.postgres.env').read_text().splitlines())
        self.assertEqual(app['MOS_DB_PASSWORD'], db['POSTGRES_PASSWORD'])
        self.assertGreaterEqual(len(app['MOS_JWT_SECRET']), 32)
        self.assertNotEqual(app['MOS_DEMO_ADMIN_PASSWORD'], app['MOS_DEMO_STAFF_PASSWORD'])
        for key, value in app.items():
            if 'PASSWORD' in key or 'SECRET' in key:
                self.assertGreaterEqual(len(value), 8)
                self.assertNotIn(value, result.stdout + result.stderr)
        if os.name == 'posix':
            for filename in ['.env', '.postgres.env']:
                self.assertEqual(stat.S_IMODE((self.root / filename).stat().st_mode), 0o600)

    def test_refuses_existing_app_file_without_creating_database_file(self):
        app = self.root / '.env'
        app.write_text('existing application settings')
        result = self.configure()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(app.read_text(), 'existing application settings')
        self.assertFalse((self.root / '.postgres.env').exists())

    def test_refuses_existing_database_file_without_creating_app_file(self):
        db = self.root / '.postgres.env'
        db.write_text('existing database settings')
        result = self.configure()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(db.read_text(), 'existing database settings')
        self.assertFalse((self.root / '.env').exists())

    def test_second_run_does_not_rotate_credentials(self):
        self.assertEqual(self.configure().returncode, 0)
        before = {p.name: hashlib.sha256(p.read_bytes()).digest() for p in self.root.glob('.*env')}
        self.assertNotEqual(self.configure().returncode, 0)
        after = {p.name: hashlib.sha256(p.read_bytes()).digest() for p in self.root.glob('.*env')}
        self.assertEqual(before, after)

    def test_smoke_requires_explicit_write_permission(self):
        result = subprocess.run([sys.executable, str(ROOT / 'scripts/smoke.py')], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn('--allow-writes', result.stderr)

    def test_smoke_rejects_remote_hosts_before_authentication(self):
        result = subprocess.run([sys.executable, str(ROOT / 'scripts/smoke.py'), '--allow-writes',
                                 '--base-url', 'https://example.invalid'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn('only a disposable localhost service', result.stderr)


if __name__ == '__main__':
    unittest.main(verbosity=2)
