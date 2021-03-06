# You can run this .tac file directly with:
#    twistd -ny service.tac

# I hate that we have to have a separate tac per server, but apparently 'tacs are config'
# http://twistedmatrix.com/pipermail/twisted-python/2006-June/013331.html

import os, sys, __builtin__
__builtin__.shadowcraft_engine_version = 7.0
sys.path.append("vendor/engine-7.0")

from twisted.application import service, internet
from twisted.web import static, server
from app.server import *

def getWebService(port = 8881):
    site = WebSocketSite(ShadowcraftSite())
    site.addHandler("/engine7", ShadowcraftSocket)
    return internet.TCPServer(port, site)

application = service.Application("Shadowcraft Backend")

service = getWebService(8900 + int(os.environ["UPSTART_INSTANCE"]))
service.setServiceParent(application)
