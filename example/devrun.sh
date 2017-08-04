#!/bin/sh
#
# Run development environment instance.
#

NODE_ENV=development NODE_DEBUG=X2_APP,X2_APP_AUTH,X2_DBO,PAYMENTS exec npm start --silent
