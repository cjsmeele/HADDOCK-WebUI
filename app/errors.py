from flask import render_template
from app import app

@app.errorhandler(404)
def page_not_found(e):
    # TODO
    return render_template("404.html")

@app.errorhandler(500)
def internal_server_error(e):
    # TODO
    return render_template("500.html")
