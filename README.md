# LiteView 2.0

LiteView is a minimal, expressive UI layer for the DOM, engine system for GAME, focusing on chainable components, real-time updates, and platform closeness without frameworks or wrappers.

```bash
npm install @harun-aksoy/liteview
```

## Basic View


```js
View()
  .frame(200, 80)
  .position(self.center, self.center)
  .background(Color("purple"))
  .radius(16)
```

Everything is chainable. Everything is real.

## Layout & Positioning

```js
View()
  .frame(self.half, 60)
  .position(self.trailing, self.bottom)
  .offset(-20, -20)
```

Supported keywords: leading, center, trailing top, center, bottom full, half, quarter

Layouts respond naturally to resize events.

## Resize-aware Components


```js
View()
  .background(Color("orange"))
  .on("resize", (self, w, h) => {
    self.frame(w / 3, 50)
    self.position(self.center, self.center)
  })
```

Each component owns its own resize logic.

## Text


```js
Text("Hello Liteview")
  .size(24)
  .bold()
  .foreground("white")
```

Text is just styled DOM — no wrappers, no templates.

## Gestures


```js
View()
  .components(Gesture)
  .background(Color("blue"))
  .on("tap", (self, end) => {
    if (end) self.background(Color("red"))
  })
  .on("drag", (self, end, dx, dy) => {
    self.offset(dx, dy)
  })
```

Built-in gestures: tap, doubletap, press, longpress, drag, hover

## Animation


```js
View()
  .background(Color("green"))
  .ease("inout", 1, false, { loop: Infinity }, (self, p) => {
    self.angle(p * 360)
  })
```

Spring-based motion:


```js
View()
  .spring(20, {}, (self, p) => {
    self.scale?.(1 + p * 0.2)
  })
```

Animations are driven by a fixed timestep update loop.

## Physics (Optional)

Liteview can integrate with p2.js for simple physics-driven UI.


```js
View()
  .components(Physic, Gesture)
  .frame(50, 50)
  .background(Color("orange"))
  .mass(1)
  .collider("circle")
  .on("tap", () => {
    self.addImpulse(0, -120)
  })
```

Static bodies:


```js
View()
  .components(Physic)
  .mass(0)
  .collider("box")
```

DOM and physics stay automatically in sync.

## Philosophy

Liteview does not try to be a framework.

It is a small, expressive layer that:

-   avoids indirection
-   exposes time instead of lifecycle hooks
-   keeps layout and motion explicit
-   stays close to the platform

If you can use the DOM, you already know Liteview.

## Roadmap (Ideas)

Liteview intentionally grows slowly. Possible future directions include:

-   More layout helpers (flex / span / constraints)
-   Declarative transforms (scale, skew, pivot)
-   Timeline-based animations
-   Gesture extensions (swipe, pinch)
-   Headless rendering modes
-   Better composition patterns

Nothing is rushed. Everything stays minimal.
