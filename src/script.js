//import * as p2 from 'p2';



(() => {
  document.body.style.width = "100vw";
  document.body.style.height = "100vh";
  document.body.style.overflow = "hidden";

  // event systems
  window._events = {};

  window.on = (event, fn) => {
    (window._events[event] ??= []).push(fn);
    return window;
  };
  
  window.off = (event) => {
    delete window._events[event];
    return window;
  };
  
  window.emit = (event, ...args) => {
    window._events[event]?.forEach(fn => fn(...args));
    return window;
  };
  
  window.components = (...fns) => {
    for (const fn of fns) {
      if (typeof fn === 'function') fn(window);
    }
    return window;
  };
    
  // window update system
  const FIXED_DT = 1 / 30; // 30 FPS // sabit dt 0.033
  let last = performance.now() / 1000;  // saniye cinsinden
  let acc = 0, time = 0;

  // Fixed timestep update loop
  function loop() {
    const now = performance.now() / 1000;
    let dt = now - last;
    last = now;

    if (dt > 0.25) dt = 0.25;  // Uzun frameleri sınırla (örn. arka planda kalmış sekme gibi)
    acc += dt;  // Frame arası kalan zamanlar sonraki tura kalıyor

    while (acc >= FIXED_DT) {  // Yavaş makinelerde döngüyle birden fazla frame telafisi dt kadar
      time += FIXED_DT;
      window.emit('update', FIXED_DT, time);
      acc -= FIXED_DT;
    }

    requestAnimationFrame(loop);
  }

  loop();

  // Resize (sade: sadece w,h)
  window.addEventListener('resize', () => {
    window.emit('resize', window.innerWidth, window.innerHeight);
  });

  // Klavye olayları - gesture sistemine uygun
  window.addEventListener('keydown', e => {
    self.emit?.('key', false, e.key, e);
  });
  
  window.addEventListener('keyup', e => {
    self.emit?.('key', true, e.key, e); // key confirmed - true - end
  });

})();



export function Entity(self = document.createElement('div')) {
  //const self = document.createElement('div');
  self.active = true;
    
  // event systems
  self._events = {};

  self.on = (event, fn) => {
    (self._events[event] ??= []).push(fn);
    return self;
  };
  
  self.off = (event) => {
    delete self._events[event];
    return self;
  };
  
  self.emit = (event, ...args) => {
    self._events[event]?.forEach(fn => fn(...args));
    return self;
  };
    
  self.components = (...all) => {
    for (const fn of all) {
      if (typeof fn === 'function') {
        fn(self); // direkt çalıştır self ver
      }
    }
    return self;
  };
    
  //////////////////////////////////////////////////

  self.clone = () => {
  	const cloned = Entity(...[...self.childNodes].map((n) => n.cloneNode(true)));
  	cloned.style.cssText = self.style.cssText;
  	cloned.className = self.className;
  	cloned.id = self.id;
  	return cloned;
  };
  
  // class
  self.tags = (...values) => {
  	if (values.length === 0) {
  		return self.className.trim().split(/\s+/);
  	}
  	self.className = values.join(" ");
  	return self;
  };
  
  // id
  self.name = (value) => {
  	if (value === undefined) return self.id;
  	self.id = value;
  	return self;
  };
  
  self.destroy = () => {
      for (const event in self._events) {
          self.off(event);
      }
  	self.remove();
  	return null;
  };
  
  
  //document.body.appendChild(self);
  return self;
}



