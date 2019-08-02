from django.http import JsonResponse
from django.shortcuts import render
from app.models import Square, Board, Cooldown
from datetime import datetime, timedelta
import pytz
from time import sleep

cache = None
cache_building_in_progress = False


def app(request):
    return render(request, 'app.html', {})


def square(request):
    if request.method == 'POST':
        global cache, cache_building_in_progress
        if not cache_building_in_progress:
            board_id = int(request.POST.get('board_id', '-1'))
            client_ip = _get_client_ip(request)
            cooldowns = Cooldown.objects.filter(board_id=board_id).filter(ip_address=client_ip).order_by('-create_date')
            if len(cooldowns) == 0 or cooldowns[0].create_date+timedelta(minutes=1) <= datetime.now(pytz.utc):
                value_error = False
                x, y, r, g, b = None, None, None, None, None
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
                cooldown = Cooldown(board_id=board_id, ip_address=client_ip)
                cooldown.save()
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


def _get_client_ip(request):
    # Not a great way to get the IP or authenticate, but this is just a PoC so whatever...
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
