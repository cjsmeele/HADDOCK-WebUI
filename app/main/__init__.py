from flask import Blueprint

#app = Flask(__name__)
#from app import views

main = Blueprint('main', __name__)

from . import views, errors
