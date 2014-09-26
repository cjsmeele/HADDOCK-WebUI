#!/usr/bin/env python

from __future__ import print_function

if __name__ == '__main__':
    from sys import stderr
    import argparse
    import config

    argparser = argparse.ArgumentParser(
        description='HADDOCK-WebUI Flask application',
    )

    argparser.add_argument(
        '-V', '--version',
        action  = 'version',
        version = 'HADDOCK-WebUI 0.1'
    )
    argparser.add_argument(
        '-c', '--config',
        dest    = 'config',
        default = 'local',
        help    = 'chooses the set of default configuration options'
                  ' possible values: '
                  '(' + (', '.join(config.configurations.keys())) + '),'
                  ' defaults to \'local\''
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
        default = None,
        help    = 'sets a host address to listen on'
    )
    argparser.add_argument(
        '-p', '--port',
        dest    = 'port',
        default = None,
        help    = 'the port to listen on'
    )
    argparser.add_argument(
        '-o', '--output-root',
        dest    = 'output_root',
        default = None,
        help    = 'the directory in which output directories will be created'
    )

    args = argparser.parse_args()

    from app import app

    if args.config not in config.configurations:
        print(
            'Error: Configuration set \'' + args.config + '\' does not exist.'
            '\nUse --help to see a list of supported default configurations.',
            file=stderr
        )
        exit(1)

    # config.config is the configuration object in the config module.
    # Alias it to cfg for convenience and readiblity.
    config.config = config.configurations[args.config]
    cfg           = config.config


    # Apply arguments to the config object.
    if args.host is not None:
        cfg.FLASK_HOST  = args.host;
    if args.port is not None:
        cfg.FLASK_PORT  = args.port;
    if args.output_root is not None:
        cfg.OUTPUT_ROOT = args.output_root;

    app.run(
        debug = args.debug,
        host  = cfg.FLASK_HOST,
        port  = int(cfg.FLASK_PORT),
    )
