/** Lines of text that fade in and out one after another at the bottom of the screen. */
export class Narration {
  constructor(el) {
    this.el = el;
    this.queue = [];
    this.busy = false;
  }

  show(text, hold = 4200) {
    // If lines pile up (quick touches), drop the stale ones so text keeps up with what happens
    if (this.queue.length >= 1) this.queue.splice(0, this.queue.length);
    this.queue.push({ text, hold });
    if (!this.busy) this.next();
    else if (this.current) this.current.cut = true;
  }

  /** Stop everything; `hide` also fades out the line on screen. */
  clear(hide = false) {
    this.queue.length = 0;
    if (hide) this.el.classList.remove('show');
  }

  next() {
    const item = this.queue.shift();
    if (!item) {
      this.busy = false;
      return;
    }
    this.busy = true;
    this.current = item;
    this.el.textContent = item.text;
    this.el.classList.add('show');
    // Show for `hold` ms, or move on sooner (but after at least 1.8s) when a newer line is waiting
    const started = performance.now();
    const tick = () => {
      const age = performance.now() - started;
      if (age < item.hold && !(item.cut && age > 1800)) return setTimeout(tick, 100);
      this.el.classList.remove('show');
      setTimeout(() => this.next(), 900);
    };
    setTimeout(tick, 100);
  }
}