export function Animation(self) {
  self.animations = [];
  self._paused = false;

  self.pause = (state = true) => (self._paused = state, self);

  self.ease = (type="linear", dur=1, rev=false, opts={}, fn) => {
    self.animations.push({
      type, dur, rev,
      delay: opts.delay||0,
      loop: opts.loop||1,
      spring: opts.spring||null,
      fn, start:null
    });
    return self;
  };

  self.spring = (bounce=20, opts={}, fn) => {
    const springConf = {
      damping: opts.damping ?? 10,
      stiffness: opts.stiffness ?? 100,
      bounce
    };
    self.animations.push({
      type:"linear",
      dur: opts.dur ?? 1,
      rev: false,
      delay: opts.delay||0,
      loop: opts.loop||1,
      spring: springConf,
      fn,
      start:null
    });
    return self;
  };

  const ease = {
    linear:t=>t,
    in:t=>t*t*t,
    out:t=>1-Math.pow(1-t,3),
    inout:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,
  };

  const springFn = (t,{damping,stiffness,bounce}) =>
    1 - Math.exp(-damping*t) * Math.cos(stiffness*t) + bounce/100*t;

  window.on("update",(dt,t)=>{
    if(self._paused || !self.animations.length) return;
    let a=self.animations[0];
    if(!a.start) a.start=t+a.delay;

    let el=(t-a.start)/a.dur;
    if(el<0) return;

    let p=Math.min(el%1,1);
    if(a.rev && Math.floor(el)%2) p=1-p;

    p=(ease[a.type]||ease.linear)(p);
    if(a.spring) p=springFn(p,a.spring);

    a.fn?.(self,p);

    if(el>=a.loop) self.animations.shift();
  });

  return self;
}



// swipe gesture eklemeyi unutma cano---------------------------------
export function Gesture(self) {
  let isDown = false;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  let longpressTimer = null;
  let lastTapTime = 0;
  let pressLoop = null;

  self.addEventListener('pointerdown', e => {
    isDown = true;
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;

    // TAP start
    self.emit?.('tap', self, false, startX, startY);

    // PRESS start
    self.emit?.('press', self, false, startX, startY);

    // PRESS loop (basılı tutuldukça çalışır)
    pressLoop = () => {
      if (!isDown) return;
      self.emit?.('press', self, false, startX, startY);
      requestAnimationFrame(pressLoop);
    };
    requestAnimationFrame(pressLoop);

    // LONGPRESS başlat
    longpressTimer = setTimeout(() => {
      if (isDown) {
        self.emit?.('longpress', self, true, startX, startY);
      }
    }, 500); // süresi ayarlanabilir
  });

  self.addEventListener('pointermove', e => {
    if (!isDown) return;

    const x = e.clientX;
    const y = e.clientY;
    const dx = x - startX;
    const dy = y - startY;

    if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      isDragging = true;
    }

    if (isDragging) {
      self.emit?.('drag', self, false, dx, dy, x, y);
    }
  });

  self.addEventListener('pointerup', e => {
    if (!isDown) return;
    isDown = false;

    const x = e.clientX;
    const y = e.clientY;
    const dx = x - startX;
    const dy = y - startY;

    const isInside = self.contains?.(e.target);

    clearTimeout(longpressTimer);
    pressLoop = null;

    if (isDragging) {
      self.emit?.('drag', self, true, dx, dy, x, y);
    }

    if (isInside && !isDragging) {
      self.emit?.('tap', self, true, x, y);

      const now = Date.now();
      if (now - lastTapTime < 300) {
        self.emit?.('doubletap', self, true, x, y);
      }
      lastTapTime = now;
    }

    // PRESS end
    self.emit?.('press', self, true, x, y);
  });

  self.addEventListener('mouseenter', e => {
    self.emit?.('hover', self, true, e);
  });

  self.addEventListener('mouseleave', e => {
    self.emit?.('hover', self, false, e);
  });
    
}



