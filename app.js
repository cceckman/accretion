

// Get the name we're forming.
const searchParams = new URLSearchParams(window.location.search);
let render_name = "ACCRETION";
if (searchParams.has("name")) {
    render_name = searchParams.get("name")
}
let load = 0.0007;
if (searchParams.has("load")) {
    load = parseFloat(searchParams.get("load"))
}

const canvas = document.getElementById("accretion-canvas");
const bg_canvas = document.getElementById("accretion-bg-canvas");

function clamp(x) {
    if (x < 0) {
        return 0
    } else if (x > 1.0) {
        return 1.0
    } else {
        return x
    }
}

let x = []
let y = []
let vx = []
let vy = []
let slowdown = 0.95;
let min = 0.00001;
let initScale = 0.2;
let sizeScale = 0.002;
let cleanupTimeout = 5000;

let stopped = [];

// TODO: Consider using a Gaussian distribution
// instead of whatever Math.random() is
function add_particle() {
    x.push(Math.random())
    y.push(Math.random())

    // Pick a sign:
    let xsign = 0;
    let ysign = 0;
    if (Math.random() > 0.5) {
        xsign = -1;
    } else {
        xsign = 1;
    }
    // Only falling...
    //  if (Math.random() > 0.5) {
    //      ysign = -1;
    //  } else {
    //      ysign = 1;
    //  }
    ysign = 1;
    // at most this fraction of the screen 
    // per millisecond
    vx.push(Math.random() * initScale * xsign)
    vy.push(Math.random() * initScale * ysign)
}

function update_speed() {
    let name = bg_canvas.getContext("2d")

    for (let i = 0; i < x.length; i++) {
        let xx = Math.round(x[i] * canvas.width);
        let yy = Math.round(y[i] * canvas.height);

        let px = name.getImageData(xx, yy, 1, 1).data;
        // console.log("pixel data: ", px);
        if (px[3] !== 0) {
            // Slow down this pixel.
            vx[i] *= slowdown;
            vy[i] *= slowdown;
        }
    }
}

function flush_stopped() {
    let x_ = [];
    let y_ = [];
    let vx_ = [];
    let vy_ = [];
    for (let i = 0; i < x.length; i++) {
        if (Math.abs(vx[i]) > min && Math.abs(vy[i]) > min) {
            x_.push(x[i])
            y_.push(y[i])
            vx_.push(vx[i])
            vy_.push(vy[i])
        } else {
            stopped.push({ x: x[i], y: y[i] });
        }
    }
    x = x_;
    y = y_;
    vx = vx_;
    vy = vy_;
}


function bounce(elapsed, m, vm, i) {
    let d = vm[i] * elapsed;
    let mm = m[i] + d;
    if (mm < 0 || mm > 1.0) {
        // Don't move on this tick,
        // just change velocity
        vm[i] = -vm[i];
    } else {
        m[i] = mm
    }
}

function rotate(elapsed, m, vm, i) {
    let d = vm[i] * elapsed;
    let mm = m[i] + d;
    if (mm < 0) {
        m[i] = mm + 1;
    } else if (mm > 1) {
        m[i] = mm - 1;
    } else {
        m[i] = mm
    }
}

function update_all(elapsed) {
    update_speed()
    for (let i = 0; i < x.length; i++) {
        bounce(elapsed, x, vx, i);
    }
    for (let i = 0; i < y.length; i++) {
        rotate(elapsed, y, vy, i);
    }
}

let draw_count = 0;
function draw(ctx) {
    ctx.reset()
    ctx.fillStyle = "brown";
    const min = Math.min(canvas.height, canvas.width)
    let size = Math.max(Math.round(min * sizeScale), 2)
    for (let i = 0; i < x.length; i++) {
        draw_point(ctx, size, x[i], y[i]);
    }
    for (let { x, y } of stopped) {
        draw_point(ctx, size, x, y);
    }
}

function draw_point(ctx, size, x, y) {
    const xx = x * canvas.width
    const yy = y * canvas.height
    ctx.beginPath()
    ctx.ellipse(xx, yy, size, size, 0, 0, 2 * Math.PI)
    ctx.fill()
    ctx.closePath()
}

function draw_name() {
    bg_canvas.height = canvas.clientHeight;
    bg_canvas.width = canvas.clientWidth;
    let ctx = bg_canvas.getContext("2d")

    let textHeight = canvas.height * 0.3;
    let textY = (canvas.height / 2) + (textHeight / 2);

    ctx.textAlign = "center"
    ctx.font = `${textHeight}px sans-serif`
    ctx.fillStyle = "black"
    ctx.fillText(render_name, canvas.width / 2, textY, canvas.width)
}

function handle_resize() {
    if (draw_count > 0 || canvas.height != canvas.clientHeight
        || canvas.width != canvas.clientWidth) {
        canvas.height = canvas.clientHeight;
        canvas.width = canvas.clientWidth;

        // Resized.
        draw_name()

        // Figure out how many particles to draw,
        // by a load factor.
        let count = Math.round(canvas.height * canvas.width * load)
        if (stopped.length > count) {
            stopped.length = count;
        }
        count -= stopped.length;
        while (x.length > count) {
            x.length = count
            y.length = count
            vx.length = count
            vy.length = count
        }

        while (x.length < count) {
            add_particle()
        }
    }
}

let zero = document.timeline.currentTime;
let lastCleanup = document.timeline.currentTime;
function redraw(last_frame) {
    handle_resize()

    let elapsed = last_frame - zero;
    zero = last_frame;
    update_all(elapsed / 1000);
    let cleanup = last_frame - lastCleanup;
    if (cleanup > cleanupTimeout) {
        lastCleanup = last_frame;
        flush_stopped();
    }

    let ctx = canvas.getContext("2d")
    draw(ctx);
    window.requestAnimationFrame(redraw)
}

window.requestAnimationFrame(redraw)
