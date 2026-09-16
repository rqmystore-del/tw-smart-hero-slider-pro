import { LitElement as g, css as m, html as r } from "lit";
import { property as y, state as x } from "lit/decorators.js";
var w = Object.defineProperty, u = (f, s, t, a) => {
  for (var e = void 0, i = f.length - 1, o; i >= 0; i--)
    (o = f[i]) && (e = o(s, t, e) || e);
  return e && w(s, t, e), e;
};
const b = class b extends g {
  constructor() {
    super(...arguments), this.activeIndex = 0, this.visibleIndexes = /* @__PURE__ */ new Set([0]), this.reducedMotion = !1, this.onMotionChange = (s) => {
      this.reducedMotion = s.matches, this.restartAutoplay();
    }, this.onVisibilityChange = () => {
      document.hidden ? this.stopAutoplay() : this.restartAutoplay();
    }, this.next = () => this.scrollToIndex(this.activeIndex + 1), this.prev = () => this.scrollToIndex(this.activeIndex - 1), this.onPointerPause = () => this.stopAutoplay(), this.onPointerResume = () => this.restartAutoplay(), this.onFocusIn = () => this.stopAutoplay(), this.onFocusOut = (s) => {
      var t;
      !this.contains(s.relatedTarget) && !((t = this.shadowRoot) != null && t.contains(s.relatedTarget)) && this.restartAutoplay();
    }, this.onKeydown = (s) => {
      switch (s.key) {
        case "ArrowRight":
          this.next(), s.preventDefault();
          break;
        case "ArrowLeft":
          this.prev(), s.preventDefault();
          break;
        case "Home":
          this.scrollToIndex(0), s.preventDefault();
          break;
        case "End":
          this.scrollToIndex(this.total() - 1), s.preventDefault();
          break;
      }
    };
  }
  connectedCallback() {
    var s, t;
    super.connectedCallback(), window.matchMedia && (this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)"), this.reducedMotion = this.motionQuery.matches, (t = (s = this.motionQuery).addEventListener) == null || t.call(s, "change", this.onMotionChange)), document.addEventListener("visibilitychange", this.onVisibilityChange);
  }
  disconnectedCallback() {
    var s, t, a;
    super.disconnectedCallback(), (s = this.io) == null || s.disconnect(), this.stopAutoplay(), (a = (t = this.motionQuery) == null ? void 0 : t.removeEventListener) == null || a.call(t, "change", this.onMotionChange), document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }
  updated(s) {
    var t, a, e;
    if (s.has("config")) {
      const i = ((a = (t = this.config) == null ? void 0 : t.slides) == null ? void 0 : a.length) ?? 0;
      this.activeIndex > i - 1 && (this.activeIndex = Math.max(0, i - 1)), this.setupObserver(), this.restartAutoplay();
      const o = ((e = this.config) == null ? void 0 : e.transition_speed) ?? 600;
      this.style.setProperty("--shsp-speed", `${o}ms`);
    }
  }
  get track() {
    return this.renderRoot.querySelector("[data-shsp-track]");
  }
  get slideEls() {
    return Array.from(this.renderRoot.querySelectorAll("[data-shsp-slide]"));
  }
  setupObserver() {
    var e;
    (e = this.io) == null || e.disconnect();
    const s = this.track, t = this.slideEls;
    if (!s || t.length === 0) return;
    const a = /* @__PURE__ */ new Map();
    this.io = new IntersectionObserver(
      (i) => {
        i.forEach((n) => {
          if (a.set(n.target, n.intersectionRatio), n.intersectionRatio > 0) {
            const c = t.indexOf(n.target);
            c !== -1 && !this.visibleIndexes.has(c) && (this.visibleIndexes = new Set(this.visibleIndexes).add(c));
          }
        });
        let o = this.activeIndex, l = 0;
        t.forEach((n, c) => {
          const h = a.get(n) || 0;
          h > l && (l = h, o = c);
        }), l > 0.15 && (this.activeIndex = o);
      },
      { root: s, threshold: [0, 0.15, 0.3, 0.5, 0.75, 1] }
    ), requestAnimationFrame(() => {
      t.forEach((i) => this.io.observe(i));
    }), this.visibleIndexes.has(0) || (this.visibleIndexes = new Set(this.visibleIndexes).add(0));
  }
  isRtl() {
    return getComputedStyle(this).direction === "rtl";
  }
  total() {
    var s, t;
    return ((t = (s = this.config) == null ? void 0 : s.slides) == null ? void 0 : t.length) ?? 0;
  }
  scrollToIndex(s) {
    var i;
    const t = this.total();
    if (t < 2) return;
    s = ((i = this.config) == null ? void 0 : i.loop) ?? !0 ? (s + t) % t : Math.min(Math.max(s, 0), t - 1), this.activeIndex = s;
    const e = this.slideEls[s];
    e == null || e.scrollIntoView({
      behavior: this.reducedMotion ? "auto" : "smooth",
      inline: "start",
      block: "nearest"
    });
  }
  stopAutoplay() {
    this.autoplayTimer && (window.clearInterval(this.autoplayTimer), this.autoplayTimer = void 0);
  }
  restartAutoplay() {
    this.stopAutoplay();
    const s = this.config;
    if (!(s != null && s.autoplay) || this.reducedMotion || this.total() < 2 || document.hidden) return;
    const t = (s.autoplay_duration ?? 5) * 1e3;
    this.autoplayTimer = window.setInterval(this.next, t);
  }
  renderSlide(s, t, a) {
    const e = s.image_desktop || "", i = s.image_mobile || "", o = s.alt_text || s.title || "Slide image", l = s.overlay_opacity ?? 40, n = s.show_cta !== !1, c = s.cta_text || "تسوق الآن", h = this.visibleIndexes.has(t), p = t === this.activeIndex;
    return r`
      <div
        class="shsp-slide ${p ? "is-active" : ""} ${h ? "is-visible" : ""}"
        data-shsp-slide
      >
        <article class="shsp-card">
          ${e ? r`
                <picture class="shsp-card-media">
                  ${i ? r`<source media="(max-width: 767px)" srcset="${i}" />` : ""}
                  <img
                    src="${e}"
                    alt="${o}"
                    class="shsp-img"
                    loading="${t === 0 ? "eager" : "lazy"}"
                    fetchpriority="${t === 0 ? "high" : "auto"}"
                    @error="${(v) => v.target.classList.add("shsp-img-error")}"
                  />
                </picture>
              ` : r`<div class="shsp-card-media shsp-media-fallback" aria-hidden="true"></div>`}

          <span
            class="shsp-overlay"
            style="background-color:${s.overlay_color || "#000000"};opacity:${l / 100};"
            aria-hidden="true"
          ></span>

          <div class="shsp-card-panel" style="color:${s.text_color || "#ffffff"};">
            ${s.title ? r`<h3 class="shsp-card-title">${s.title}</h3>` : ""}
            ${s.description ? r`<p class="shsp-card-desc">${s.description}</p>` : ""}
            ${n && s.cta_url ? r`
                  <a
                    class="shsp-cta"
                    href="${s.cta_url}"
                    style="background-color:${s.button_bg_color || "#0ea5a3"};color:${s.button_text_color || "#ffffff"};"
                  >
                    ${c}
                  </a>
                ` : ""}
          </div>
        </article>
      </div>
    `;
  }
  render() {
    var i, o, l, n, c;
    const s = ((i = this.config) == null ? void 0 : i.slides) ?? [], t = s.length;
    if (t === 0) return r``;
    const a = ((o = this.config) == null ? void 0 : o.show_arrows) ?? !0, e = ((l = this.config) == null ? void 0 : l.show_dots) ?? !0;
    return r`
      <section
        class="shsp-slider"
        role="region"
        aria-roledescription="carousel"
        aria-label="Card carousel"
      >
        <div
          class="shsp-track"
          data-shsp-track
          tabindex="0"
          @keydown="${this.onKeydown}"
          @touchstart="${this.onPointerPause}"
          @touchend="${() => window.setTimeout(this.onPointerResume, 400)}"
          @mouseenter="${this.onPointerPause}"
          @mouseleave="${this.onPointerResume}"
          @focusin="${this.onFocusIn}"
          @focusout="${this.onFocusOut}"
        >
          ${s.map((h, p) => this.renderSlide(h, p, t))}
        </div>

        ${a && t > 1 ? r`
              <button
                type="button"
                class="shsp-arrow shsp-arrow-prev"
                aria-label="Previous card"
                ?disabled="${!(((n = this.config) == null ? void 0 : n.loop) ?? !0) && this.activeIndex === 0}"
                @click="${this.prev}"
              >
                <span class="shsp-arrow-icon" aria-hidden="true"></span>
              </button>
              <button
                type="button"
                class="shsp-arrow shsp-arrow-next"
                aria-label="Next card"
                ?disabled="${!(((c = this.config) == null ? void 0 : c.loop) ?? !0) && this.activeIndex === t - 1}"
                @click="${this.next}"
              >
                <span class="shsp-arrow-icon" aria-hidden="true"></span>
              </button>
            ` : ""}
        ${e && t > 1 ? r`
              <div class="shsp-dots" role="tablist" aria-label="Card navigation">
                ${s.map(
      (h, p) => r`
                    <button
                      type="button"
                      class="shsp-dot ${p === this.activeIndex ? "is-active" : ""}"
                      role="tab"
                      aria-label="Go to card ${p + 1}"
                      aria-selected="${p === this.activeIndex ? "true" : "false"}"
                      @click="${() => this.scrollToIndex(p)}"
                    ></button>
                  `
    )}
              </div>
            ` : ""}
      </section>
    `;
  }
};
b.styles = m`
    :host {
      display: block;
      --shsp-gap: 16px;
      --shsp-radius: 20px;
    }

    .shsp-slider {
      position: relative;
      width: 100%;
    }

    .shsp-track {
      display: flex;
      gap: var(--shsp-gap);
      overflow-x: auto;
      overflow-y: hidden;
      scroll-snap-type: x mandatory;
      scroll-padding-inline: var(--shsp-gap);
      -webkit-overflow-scrolling: touch;
      overscroll-behavior-x: contain;
      padding: 4px var(--shsp-gap) 20px;
      margin: -4px calc(var(--shsp-gap) * -1) -20px;
      scrollbar-width: none;
    }
    .shsp-track::-webkit-scrollbar {
      display: none;
    }
    .shsp-track:focus-visible {
      outline: 2px solid #0ea5a3;
      outline-offset: -2px;
      border-radius: var(--shsp-radius);
    }

    .shsp-slide {
      flex: 0 0 100%;
      max-width: 100%;
      scroll-snap-align: start;
    }
    @media (min-width: 768px) {
      .shsp-slide {
        flex-basis: calc((100% - var(--shsp-gap)) / 2);
      }
    }
    @media (min-width: 1024px) {
      .shsp-slide {
        flex-basis: calc((100% - 2 * var(--shsp-gap)) / 3);
      }
    }

    .shsp-card {
      position: relative;
      overflow: hidden;
      width: 100%;
      aspect-ratio: 3 / 4;
      border-radius: var(--shsp-radius);
      background: #1f2937;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
      transform: scale(0.96);
      filter: brightness(0.9);
      transition-property: transform, filter, box-shadow;
      transition-timing-function: ease;
      transition-duration: var(--shsp-speed, 0.4s);
    }

    .shsp-slide.is-active .shsp-card {
      transform: scale(1);
      filter: brightness(1);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
    }

    .shsp-card-media,
    .shsp-media-fallback {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .shsp-media-fallback {
      background: linear-gradient(135deg, #2b2f36, #12151a);
    }

    .shsp-img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      transform: scale(1.06);
      transition: transform 0.6s ease, opacity 0.3s ease;
    }
    .shsp-slide.is-active .shsp-img {
      transform: scale(1);
    }
    .shsp-img-error {
      opacity: 0;
    }

    .shsp-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .shsp-card-panel {
      position: absolute;
      inset-inline: 0;
      bottom: 0;
      z-index: 2;
      padding: 18px 18px 20px;
      text-align: start;
      border-radius: 16px 16px 0 0;
      background: rgba(20, 20, 20, 0.28);
      border: 1px solid rgba(255, 255, 255, 0.28);
      border-bottom: none;
      box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.12);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }

    .shsp-card-panel,
    .shsp-card-title,
    .shsp-card-desc,
    .shsp-cta {
      opacity: 0;
      transform: translateY(14px);
      transition-property: opacity, transform;
      transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
      transition-duration: 0.45s;
    }
    .shsp-slide.is-visible .shsp-card-panel { transition-delay: 0.05s; }
    .shsp-slide.is-visible .shsp-card-title { transition-delay: 0.15s; }
    .shsp-slide.is-visible .shsp-card-desc { transition-delay: 0.25s; }
    .shsp-slide.is-visible .shsp-cta { transition-delay: 0.35s; }
    .shsp-slide.is-visible .shsp-card-panel,
    .shsp-slide.is-visible .shsp-card-title,
    .shsp-slide.is-visible .shsp-card-desc,
    .shsp-slide.is-visible .shsp-cta {
      opacity: 1;
      transform: none;
    }

    .shsp-card-title {
      margin: 0 0 6px;
      font-size: clamp(1.05rem, 0.9rem + 0.8vw, 1.375rem);
      font-weight: 700;
      line-height: 1.3;
    }

    .shsp-card-desc {
      margin: 0 0 14px;
      font-size: clamp(0.8rem, 0.75rem + 0.3vw, 0.95rem);
      line-height: 1.55;
      opacity: 0.92;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .shsp-cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 22px;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      border-radius: 999px;
      transition: transform 0.2s ease, filter 0.2s ease, opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .shsp-cta:hover { filter: brightness(0.92); }
    .shsp-cta:active { transform: scale(0.96); }
    .shsp-cta:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 3px;
    }

    .shsp-arrow {
      position: absolute;
      top: 50%;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.9);
      cursor: pointer;
      transform: translateY(-50%);
      transition: background 0.2s ease, opacity 0.2s ease;
    }
    .shsp-arrow:hover { background: #fff; }
    .shsp-arrow:focus-visible {
      outline: 2px solid #0ea5a3;
      outline-offset: 2px;
    }
    .shsp-arrow:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .shsp-arrow-prev { inset-inline-start: 4px; }
    .shsp-arrow-next { inset-inline-end: 4px; }

    .shsp-arrow-icon {
      width: 9px;
      height: 9px;
      border-left: 2px solid #111;
      border-top: 2px solid #111;
    }
    .shsp-arrow-prev .shsp-arrow-icon { transform: rotate(-45deg); }
    .shsp-arrow-next .shsp-arrow-icon { transform: rotate(135deg); }
    :host-context([dir='rtl']) .shsp-arrow-prev .shsp-arrow-icon { transform: rotate(135deg); }
    :host-context([dir='rtl']) .shsp-arrow-next .shsp-arrow-icon { transform: rotate(-45deg); }

    .shsp-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 14px;
    }
    .shsp-dot {
      width: 9px;
      height: 9px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: rgba(120, 120, 120, 0.4);
      cursor: pointer;
      transition: width 0.2s ease, background 0.2s ease, border-radius 0.2s ease;
    }
    .shsp-dot.is-active {
      width: 22px;
      border-radius: 5px;
      background: #0ea5a3;
    }
    .shsp-dot:focus-visible {
      outline: 2px solid #0ea5a3;
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      .shsp-track { scroll-behavior: auto !important; }
      .shsp-card, .shsp-img, .shsp-card-panel, .shsp-card-title,
      .shsp-card-desc, .shsp-cta, .shsp-dot, .shsp-arrow {
        transition: none !important;
      }
      .shsp-card-panel, .shsp-card-title, .shsp-card-desc, .shsp-cta {
        opacity: 1;
        transform: none;
      }
    }
  `;
let d = b;
u([
  y({ type: Object })
], d.prototype, "config");
u([
  x()
], d.prototype, "activeIndex");
u([
  x()
], d.prototype, "visibleIndexes");
typeof d < "u" && d.registerSallaComponent("salla-hero-slider-pro");
export {
  d as default
};
