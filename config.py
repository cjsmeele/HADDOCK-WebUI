class Config(object):
    # When more than RADIO_MAX options are present in a choice parameter,
    # a dropdown is rendered instead of a radio input.
    FRONTEND_RADIO_MAX  = 3

    FRONTEND_ACCESSLEVEL_FILE = 'res/accesslevels.json'
    FRONTEND_MODEL_FILE       = 'res/model.json'

    # Turn these off if there is no cache backend available or Flask-Cache is
    # not installed.
    CACHE_HTML  = False
    CACHE_MODEL = True
    CACHE_ACCESSLEVELS = CACHE_MODEL

    # The simple backend should always be supported when Flask-Cache is installed.
    # See http://pythonhosted.org/Flask-Cache/#configuring-flask-cache for other
    # options.
    # Note that some cache backends may need additional configuration parameters
    # that can't be passed through this config object (yet).
    CACHE_BACKEND = 'simple'

class ConfigDefault(Config):
    pass

config = {
    'default': ConfigDefault
}
