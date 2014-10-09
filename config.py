class Config(object):
    # These configuration options are used as default settings.
    # All settings can be overridden by Config subclasses (see ConfigServer and ConfigLocal),
    # some can also be set with arguments to run.py when run locally, see run.py for details.

    # These flask settings do not apply to WSGI.
    FLASK_HOST = '127.0.0.1'
    FLASK_PORT = 5000

    # When more than RADIO_MAX options are present in a choice parameter,
    # a dropdown is rendered instead of a radio input.
    # TODO: Currently not supported
    RADIO_MAX = 3

    ACCESSLEVEL_FILE = './model/accesslevels.json'
    MODEL_FILE       = './model/model.json'

    # The default root directory under which to create output/job directories.
    # Can be overridden by the --output-root parameter
    OUTPUT_ROOT = './jobs'

    # Turn these off if there is no cache backend available or Flask-Cache is
    # not installed.
    CACHE_MODEL = False
    CACHE_ACCESSLEVELS = CACHE_MODEL

    # The simple backend should always be supported when Flask-Cache is installed.
    # See http://pythonhosted.org/Flask-Cache/#configuring-flask-cache for other
    # options.
    # Note that some cache backends may need additional configuration parameters
    # that can't be passed through this config object (yet).
    CACHE_BACKEND = 'simple'

    # TODO: Unimplemented
    USE_AUTH = False

    # Max request size for POSTs (including all submitted files).
    MAX_CONTENT_LENGTH = 50 * 1024**2 # 50 MiB


# Default server configuration
class ConfigServer(Config):
    # When run on a server, listen on all interfaces and require authentication.

    # Note that listening on TCP ports < 1024 usually requires root privileges.
    # I recommend running HADDOCK-WebUI under Apache as a WSGI application
    # instead to avoid having to run it as root.
    FLASK_HOST = '0.0.0.0'
    FLASK_PORT = 80

    USE_AUTH = True

# Default stand-alone configuration
class ConfigLocal(Config):
    # When run locally, only allow connections from localhost and disable auth.
    FLASK_HOST = '127.0.0.1'
    FLASK_PORT = 5000

    USE_AUTH = False

    # Disable file upload size limit.
    MAX_CONTENT_LENGTH = None


configurations = {
    # A list of configuration names and associated Config classes.
    'server': ConfigServer,
    'local':  ConfigLocal,
}

# This will be overridden by run.py when run locally.
config = configurations['server']
