class Config(object):
    # When more than RADIO_MAX options are present in a choice parameter,
    # a dropdown is rendered instead of a radio input.
    FRONTEND_RADIO_MAX  = 3

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
