// Magic Particles - floating golden sparkles
(function(){
  const canvas = document.createElement('canvas');
  canvas.id = 'magic-canvas';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let W, H;
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const PARTICLES = 60;
  const particles = [];

  function rand(a, b) { return Math.random() * (b - a) + a; }

  function createParticle(initial) {
    return {
      x: rand(0, W),
      y: initial ? rand(0, H) : H + 20,
      size: rand(1.5, 4),
      speedY: rand(-0.3, -1.2),
      speedX: rand(-0.3, 0.3),
      opacity: rand(0.1, 0.6),
      life: rand(0, 1),
      lifeSpeed: rand(0.005, 0.015),
      hue: rand(30, 55) // gold range
    };
  }

  for (let i = 0; i < PARTICLES; i++) {
    particles.push(createParticle(true));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (const p of particles) {
      p.y += p.speedY;
      p.x += p.speedX + Math.sin(p.y * 0.01) * 0.2;
      p.life += p.lifeSpeed;

      // Twinkle
      const twinkle = 0.4 + 0.6 * Math.sin(p.life * Math.PI * 2);
      const alpha = p.opacity * twinkle;

      // Glow
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      gradient.addColorStop(0, `hsla(${p.hue}, 80%, 75%, ${alpha})`);
      gradient.addColorStop(0.3, `hsla(${p.hue}, 70%, 60%, ${alpha * 0.4})`);
      gradient.addColorStop(1, `hsla(${p.hue}, 60%, 50%, 0)`);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core bright point
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue + 10}, 90%, 90%, ${alpha * 0.8})`;
      ctx.fill();

      // Reset when off screen
      if (p.y < -20 || p.x < -20 || p.x > W + 20) {
        Object.assign(p, createParticle(false));
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
})();
