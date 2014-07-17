from flask import Flask
from config import config
import logging
from logging.handlers import RotatingFileHandler

def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)

    handler = RotatingFileHandler('frontend.log', maxBytes=4*1024**2, backupCount=1)
    handler.setLevel(logging.WARNING)
    app.logger.addHandler(handler)

    from main import main as main_blueprint
    app.register_blueprint(main_blueprint)

    return app
