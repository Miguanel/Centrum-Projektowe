from flask import Flask, render_template

app = Flask(__name__)


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/projects')
def projects():
    return render_template('projects.html')


@app.route('/lab')
def lab():
    return render_template('lab.html')


@app.route('/kontakt')
def kontakt():
    return render_template('kontakt.html')


if __name__ == '__main__':
    app.run(debug=True)