/////////// ileride yapılacak //////////
// .frame(w,h) ✅
// .frame(func,func) ✅  self => self.pa.width / 2, self.pa.frame.w
// .frame({flex:0.5,min:50,max:150},{flex:0.5,min:50,max:150})
// .frame(Math.max(view.parent().frame()[0], 300), 50) // min 300px
// .frame(view.parent().frame()[0] * (1/3), 80); // parent 1/3 or paWidth
// .frame(Math.max(Infinity, 300), 50); // min 300px 
// .on('resize', self => self.position( self.pa.width/2, self.pa.width/2 ))
//  
// .frame(300,300) .padding(20,0)
// .position (200,200) .offset(20,0)
// .flex(2,3,{maxWidth,minWidth}) .span(2,1)
/////////// ileride yapılacak //////////
export function UIComponents(self) {
  self.style.display = 'block';
  self.style.margin = '0';
  self.style.padding = '0';
  self.style.inset = '0';
  self.style.position = "absolute";
  self.style.zIndex = "1";
  self.style.boxSizing = "border-box";
  self.style.transform = 'translate(-50%, -50%)'; // frame pivot
  self.style.transformOrigin = "center"; // rotation pivot
    
  // Background layer (en altta)
  const background = document.createElement('div');
  background.style.position = 'absolute';
  background.style.inset = '0';
  background.style.zIndex = '0';
  background.style.overflow = 'hidden';
  self.appendChild(background);

  //// Content layer (üstte)
  //const content = document.createElement('div');
  //content.style.position = 'absolute';
  //content.style.inset = '0';
  //content.style.zIndex = '1';
  //self.appendChild(content);

  // basit değişkenler (state yok, helper yok)
  const frame    = [100, 100];  // w, h 
  const position = [0, 0];      // x, y 
  const angle    = [0]; 
    
  [
  "leading","center","trailing",
  "top","bottom",
  "full","half","quarter"
  ].forEach(key => self[key] = { [key]: true });
    
  // FRAME
  self.frame = (w, h) => {
    if (w === undefined && h === undefined) return frame;
    if (Array.isArray(w)) [w, h] = w;
    //  if (w !== undefined) self.style.width  = `${frame[0] = w}px`;
    //  if (h !== undefined) self.style.height = `${frame[1] = h}px`;
      
    const pw = self.parent()?.frame?.()[0] ?? 0;
    const ph = self.parent()?.frame?.()[1] ?? 0;
    
    // --- Genişlik ---
    if (w?.full || w === Infinity)  frame[0] = pw;
    else if (w?.half)               frame[0] = pw/2;
    else if (w?.quarter)            frame[0] = pw/4;
    else if (typeof w === 'object') {  
      let size = pw;
      if (w.min !== undefined) size = Math.max(size, w.min);
      if (w.max !== undefined) size = Math.min(size, w.max);
      frame[0] = size;
    } else if (Number.isFinite(w)) frame[0] = w;

    // --- Yükseklik ---
    if (h?.full || h === Infinity)  frame[1] = ph;
    else if (h?.half)               frame[1] = ph/2;
    else if (h?.quarter)            frame[1] = ph/4;
    else if (typeof h === 'object') {  
      let size = ph;
      if (h.min !== undefined) size = Math.max(size, h.min);
      if (h.max !== undefined) size = Math.min(size, h.max);
      frame[1] = size;
    } else if (Number.isFinite(h)) frame[1] = h;
      
    self.style.width  = `${frame[0]}px`; 
    self.style.height = `${frame[1]}px`;
    return self;
  };
  
  // POSITION → sayı veya keyword destekli, minimal
  self.position = (x, y) => {
    if (x === undefined && y === undefined) return position; // getter
    if (Array.isArray(x)) [x, y] = x;
    //  if (x !== undefined) self.style.left = `${position[0] = x}px`;
    //  if (y !== undefined) self.style.top  = `${position[1] = y}px`;
  
    const pw = self.parent()?.frame?.()[0] ?? 0;
    const ph = self.parent()?.frame?.()[1] ?? 0;
    const swx = self.frame?.()[0]/2 ?? 0;
    const shy = self.frame?.()[1]/2 ?? 0;
  
    // --- X ekseni ---
    if (typeof x === 'number') position[0] = x;
    else if (x?.leading)  position[0] = 0 + swx;
    else if (x?.trailing) position[0] = pw - swx;
    else if (x?.center)   position[0] = pw/2; 
    // --- Y ekseni ---
    if (typeof y === 'number') position[1] = y;
    else if (y?.top)    position[1] = 0 + shy;
    else if (y?.bottom) position[1] = ph - shy;
    else if (y?.center) position[1] = ph/2;
  
    self.style.left = `${position[0]}px`;
    self.style.top  = `${position[1]}px`;
    return self; // chainable
  };

  // OFFSET → sadece position üzerinde kayma yapar
  self.offset = (dx = 0, dy = 0) => {
    const [x, y] = self.position();
    return self.position(x + dx, y + dy);
  };
  
  // PADDING → frame’i küçültür
  self.padding = (px = 0, py = px) => {
    const [w, h] = self.frame();
    return self.frame(w - 2*px, h - 2*py);
  };
    
  
  // ANGLE (deg)
  self.angle = (deg) => {
    if (deg === undefined) return angle; 
    if (deg !== undefined) self.style.rotate = `${angle[0] = deg}deg`; // state ve DOM tek satırda
    return self;
  };
    
    
  // OPACITY
  self.opacity = (val) => {
    if (val === undefined) 
      return parseFloat(background.style.opacity) || 1;
      
    background.style.opacity = val;
    return self;
  };

  // VISIBLE
  self.visible = (show = true) => {
    background.style.display = show ? 'block' : 'none';
    return self;
  };
    
  // SCROLL
  self.scroll = (vertical = true) => {
    vertical ? self.style.overflowY = 'scroll' : self.style.overflowX = 'scroll';
    return self;
  };
    
  self.radius = (...radii) => {
    background.style.borderRadius = radii
        .map(r => isNaN(r) ? r : `${r}px`)
        .join(" ");
    return self;
  };
    
  self.border = (color = 'black', width = 2, style = 'solid') => {
        background.style.border = `${width}px ${style} ${color}`;
        return self;
  };

  self.shadow = (color = 'rgba(0,0,0,0.25)', radius = 6, x = 0, y = 4) => {
      background.style.boxShadow = `${x}px ${y}px ${radius}px ${color}`;
      return self;
  };

  // filter / backdrop
  self.filter = (value) => {
      background.style.filter = value;
      return self;
  };
    
  self.backdrop = (value) => {
      background.style.backdropFilter = value;
      return self;
  };
  
  // clip - mask
  self.clip = (value) => {
      background.style.clipPath = value;
      return self;
  };

  // FOREGROUND (tüm çocuk textlere renk)
  self.foreground = (color) => {
      if (color === undefined) return content.style.color || null;
      content.style.color = color; // children otomatik inherit
      return self;
  };

  // BACKGROUND (z-index 0'a append eder)
  self.background = (view) => {
    background.appendChild(view);
    return self;
  };
    
  // CHILD (z-index 1'e append eder)
  self.child = (...children) => {
    self.append(...children)
    return self;
  };
    
  // PARENT
  self.parent = (parent) => {
    if (parent === undefined) return self.parentElement;
    parent?.appendChild(self);
    return self;
  };
  

  window.on('update', (dt, t) => {
    self.emit('update', self, dt, t);
  });

  window.on("resize", () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // her component kendi resize'ini dinler
    self.emit("resize", self,  w, h);
  });
  
  // İlk render için (DOM ve layout hazır olduğunda bir kere tetikle)
  requestAnimationFrame(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    //self.emit("resize", self, w, h);
    window.emit("resize", w, h);
  });

  return self;
}

  
Entity(document.body);
// 4️⃣ Artık components ekleyebilirsin (isteğe bağlı)
document.body.components(UIComponents);
document.body.on('resize',(self,w,h)=>{
    self.frame(w,h)
    self.position(w/2,h/2)
}); 




