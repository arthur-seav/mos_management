#!/usr/bin/env python3
"""Real HTTP integration smoke test. Run only on a disposable, freshly seeded database.

MOS_SMOKE_ADMIN_PASSWORD and MOS_SMOKE_STAFF_PASSWORD must be set in the environment.
No passwords or tokens are printed. Optional --sessions saves test auth state with mode 0600.
"""
import argparse
from datetime import datetime
from decimal import Decimal
import io
import json
import os
from pathlib import Path
import secrets
import time
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:8092')
    parser.add_argument('--allow-writes', action='store_true', required=True)
    parser.add_argument('--sessions', type=Path)
    args = parser.parse_args()
    if urlparse(args.base_url).hostname not in ('127.0.0.1', 'localhost'):
        parser.error('This smoke test writes data; only a disposable localhost service is allowed.')

    def call(method, path, body=None, session=None, status=200) -> Any:
        headers = {'Accept': 'application/json'}
        if session:
            headers['Authorization'] = 'Bearer ' + session['token']
        data = None if body is None else json.dumps(body).encode()
        if data is not None:
            headers['Content-Type'] = 'application/json'
        req = Request(args.base_url + path, data=data, headers=headers, method=method)
        try:
            response = urlopen(req, timeout=30)
        except HTTPError as error:
            response = error
        raw = response.read()
        code = int(response.getcode() or 0)
        assert code == status, (method, path, code, raw[:500] if code >= 400 else 'unexpected status')
        return json.loads(raw) if 'json' in response.headers.get('Content-Type', '') else raw

    sessions = {}
    for role in ('admin', 'staff'):
        sessions[role] = call('POST', '/api/admin/auth/sign-in', {
            'identifier': role + '@mos.test', 'password': os.environ['MOS_SMOKE_' + role.upper() + '_PASSWORD']})
        assert sessions[role]['user']['role'] == role
    admin, staff = sessions['admin'], sessions['staff']
    menu = call('GET', '/api/app/menu')
    assert len(menu['categories']) == 4
    assert len(menu['products']) == 17
    all_products = call('GET', '/api/admin/products', session=admin)
    assert len(all_products) == 18
    latte = next(p for p in all_products if p['name'] == 'Latte')
    custom = call('GET', f'/api/admin/products/{latte["id"]}/customization', session=staff)
    picks = {'Size': 'Large', 'Temperature': 'Iced', 'Ice level': 'Less', 'Sweetness': 'No sugar', 'Add-ons': 'Oat milk'}
    option_ids = [next(o['id'] for o in g['options'] if o['name'] == picks[g['name']]) for g in custom['groups']]
    line = {'productId': latte['id'], 'optionIds': option_ids, 'quantity': 2}
    walkin = call('POST', '/api/admin/orders/walk-in', {'lines': [line], 'cashReceived': 10}, staff, 201)
    assert Decimal(str(walkin['totalAmount'])) == Decimal('9.20')
    assert walkin['payments'][0]['status'] == 'paid' and walkin['source'] == 'walk_in'
    detail = call('GET', f'/api/admin/orders/{walkin["id"]}', session=staff)
    assert detail['pickupCode'] == walkin['pickupCode']
    assert detail['items'][0]['optionNames'] == ['Large', 'Iced', 'Less ice', 'No sugar', 'Oat milk']
    queue = call('GET', '/api/admin/orders/queue', session=staff)
    assert any(item['order']['id'] == walkin['id'] for item in queue['orders'])
    for expected in ('preparing', 'ready', 'completed'):
        advance = call('POST', f'/api/admin/orders/{walkin["id"]}/advance', {}, staff)
        assert advance['status'] == expected
        assert call('GET', f'/api/admin/orders/{walkin["id"]}', session=staff)['status'] == expected
    found = call('GET', '/api/admin/orders?' + urlencode({'status': 'completed', 'source': 'walk_in', 'q': walkin['pickupCode']}), session=staff)
    assert found['total'] == 1 and found['items'][0]['id'] == walkin['id']

    customer = call('POST', '/api/app/auth/sign-up', {'firstName': 'Dara', 'lastName': 'Kim',
                    'email': 'smoke-' + secrets.token_hex(4) + '@mos.test', 'phone': None,
                    'password': secrets.token_urlsafe(16)}, status=201)
    sessions['customer'] = customer
    online_body = {'lines': [{**line, 'quantity': 1}], 'pickupType': 'asap'}
    online = call('POST', '/api/app/orders', online_body, customer, 201)
    khqr = call('POST', f'/api/app/orders/{online["id"]}/payments/khqr', {}, customer, 201)
    time.sleep(5.3)
    paid = call('GET', f'/api/app/payments/{khqr["paymentId"]}', session=customer)
    assert paid['status'] == 'paid'
    online = call('GET', f'/api/app/orders/{online["id"]}', session=customer)
    assert online['status'] == 'placed' and online['pickupCode']
    rejected = call('POST', f'/api/admin/orders/{online["id"]}/reject', {'reason': 'Sold out'}, staff)
    assert rejected['status'] == 'rejected' and rejected['payments'][0]['status'] == 'refund_pending'
    refunded = call('POST', f'/api/admin/payments/{paid["id"]}/refunded', {}, staff)
    assert refunded['payments'][0]['status'] == 'refunded'
    history = call('GET', '/api/app/orders', session=customer)
    assert history[0]['rejectReason'] == 'Sold out' and history[0]['payments'][0]['status'] == 'refunded'

    call('PUT', '/api/admin/store/online-ordering', {'open': False}, staff)
    assert call('GET', '/api/app/store')['settings']['onlineOrderingOpen'] is False
    call('POST', '/api/app/orders', online_body, customer, 409)
    call('PUT', '/api/admin/store/online-ordering', {'open': True}, staff)
    assert call('GET', '/api/app/store')['settings']['onlineOrderingOpen'] is True
    call('GET', '/api/admin/reports/sales', session=staff, status=403)
    call('GET', '/api/admin/staff', session=customer, status=403)
    sales = call('GET', '/api/admin/reports/sales', session=admin)
    assert Decimal(str(sales['revenue'])) == Decimal('9.20') and sales['orders'] == 1
    export = call('GET', '/api/admin/reports/export', session=admin)
    with zipfile.ZipFile(io.BytesIO(export)) as book:
        assert len([n for n in book.namelist() if n.startswith('xl/worksheets/sheet') and n.endswith('.xml')]) == 4

    uid = customer['user']['id']
    call('PATCH', f'/api/admin/customers/{uid}/status', {'status': 'inactive'}, admin)
    call('GET', '/api/app/me', session=customer, status=401)
    call('PATCH', f'/api/admin/customers/{uid}/status', {'status': 'active'}, admin)
    assert call('GET', '/api/app/me', session=customer)['status'] == 'active'
    if args.sessions:
        args.sessions.parent.mkdir(parents=True, exist_ok=True)
        fd = os.open(args.sessions, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, 'w') as out:
            json.dump(sessions, out)
        os.chmod(args.sessions, 0o600)
    print(json.dumps({'result': 'PASS', 'catalog': {'categories': 4, 'products': 18, 'public_products': 17},
                      'walk_in': {'code': walkin['pickupCode'], 'total': 9.20, 'status': 'completed'},
                      'online': {'code': online['pickupCode'], 'status': 'rejected', 'payment': 'refunded'},
                      'sales': {'orders': sales['orders'], 'revenue': sales['revenue']},
                      'excel_sheets': 4, 'role_guards': 'PASS', 'deactivation': 'PASS'}, indent=2))


if __name__ == '__main__':
    main()
