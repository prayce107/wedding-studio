window.GoldRainAnimation = {
  init(container, settings = {}) {
    container.innerHTML = '';
    container.className = 'gold-rain';
    container.id = 'goldRain';
    container.setAttribute('aria-hidden', 'true');
    
    const count = settings.density || 24;
    const speed = settings.speed || 1;
    const size = settings.size || 1;
    const opacity = settings.opacity || 0.75;
    
    for (let i = 1; i <= count; i++) {
      const span = document.createElement('span');
      span.className = 'gold-leaf';
      
      const left = Math.random() * 100;
      const duration = (9 + Math.random() * 8) / speed;
      const delay = -(Math.random() * 15);
      const width = (8 + Math.random() * 8) * size;
      const height = width * 2.3;
      
      span.style.left = `${left}%`;
      span.style.setProperty('--dur', `${duration}s`);
      span.style.setProperty('--delay', `${delay}s`);
      span.style.width = `${width}px`;
      span.style.height = `${height}px`;
      span.style.opacity = opacity;
      
      container.appendChild(span);
    }
  }
};
