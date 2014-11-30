HADDOCK-WebUI
=============

NAME
----

HADDOCK-WebUI - A web interface to HADDOCK

SYNOPSIS
--------

    ./run.py [--version] [--debug] [--config <server|local>]
             [--host LISTEN_ADDRESS] [--port TCP_PORT]
             [--output-root OUTPUT_ROOT]

DESCRIPTION
-----------

HADDOCK-WebUI is a Python2/Flask web application that serves as a
frontend to [HADDOCK](http://www.nmr.chem.uu.nl/haddock/).

HADDOCK-WebUI uses a JSON data model as presented by
[CNSParser](https://github.com/cjsmeele/CNSParser) to generate a HTML
form in which users can submit their parameters for a HADDOCK run.

This application can be compared to the inp2form and form2inp CNS CGI
scripts, with the notable difference that HADDOCK-WebUI does not do any
CNS file parsing by itself, and is as such a relatively easily
replacable component in this interface to HADDOCK.

Supported CNSParser features include nested sections, access levels, and
section and parameter repetition.

This Flask application can be run locally, using the run.py script, but
can also be configured to run under Apache as a WSGI application. An
example Apache vhost config is included with this distribution.

When run in a multi-user environment, as is the case for the [HADDOCK
webserver](http://haddock.science.uu.nl/services/HADDOCK/),
HADDOCK-WebUI will support logging in via &lt;some service TBD&gt;, and
using the user's details to determine what access levels they should
have access to.

SEE ALSO
--------

- [CNSParser](https://github.com/cjsmeele/CNSParser), the CNS parser
  used to generate the data model used by this application

LICENSE
-------

See LICENSE.

AUTHOR
------

[Chris Smeele](https://github.com/cjsmeele)
