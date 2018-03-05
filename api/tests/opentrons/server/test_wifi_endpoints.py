import json
from opentrons.server.main import init


async def test_wifi_status(virtual_smoothie_env, loop, test_client):
    app = init(loop)
    cli = await loop.create_task(test_client(app))

    expected = json.dumps({'status': 'testing'})
    resp = await cli.get('/wifi/status')
    text = await resp.text()
    assert resp.status == 200
    assert text == expected


async def test_wifi_list(virtual_smoothie_env, loop, test_client):
    app = init(loop)
    cli = await loop.create_task(test_client(app))

    expected = json.dumps({
        'list': [
            {'ssid': 'a', 'signal': 42, 'active': True},
            {'ssid': 'b', 'signal': 43, 'active': False},
            {'ssid': 'c', 'signal': None, 'active': False}
        ]
    })
    resp = await cli.get('/wifi/list')
    text = await resp.text()
    assert resp.status == 200
    assert text == expected


async def test_wifi_configure(virtual_smoothie_env, loop, test_client):
    app = init(loop)
    cli = await loop.create_task(test_client(app))

    expected = json.dumps({
        'ssid': 'a',
        'message': 'Configuration unchanged'
    })
    resp = await cli.post('/wifi/configure',
                          json={'ssid': 'this', 'psk': 'that'})
    text = await resp.text()
    assert resp.status == 200
    assert text == expected