export function Physic(self) {
  const SCALE = 50; // 1m = 50px

  // Eğer global world yoksa oluştur
  if (!window._p2world) {
    window._p2world = new p2.World({ gravity: [0, 9.82] });
    window._activeContacts = new Map();

    // update döngüsü (sadece fizik için)
    let last = performance.now();
    function loop() {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      window._p2world.step(1 / 60, dt, 10);
      window.emit("physicUpdate", dt);
      requestAnimationFrame(loop);
    }
    loop();

    // Çarpışma olayları
    window._p2world.on("beginContact", (evt) => {
      const A = evt.bodyA.sprite;
      const B = evt.bodyB.sprite;
      if (!A || !B) return;
      const key = `${A.id}-${B.id}`;
      window._activeContacts.set(key, true);
      A.emit?.("hit", B);
      B.emit?.("hit", A);
    });

    window._p2world.on("endContact", (evt) => {
      const A = evt.bodyA.sprite;
      const B = evt.bodyB.sprite;
      if (!A || !B) return;
      const key = `${A.id}-${B.id}`;
      window._activeContacts.delete(key);
      A.emit?.("hitEnd", B);
      B.emit?.("hitEnd", A);
    });
  }

  // Body (başta null)
  self.body = null;

  // --- API ---

  self.mass = (m) => {
    if (!self.body) {
      self.body = new p2.Body({
        mass: m,
        position: [self.position()[0] / SCALE, self.position()[1] / SCALE],
      });
      self.body.sprite = self;
      window._p2world.addBody(self.body);
    } else {
      self.body.mass = m;
      self.body.type = m <= 0 ? p2.Body.STATIC : p2.Body.DYNAMIC;
      if (m > 0) self.body.updateMassProperties();
    }
    return self;
  };

  self.collider = (type = "box", opts = {}) => {
    if (!self.body) self.mass(1); // body yoksa otomatik ekle

    let shape;
    if (type === "box") {
      const [w, h] = self.frame();
      const width = (opts.width ?? w) / SCALE;
      const height = (opts.height ?? h) / SCALE;
      shape = new p2.Box({ width, height });
    }
    if (type === "circle") {
      const [w] = self.frame();
      const r = (opts.radius ?? w / 2) / SCALE;
      shape = new p2.Circle({ radius: r });
    }
    if (shape) self.body.addShape(shape);
    return self;
  };

  self.addForce = (fx = 0, fy = 0) => {
    if (self.body) self.body.applyForce([fx / SCALE, fy / SCALE]);
    return self;
  };

  self.addImpulse = (ix = 0, iy = 0) => {
    if (self.body) self.body.applyImpulse([ix / SCALE, iy / SCALE]);
    return self;
  };

  self.velocity = (vx, vy) => {
    if (!self.body) return [0, 0];
    if (vx === undefined && vy === undefined) return self.body.velocity;
    if (vx !== undefined) self.body.velocity[0] = vx;
    if (vy !== undefined) self.body.velocity[1] = vy;
    return self;
  };

  // DOM ↔ Physic senkron
  window.on("physicUpdate", () => {
    if (!self.body) return;

    if (self.body.type === p2.Body.STATIC) {
      // DOM → Physic
      const [px, py] = self.position();
      self.body.position[0] = px / SCALE;
      self.body.position[1] = py / SCALE;
      self.body.angle = (self.angle() * Math.PI) / 180;
    } else {
      // Physic → DOM
      const [bx, by] = self.body.position;
      self.position(bx * SCALE, by * SCALE);
      self.angle((self.body.angle * 180) / Math.PI);
    }
  });

  return self;
}








