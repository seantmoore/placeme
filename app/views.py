from django.http import JsonResponse
from django.shortcuts import render
from app.models import Square, Board
from time import sleep

cache = None
cache_building_in_progress = False


def app(request):
    return render(request, 'app.html', {})


def square(request):
    if request.method == 'POST':
        global cache
        value_error = False
        x, y, r, g, b, board_id = None, None, None, None, None, None
        try:
            x = int(request.POST.get('x', ''))
            y = int(request.POST.get('y', ''))
            r = int(request.POST.get('r', ''))
            g = int(request.POST.get('g', ''))
            b = int(request.POST.get('b', ''))
            board_id = int(request.POST.get('board_id', ''))
        except ValueError as _:
            value_error = True
        if value_error or board_id <= 0 or None in (x, y, r, g, b, board_id):
            return JsonResponse({'message': 'Missing or invalid required parameter.'}, status=400)
        s = Square(
            board_id=board_id,
            x=x,
            y=y,
            r=r,
            g=g,
            b=b
        )
        s.save()
        cache['sq_{}_{}'.format(x, y)] = s
        return JsonResponse({'message': 'OK'}, status=200)
    return JsonResponse({}, status=501)


def board(request):
    if request.method == 'GET':
        global cache, cache_building_in_progress
        timeout = 50  # don't wait more than 5 seconds
        while cache_building_in_progress and timeout > 0:
            sleep(0.1)
            timeout -= 1
        if cache is None:
            cache = {}
        try:
            b = Board.objects.filter(active=True).latest('create_date')
            if cache.get('board_id') != b.id:
                # the board info in the cache is not for the active board
                cache['board_id'] = b.id
                print('Building cache....')
                _build_cache(b)
                print('Cache built.')
        except Board.DoesNotExist as _:
            b = None
        square_data = []
        if b is not None:
            for k in cache.keys():
                if k.startswith('sq_'):
                    s = cache[k]
                    square_data.append({
                        'x': s.x,
                        'y': s.y,
                        'r': s.r,
                        'g': s.g,
                        'b': s.b,
                    })
        return JsonResponse({
            'board_id': b.id,
            'height': b.height,
            'width': b.width,
            'square_data': square_data
        }, status=200)
    return JsonResponse({}, status=501)


def _build_cache(b):
    global cache_building_in_progress
    if cache_building_in_progress:
        return
    cache_building_in_progress = True
    global cache
    for y in range(b.height):
        for x in range(b.width):
            try:
                s = Square.objects.filter(board_id=b.id).filter(x=x, y=y).latest('create_date')
                cache['sq_{}_{}'.format(x, y)] = s
            except Square.DoesNotExist as _:
                pass
    cache_building_in_progress = False
