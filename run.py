#!/usr/bin/env python

import argparse

if __name__ == '__main__':
    argparser = argparse.ArgumentParser(
        description='HADDOCK-WebUI Flask application',
    )

    argparser.add_argument(
        '-V', '--version',
        action  = 'version',
        version = '%(prog)s 0.1'
    )
    argparser.add_argument(
        '-d', '--debug',
        dest    = 'debug',
        action  = 'store_true',
        default = False,
        help    = 'enable debug mode'
    )
    argparser.add_argument(
        '-l', '--host',
        dest    = 'host',
        default = '127.0.0.1',
        help    = 'sets a host address to listen on'
    )
    argparser.add_argument(
        '-p', '--port',
        dest    = 'port',
        default = '5000',
        help    = 'the port to listen on'
    )

    args = argparser.parse_args()

    from app import app

    app.run(
        debug = args.debug,
        host  = args.host,
        port  = int(args.port),
    )