export const Color = (color) => {
    const self = document.createElement('div')
    self.style.display = 'flex';
    self.style.position = 'absolute';
    self.style.inset = '0';
    self.style.width = '100%';
    self.style.height = '100%';
    self.style.background = color;
    return self;
}



export const View = () => {
    const self = Entity().components(UIComponents)
    document.body.appendChild(self);
    return self;
} 



//const viewD = View().components(Gesture)
//    //.frame(self=>self.parentElement.clientWidth,30)
//    //.padding(30,0)
//    //.position(viewD.parentElement.clientWidth/2,viewD.parentElement.clientHeight/2)
//    //.offset(100,0) 
//    .background(Color('purple'))
//    .border('white').radius(16)
//    .on('resize',self=>{
//        self.position(self.center,self.center) 
//        //self.frame(self.parent().frame()[0]/4,50)
//        //self.frame(Math.max(Infinity,300),50)
//        self.frame({max:200,min:100},50)
//        self.padding(0,0)
//    })
//    .on('tap',self=>self.background(Color('magenta')))
//
//
//const viewB = View().components(Gesture).parent(viewD)
//.background(Color('brown'))
//.border('white').radius(16)
//.frame(Infinity,20)
//.on('resize',self=>{
//self.position(self.leading,self.top)})
//.on('tap',self=>self.background(Color('blue')))
//
//
//// Dünya zaten ilk Physic çağrıldığında oluşur
//
//// Dinamik kutu
//View()
//  .components( Physic, Gesture)
//  .background(Color('orange'))
//  .frame(50,50)
//  .position(100,0)
//  .angle(125)
//  .mass(1)
//  .collider('circle', { radius: 25 })
//  .on('tap', (self, check) => {
//    //if(check) self.background(Color('magenta'))
//    self.addImpulse(0,-100); // sürekli aşağıya it
//  })
//  .on('hit', (self, other) => {
//    console.log("Çarpışma başladı:", other);
//  })
//  .on('hitEnd', (self, other) => {
//    console.log("Çarpışma bitti:", other);
//  })
//  .style.border = 'black 2px solid'
//
//// Statik platform
//View()
//  .components(Physic,Gesture)
//  .background(Color('orange'))
//  .border()
//  .on('resize',self=>{
//    self.frame(self.half, 100)
//    //self.padding(0,300)
//    self.position(self.center, self.bottom)
//    self.collider('box', { width: self.frame()[0], height: self.frame()[1] })
//  }) 
//  //.frame(300, 100)
//  //.position(200, 500)
//  .mass(0) // statik
//  //.collider('box', { width: 300, height: 100 });
//  .on('hover',(self,onHover)=>{
//    self.background(Color('orange'))
//    if(onHover) self.background(Color('red'))
//  })







