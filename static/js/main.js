const DEFAULT_PIXEL_SIZE = 6;
function loadSquares(cb) {
    $.getJSON('/app/board/', function(data) {
        $('#board-id').val(data['board_id']);
        $('#board-height').val(data['height']);
        $('#board-width').val(data['width']);
        const square_data = data['square_data'];
        const main_board = document.getElementById('main-board');
        const off_board = document.createElement('canvas')
        off_board.height = main_board.height;
        off_board.width = main_board.width;
        const ctx = off_board.getContext('2d');
        const pixel_size = parseInt($('#pixel-size').val()) || DEFAULT_PIXEL_SIZE;
        const offset_x = parseInt($('#board-offset-x').val()) || 0;
        const offset_y = parseInt($('#board-offset-y').val()) || 0;
        console.log(`(offset_x, offset_y) => (${offset_x}, ${offset_y})`);
        const px_offset_x =  Math.floor(offset_x / pixel_size),
            px_offset_y =  Math.floor(offset_y / pixel_size),
            max_x = parseInt(data['width']) + px_offset_x,
            max_y = parseInt(data['height']) + px_offset_y;
        for(let i = 0; i < square_data.length; i++) {
            const sd = square_data[i];
            /*
            if(sd.x < px_offset_x || sd.y < px_offset_y || sd.x > max_x || sd.y > max_y) {
                continue;
            }
            */
            ctx.fillStyle = `rgb(${sd.r}, ${sd.g}, ${sd.b})`;
            ctx.fillRect((sd.x*pixel_size)+offset_x, (sd.y*pixel_size)+offset_y, pixel_size, pixel_size);
        }
        ctx.fill();
        main_board.getContext('2d').drawImage(off_board, 0, 0);
        if(typeof cb === 'function') {
            cb();
        }
    });
}

function clickSquare(e) {
    const main_board = document.getElementById('main-board');
    const rect = main_board.getBoundingClientRect();
    const pos = {
        x: Math.floor(e.clientX - rect.left),
        y: Math.floor(e.clientY - rect.top)
    };
    const pixel_size = parseInt($('#pixel-size').val()) || 6,
        r = $('#r-value').val(),
        g = $('#g-value').val(),
        b = $('#b-value').val(),
        offset_x = parseInt($('#board-offset-x').val()) / pixel_size,
        offset_y = parseInt($('#board-offset-y').val()) / pixel_size,
        x = Math.floor(pos.x / pixel_size),
        y = Math.floor(pos.y / pixel_size);
    const data = {
        x: x - offset_x,
        y: y - offset_y,
        r: r,
        g: g,
        b: b,
        board_id: parseInt($('#board-id').val()) || 0,
        'csrfmiddlewaretoken': $('input[name=csrfmiddlewaretoken]').val()
    };
    const board_height = parseInt($('#board-height').val()),
        board_width = parseInt($('#board-width').val());
    if(data.x < 0 || data.y < 0 || data.x > board_width+offset_x || data.y > board_height+offset_y) {
        return;
    }
    console.log(data);
    // draw the square locally before submitting it to the server
    const ctx = document.getElementById('main-board').getContext('2d');
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    console.log(`(x*pixel_size, y*pixel_size) => (${x*pixel_size}, ${y*pixel_size})`);
    console.log(`(x, y) => (${x}, ${y})`);
    ctx.fillRect(x*pixel_size, y*pixel_size, pixel_size, pixel_size);
    ctx.fill();
    // now submit the square to the server
    $.post('/app/square/', data, function( resp ) {});
}

function bindClicks() {
    $('.color-cell').click(function() {
        const color = this.id.split('-')[2];
        const rgb = $(`#${color}-rgb`).val().split(',');
        $('#r-value').val(rgb[0]);
        $('#g-value').val(rgb[1]);
        $('#b-value').val(rgb[2]);
        $('.color-cell').removeClass('active');
        $(this).addClass('active');
    });
    $('#zoom-in-btn').click(zoomIn);
    $('#zoom-out-btn').click(zoomOut);
    $('#pan-left-btn').click(panLeft);
    $('#pan-right-btn').click(panRight);
    $('#pan-up-btn').click(panUp);
    $('#pan-down-btn').click(panDown);
    $('#pan-reset-btn').click(panReset);
}

function init() {
    bindClicks();
    $('.color-selection').each(function(i, el) {
        el.style.backgroundColor = el.id.split('-')[1];
    });
    $('#r-value').val(0);
    $('#g-value').val(0);
    $('#b-value').val(0);
    $('#board-zoom').val(1);
    $('#pixel-size').val(DEFAULT_PIXEL_SIZE);
    $('#board-offset-x').val(0);
    $('#board-offset-y').val(0);
    const main_board = document.getElementById("main-board");
    main_board.addEventListener("click", clickSquare);
    loadSquares(function() {
        main_board.style.display = 'inline-block';
        $('#loading-text').hide();
    });
}

