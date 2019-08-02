const SQUARES = {};
const DEFAULT_PIXEL_SIZE = 6;
let BOARD_IS_LOADING = false;
function loadBoard(cb) {
    if(BOARD_IS_LOADING) {
        return;
    }
    BOARD_IS_LOADING = true;
    const p = $.getJSON('/app/board/', function(data) {
        $('#board-id').val(data['board_id']);
        $('#board-height').val(data['height']);
        $('#board-width').val(data['width']);
        const square_data = data['square_data'];
        const max_x = parseInt(data['width']),
            max_y = parseInt(data['height']);
        for(let i = 0; i < square_data.length; i++) {
            const sd = square_data[i];
            if(sd.x < 0 || sd.y < 0 || sd.x >= max_x || sd.y >= max_y) {
                continue;
            }
            SQUARES[`${sd.x}_${sd.y}`] = sd;
        }
        drawSquares(function() {
            if(typeof cb === 'function') {
                cb();
            }
            BOARD_IS_LOADING = false;
        });
    });
    setTimeout(function() {
        p.abort();
        BOARD_IS_LOADING = false;
    }, 30000);
}

function drawSquares(cb) {
    const main_board = document.getElementById('main-board'),
        off_board = document.createElement('canvas'),
        ctx = off_board.getContext('2d'),
        pixel_size = parseInt($('#pixel-size').val()) || DEFAULT_PIXEL_SIZE,
        offset_x = parseInt($('#board-offset-x').val()) || 0,
        offset_y = parseInt($('#board-offset-y').val()) || 0;
    off_board.height = main_board.height;
    off_board.width = main_board.width;
    for(const key in SQUARES) {
        if (SQUARES.hasOwnProperty(key)) {
            const sd = SQUARES[key];
            ctx.fillStyle = `rgb(${sd.r}, ${sd.g}, ${sd.b})`;
            ctx.fillRect((sd.x * pixel_size) + offset_x, (sd.y * pixel_size) + offset_y, pixel_size, pixel_size);
        }
    }
    ctx.fill();
    main_board.getContext('2d').drawImage(off_board, 0, 0);
    if(typeof cb === 'function') {
        cb();
    }
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
    if(data.x < 0 || data.y < 0 || data.x >= board_width || data.y >= board_height) {
        return;
    }
    SQUARES[`${data.x}_${data.y}`] = data;
    // draw the square locally before submitting it to the server
    const ctx = document.getElementById('main-board').getContext('2d');
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
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
    loadBoard(function() {
        main_board.style.display = 'inline-block';
        $('#loading-text').hide();
    });
}

function zoomIn() {
    clearBoard();
    let zoom = parseFloat($('#board-zoom').val()) || 1.0;
    if(zoom < 1) {
        zoom += 0.1;
    } else {
        zoom = Math.min(zoom + 0.2, 2.0);
    }
    setZoom(zoom);
    return false;
}

function zoomOut() {
    clearBoard();
    let zoom = parseFloat($('#board-zoom').val()) || 1.0;
    if(zoom > 1) {
        zoom -= 0.2;
    } else {
        zoom = Math.max(zoom - 0.1, 0.5);
    }
    setZoom(zoom);
    return false;
}

function setZoom(zoom) {
    const board_zoom_el = $('#board-zoom'),
        offset_x_el = $('#board-offset-x'),
        offset_y_el = $('#board-offset-y'),
        pixel_size_el = $('#pixel-size');
    board_zoom_el.val( zoom );
    const dpx = Math.floor(parseInt(offset_x_el.val()) / parseInt(pixel_size_el.val())),
        dpy = Math.floor(parseInt(offset_y_el.val()) / parseInt(pixel_size_el.val()));
    pixel_size_el.val(Math.floor(DEFAULT_PIXEL_SIZE * zoom));
    offset_x_el.val( parseInt(pixel_size_el.val()) * dpx );
    offset_y_el.val( parseInt(pixel_size_el.val()) * dpy );
    console.log(zoom + ", " + pixel_size_el.val());
    drawSquares();
}

const UP = 1, DOWN = 2, LEFT = 3, RIGHT = 4;
function pan(dir) {
    clearBoard();
    let offset_el = null;
    if(dir === LEFT || dir === RIGHT) {
        offset_el = $('#board-offset-x');
    } else if(dir === UP || dir === DOWN) {
        offset_el = $('#board-offset-y');
    }
    if(offset_el !== null) {
        const offset = parseInt(offset_el.val()) || 0.0,
            pixel_size = parseInt($('#pixel-size').val()) || DEFAULT_PIXEL_SIZE,
            zoom = parseInt($('#board-zoom').val()) || 1.0,
            delta = Math.floor(10.0 / zoom) * pixel_size;
        if(dir === LEFT || dir === UP) {
            offset_el.val(offset + delta);
        } else if(dir === RIGHT || dir === DOWN) {
            offset_el.val(offset - delta);
        }
    }
    drawSquares();
}

function panLeft() {
    pan(LEFT);
    return false;
}

function panRight() {
    pan(RIGHT);
    return false;
}

function panUp() {
    pan(UP);
    return false;
}

function panDown() {
    pan(DOWN);
    return false;
}

function panReset() {
    clearBoard();
    $('#board-offset-x').val(0);
    $('#board-offset-y').val(0);
    drawSquares();
    return false;
}

function clearBoard() {
    const main_board = document.getElementById('main-board');
    const ctx = main_board.getContext('2d');
    //ctx.clearRect(offset_x, offset_y, w*pixel_size, h*pixel_size);
    ctx.clearRect(0,0, main_board.width, main_board.height);
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
        loadBoard(function () {
            setTimeout(f, 1000);
        });
    };
    //f();
});
