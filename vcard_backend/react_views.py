from pathlib import Path

from django.conf import settings
from django.http import HttpResponse


REACT_INDEX = Path(settings.BASE_DIR) / 'theme' / 'static' / 'react' / 'index.html'


def react_app(request, *args, **kwargs):
    try:
        html = REACT_INDEX.read_text(encoding='utf-8')
    except FileNotFoundError:
        message = (
            'The React frontend has not been built. Run "pnpm build" in the '
            'frontend directory, or open http://127.0.0.1:5173 during development.'
        )
        return HttpResponse(message, status=503, content_type='text/plain; charset=utf-8')

    response = HttpResponse(html, content_type='text/html; charset=utf-8')
    response['Cache-Control'] = 'no-cache'
    return response