function zoomIn() {
    clearBoard();
    const board_zoom_el = $('#board-zoom'),
        offset_x_el = $('#board-offset-x'),
        offset_y_el = $('#board-offset-y'),
        pixel_size_el = $('#pixel-size');
    let zoom = parseFloat(board_zoom_el.val()) || 1;
    if(zoom < 1) {
        zoom += 0.1;
    } else {
        zoom = Math.min(zoom + 0.2, 2.0);
    }
    board_zoom_el.val(zoom);
    const dpx = Math.floor(parseInt(offset_x_el.val()) / parseInt(pixel_size_el.val())),
        dpy = Math.floor(parseInt(offset_y_el.val()) / parseInt(pixel_size_el.val()));
    pixel_size_el.val(Math.floor(DEFAULT_PIXEL_SIZE * zoom));
    offset_x_el.val( parseInt(pixel_size_el.val()) * dpx );
    offset_y_el.val( parseInt(pixel_size_el.val()) * dpy );
    console.log(zoom + ", " + pixel_size_el.val());
    loadSquares();
    return false;
}

function zoomOut() {
    clearBoard();
    const board_zoom_el = $('#board-zoom'),
        offset_x_el = $('#board-offset-x'),
        offset_y_el = $('#board-offset-y'),
        pixel_size_el = $('#pixel-size');
    let zoom = parseFloat(board_zoom_el.val()) || 1.0;
    if(zoom > 1) {
        zoom -= 0.2;
    } else {
        zoom = Math.max(zoom - 0.1, 0.5);
    }
    board_zoom_el.val( zoom );
    const dpx = Math.floor(parseInt(offset_x_el.val()) / parseInt(pixel_size_el.val())),
        dpy = Math.floor(parseInt(offset_y_el.val()) / parseInt(pixel_size_el.val()));
    pixel_size_el.val(Math.floor(DEFAULT_PIXEL_SIZE * zoom));
    offset_x_el.val( parseInt(pixel_size_el.val()) * dpx );
    offset_y_el.val( parseInt(pixel_size_el.val()) * dpy );
    console.log(zoom + ", " + pixel_size_el.val());
    loadSquares();
    return false;
}

function panLeft() {
    clearBoard();
    const offset_x_el = $('#board-offset-x'),
        offset_x = parseInt(offset_x_el.val()) || 0,
        pixel_size = parseInt($('#pixel-size').val()) || DEFAULT_PIXEL_SIZE,
        zoom = parseInt($('#board-zoom').val()) || 1.0,
        dx = Math.floor(10.0 / zoom) * pixel_size;
    console.log(`dx => ${dx}, pixel_size => ${pixel_size}`);
    offset_x_el.val(offset_x + dx);
    loadSquares();
    return false;
}

function panRight() {
    clearBoard();
    const offset_x_el = $('#board-offset-x');
    const offset_x = parseInt(offset_x_el.val()) || 0;
    const pixel_size = parseInt($('#pixel-size').val()) || DEFAULT_PIXEL_SIZE;
    const zoom = parseInt($('#board-zoom').val()) || 1.0;
    const dx = Math.floor(10.0 / zoom) * pixel_size;
    offset_x_el.val(offset_x - dx);
    loadSquares();
    return false;
}

function panUp() {
    clearBoard();
    const offset_y_el = $('#board-offset-y');
    const offset_y = parseInt(offset_y_el.val()) || 0;
    const pixel_size = parseInt($('#pixel-size').val()) || DEFAULT_PIXEL_SIZE;
    const zoom = parseInt($('#board-zoom').val()) || 1.0;
    const dy = Math.floor(10.0 / zoom) * pixel_size;
    offset_y_el.val(offset_y + dy);
    loadSquares();
    return false;
}

function panDown() {
    clearBoard();
    const offset_y_el = $('#board-offset-y');
    const offset_y = parseInt(offset_y_el.val()) || 0;
    const pixel_size = parseInt($('#pixel-size').val()) || DEFAULT_PIXEL_SIZE;
    const zoom = parseInt($('#board-zoom').val()) || 1.0;
    const dy = Math.floor(10.0 / zoom) * pixel_size;
    offset_y_el.val(offset_y - dy);
    loadSquares();
    return false;
}

function panReset() {
    clearBoard();
    $('#board-offset-x').val(0);
    $('#board-offset-y').val(0);
    loadSquares();
    return false;
}

function clearBoard() {
    const pixel_size = parseInt($('#pixel-size').val());
    const w = parseInt($('#board-height').val());
    const h = parseInt($('#board-width').val());
    const offset_x = parseInt($('#board-offset-x').val());
    const offset_y = parseInt($('#board-offset-y').val());
    const main_board = document.getElementById('main-board');
    const ctx = main_board.getContext('2d');
    ctx.clearRect(offset_x, offset_y, w*pixel_size, h*pixel_size);
}

function debug() {
    $('.state-info').each(function(i, el) {
        console.log(`${el.id} => ${el.value}`);
    });
}

$(document).ready(function() {
    // Load squares into the main board and start an infinite loop of loading
    init();
    const f = function() {
        loadSquares(function () {
            setTimeout(f, 1000);
        });
    };
    //f();
});
