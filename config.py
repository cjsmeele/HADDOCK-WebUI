class Config(object):
    # When more than RADIO_MAX options are present in a choice parameter,
    # a dropdown is rendered instead of a radio input.
    FRONTEND_RADIO_MAX  = 3

    # A list of CSS stylesheets which will be loaded in order
    FRONTEND_STYLESHEETS = [
        '/static/css/frontend.css'
    ]

    FRONTEND_ACCESSLEVEL_FILE = 'res/accesslevels.json'
    FRONTEND_MODEL_FILE       = 'res/model.json'

    @staticmethod
    def init_app(app):
        pass

class ConfigDefault(Config):
    pass

config = {
    'default': ConfigDefault
}
