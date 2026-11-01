class Joystick {
  constructor(baseElement, thumbElement, callback) {
    this.base = baseElement;
    this.thumb = thumbElement;
    this.callback = callback;
    this.active = false;
    this.centerX = 0;
    this.centerY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.maxDistance = 40;
    
    this.init();
  }
  
  init() {
    this.base.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.active = true;
      const rect = this.base.getBoundingClientRect();
      this.centerX = rect.left + rect.width / 2;
      this.centerY = rect.top + rect.height / 2;
      this.handleMove(e.touches[0]);
    });
    
    this.base.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.active) {
        this.handleMove(e.touches[0]);
      }
    });
    
    this.base.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.active = false;
      this.reset();
    });
    
    // Mouse support for debugging
    this.base.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.active = true;
      const rect = this.base.getBoundingClientRect();
      this.centerX = rect.left + rect.width / 2;
      this.centerY = rect.top + rect.height / 2;
      this.handleMove(e);
    });
    
    window.addEventListener('mousemove', (e) => {
      if (this.active) {
        this.handleMove(e);
      }
    });
    
    window.addEventListener('mouseup', () => {
      this.active = false;
      this.reset();
    });
  }
  
  handleMove(event) {
    const clientX = event.clientX;
    const clientY = event.clientY;
    
    let dx = clientX - this.centerX;
    let dy = clientY - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > this.maxDistance) {
      dx = dx / distance * this.maxDistance;
      dy = dy / distance * this.maxDistance;
    }
    
    this.currentX = dx;
    this.currentY = dy;
    
    this.thumb.style.transform = `translate(${dx}px, ${dy}px)`;
    
    // Normalize values between -1 and 1
    let normX = dx / this.maxDistance;
    let normY = dy / this.maxDistance;
    
    // Apply deadzone
    if (Math.abs(normX) < 0.1) normX = 0;
    if (Math.abs(normY) < 0.1) normY = 0;
    
    this.callback(normX, normY);
  }
  
  reset() {
    this.thumb.style.transform = `translate(0px, 0px)`;
    this.currentX = 0;
    this.currentY = 0;
    this.callback(0, 0);
  }
}