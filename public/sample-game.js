// Sample game (test page for players). Moved out of the HTML so the Content-Security-Policy can stay strict.
(function () {
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var x = 50, y = 50, vx = 2.4, vy = 1.8, r = 22;
  var boost = 0;
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  function step() {
    x += vx; y += vy;
    if (x < r || x > canvas.width - r) vx = -vx;
    if (y < r || y > canvas.height - r) vy = -vy;
    if (boost > 0) boost--;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(x, y, r + (boost > 0 ? 6 : 0), 0, Math.PI * 2);
    ctx.fillStyle = '#1F7AFF';
    ctx.fill();
    requestAnimationFrame(step);
  }
  function bounce(e) {
    e.preventDefault();
    vy = -Math.abs(vy) - 3;
    boost = 12;
  }
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', bounce);
  resize();
  step();
})();
