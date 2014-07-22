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

    args = argparser.parse_args()

    from app import app
    app.run(debug = args.debug)