export const Text = (value = "", ...children) => {
    const self = document.createElement("span");
    self.style.display = "inline-block"; // inline akışta olsun
    self.style.whiteSpace = "pre"; // pre
    self.style.width = "100%";
    self.style.height = "100%";
    
    if (value) self.innerText = value;

    if (children.length > 0) {
        children.forEach(child => self.appendChild(child));
    }

    // val getter/setter
    self.val = (v) => {
        if (v === undefined) return self.textContent;
        self.textContent = v;
        return self;
    };

    // font helpers
    self.size = (px) => { self.style.fontSize = typeof px === "number" ? `${px}px` : px; return self; };
    self.family = (f) => { self.style.fontFamily = f; return self; };
    self.weight = (w) => { self.style.fontWeight = w; return self; };
    self.bold = (enabled = true) => { self.style.fontWeight = enabled ? "bold" : "normal"; return self; };
    self.underline = (enabled = true) => { self.style.textDecoration = enabled ? "underline" : "none"; return self; };
    self.italic = (enabled = true) => { self.style.fontStyle = enabled ? "italic" : "normal"; return self; };
    self.smallcaps = (enabled = true) => { self.style.fontVariant = enabled ? "small-caps" : "normal"; return self; };
    self.align = (a) => { self.style.textAlign = a; return self; };
    self.space = (px) => { self.style.letterSpacing = typeof px === "number" ? `${px}px` : px; return self; };

    // foreground (renk)
    self.foreground = (color) => {
        if (color === undefined) return self.style.color || null;
        self.style.color = color;
        return self;
    };

    document.body.appendChild(self)
    return self;
};

export const Image = (src = "") => {
    const self = document.createElement('img');
    self.style.position = 'absolute';
    self.style.width = '100%';
    self.style.height = '100%';
    self.style.objectFit = 'cover';       // cover, contain veya fill ile değiştirilebilir
    self.style.imageRendering = 'pixelated'; // pixelated efekt
    self.style.pointerEvents = 'none';       // tıklanmasın
    self.style.userSelect = 'none';          // seçilemesin
    self.decoding = 'async';
    self.loading = 'lazy';

    // Kaynak setter/getter
    self.val = (value) => {
        if (value === undefined) return self.src;
        self.src = value;
        return self;
    };

    // Object fit helper
    self.fit = (mode = "cover") => {
        self.style.objectFit = mode;
        return self;
    };

    if (src) self.val(src);

    document.body.appendChild(self);
    return self;
};






