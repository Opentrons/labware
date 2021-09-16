"""
utility subpackage for sessions.
Can we used accross different Opentorns servers.
sessions used to track stages, ensure multiple system
upgrades dont start at the same time,
token assignment, etc
"""

import asyncio
import functools
import logging
# from openembedded

LOG = logging.getLogger(__name__)


def active_session_check(handler):
    """ decorator to check session status
        start a new one if not present
    """
    @functools.wraps(handler)
    async def decorated(request: web.Request) -> web.Response:
        if session_from_request(request) is None:
            LOG.warning("check_session: active session exists!")
            return web.json_response(
                data={'message':
                      'An update session is already active on this robot',
                      'error': 'session-already-active'},
                status=409)
        else:
            pass
