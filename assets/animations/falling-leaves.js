window.FallingLeavesAnimation = {
  init(container, settings = {}) {
    container.innerHTML = '';
    container.className = 'falling-leaves';
    container.id = 'fallingLeaves';
    container.setAttribute('aria-hidden', 'true');
    
    const count = settings.density || 15;
    const speed = settings.speed || 1;
    const size = settings.size || 1;
    const opacity = settings.opacity || 0.85;
    
    for (let i = 1; i <= count; i++) {
      const span = document.createElement('span');
      span.className = 'leaf-fall';
      
      const left = Math.random() * 100;
      const duration = (10 + Math.random() * 6) / speed;
      const delay = -(Math.random() * 12);
      const width = (9 + Math.random() * 6) * size;
      const height = width * 1.9;
      
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
