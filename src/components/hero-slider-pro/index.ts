import { css, html, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';

/**
 * Smart Hero Slider Pro — Card Slider
 * Ported from the original Twig + CSS + JS implementation to a Lit Web
 * Component for the official Twilight Bundle (Vite + Lit) runtime.
 *
 * Architecture notes (unchanged from the original build):
 *  - Layout & responsiveness (3/2/1 cards) are 100% CSS (scroll-snap).
 *  - Swipe on touch devices is 100% native browser scrolling.
 *  - "Which card is active" is derived from IntersectionObserver
 *    (highest intersection ratio wins) — direction-agnostic by
 *    construction, so RTL/LTR need no extra branching there.
 *  - Programmatic navigation (arrows/dots/keyboard/autoplay) uses the
 *    native `Element.scrollIntoView({inline: 'start'})`.
 *  - RTL/LTR: this component has its own Shadow DOM, so the `direction`
 *    CSS property (which is one of the few properties that inherits
 *    through shadow boundaries) is read via getComputedStyle for JS,
 *    and `:host-context([dir="rtl"])` is used in CSS for the one
 *    physical/visual override (arrow chevrons) — both react to
 *    whatever `dir` the storefront sets on <html>, exactly like the
 *    previous Twig build did.
 */

interface SlideConfig {
  image_desktop?: string;
  image_mobile?: string;
  alt_text?: string;
  title?: string;
  description?: string;
  show_cta?: boolean;
  cta_text?: string;
  cta_url?: string;
  text_color?: string;
  button_bg_color?: string;
  button_text_color?: string;
  overlay_color?: string;
  overlay_opacity?: number;
}

interface HeroSliderProConfig {
  autoplay?: boolean;
  autoplay_duration?: number;
  transition_speed?: number;
  loop?: boolean;
  show_arrows?: boolean;
  show_dots?: boolean;
  pause_on_hover?: boolean;
  pause_on_focus?: boolean;
  slides?: SlideConfig[];
}

export default class HeroSliderPro extends LitElement {
  @property({ type: Object })
  config?: HeroSliderProConfig;

  @state() private activeIndex = 0;
  @state() private visibleIndexes: Set<number> = new Set([0]);

  private io?: IntersectionObserver;
  private autoplayTimer?: ReturnType<typeof window.setInterval>;
  private reducedMotion = false;
  private motionQuery?: MediaQueryList;
  private onMotionChange = (event: MediaQueryListEvent) => {
    this.reducedMotion = event.matches;
    this.restartAutoplay();
  };
  private onVisibilityChange = () => {
    if (document.hidden) this.stopAutoplay();
    else this.restartAutoplay();
  };

  static styles = css`
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

  connectedCallback() {
    super.connectedCallback();
    if (window.matchMedia) {
      this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = this.motionQuery.matches;
      this.motionQuery.addEventListener?.('change', this.onMotionChange);
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.io?.disconnect();
    this.stopAutoplay();
    this.motionQuery?.removeEventListener?.('change', this.onMotionChange);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  updated(changed: PropertyValues) {
    if (changed.has('config')) {
      const total = this.config?.slides?.length ?? 0;
      if (this.activeIndex > total - 1) this.activeIndex = Math.max(0, total - 1);
      this.setupObserver();
      this.restartAutoplay();
      // Drives the active-card scale/brightness transition speed.
      const speed = this.config?.transition_speed ?? 600;
      this.style.setProperty('--shsp-speed', `${speed}ms`);
    }
  }

  private get track(): HTMLElement | null {
    return this.renderRoot.querySelector('[data-shsp-track]');
  }
  private get slideEls(): HTMLElement[] {
    return Array.from(this.renderRoot.querySelectorAll('[data-shsp-slide]'));
  }

  private setupObserver() {
    this.io?.disconnect();
    const track = this.track;
    const slides = this.slideEls;
    if (!track || slides.length === 0) return;

    const ratios = new Map<Element, number>();
    this.io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(entry.target, entry.intersectionRatio);
          if (entry.intersectionRatio > 0) {
            const idx = slides.indexOf(entry.target as HTMLElement);
            if (idx !== -1 && !this.visibleIndexes.has(idx)) {
              this.visibleIndexes = new Set(this.visibleIndexes).add(idx);
            }
          }
        });
        let bestIndex = this.activeIndex;
        let bestRatio = 0;
        slides.forEach((slide, i) => {
          const ratio = ratios.get(slide) || 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIndex = i;
          }
        });
        if (bestRatio > 0.15) this.activeIndex = bestIndex;
      },
      { root: track, threshold: [0, 0.15, 0.3, 0.5, 0.75, 1] }
    );
    // One rAF: observing right after (re)render can hand the observer a
    // stale pre-layout box for its first callback only.
    requestAnimationFrame(() => {
      slides.forEach((slide) => this.io!.observe(slide));
    });
    // Reveal the first card immediately — no flash-of-unstyled-card
    // while waiting for the first async observer callback.
    if (!this.visibleIndexes.has(0)) {
      this.visibleIndexes = new Set(this.visibleIndexes).add(0);
    }
  }

  private isRtl(): boolean {
    return getComputedStyle(this).direction === 'rtl';
  }

  private total(): number {
    return this.config?.slides?.length ?? 0;
  }

  private scrollToIndex(index: number) {
    const total = this.total();
    if (total < 2) return;
    const loop = this.config?.loop ?? true;
    index = loop ? (index + total) % total : Math.min(Math.max(index, 0), total - 1);
    this.activeIndex = index;
    const target = this.slideEls[index];
    target?.scrollIntoView({
      behavior: this.reducedMotion ? 'auto' : 'smooth',
      inline: 'start',
      block: 'nearest',
    });
  }

  private next = () => this.scrollToIndex(this.activeIndex + 1);
  private prev = () => this.scrollToIndex(this.activeIndex - 1);

  private stopAutoplay() {
    if (this.autoplayTimer) {
      window.clearInterval(this.autoplayTimer);
      this.autoplayTimer = undefined;
    }
  }
  private restartAutoplay() {
    this.stopAutoplay();
    const cfg = this.config;
    if (!cfg?.autoplay || this.reducedMotion || this.total() < 2 || document.hidden) return;
    const duration = (cfg.autoplay_duration ?? 5) * 1000;
    this.autoplayTimer = window.setInterval(this.next, duration);
  }

  private onPointerPause = () => this.stopAutoplay();
  private onPointerResume = () => this.restartAutoplay();
  private onFocusIn = () => this.stopAutoplay();
  private onFocusOut = (e: FocusEvent) => {
    if (!this.contains(e.relatedTarget as Node) && !this.shadowRoot?.contains(e.relatedTarget as Node)) {
      this.restartAutoplay();
    }
  };

  private onKeydown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        this.next();
        e.preventDefault();
        break;
      case 'ArrowLeft':
        this.prev();
        e.preventDefault();
        break;
      case 'Home':
        this.scrollToIndex(0);
        e.preventDefault();
        break;
      case 'End':
        this.scrollToIndex(this.total() - 1);
        e.preventDefault();
        break;
    }
  };

  private renderSlide(slide: SlideConfig, index: number, total: number): TemplateResult {
    const imageDesktop = slide.image_desktop || '';
    const imageMobile = slide.image_mobile || '';
    const altText = slide.alt_text || slide.title || 'Slide image';
    const overlayOpacity = slide.overlay_opacity ?? 40;
    const showCta = slide.show_cta !== false;
    const isVisible = this.visibleIndexes.has(index);
    const isActive = index === this.activeIndex;

    return html`
      <div
        class="shsp-slide ${isActive ? 'is-active' : ''} ${isVisible ? 'is-visible' : ''}"
        data-shsp-slide
      >
        <article class="shsp-card">
          ${imageDesktop
            ? html`
                <picture class="shsp-card-media">
                  ${imageMobile ? html`<source media="(max-width: 767px)" srcset="${imageMobile}" />` : ''}
                  <img
                    src="${imageDesktop}"
                    alt="${altText}"
                    class="shsp-img"
                    loading="${index === 0 ? 'eager' : 'lazy'}"
                    fetchpriority="${index === 0 ? 'high' : 'auto'}"
                    @error="${(e: Event) => (e.target as HTMLElement).classList.add('shsp-img-error')}"
                  />
                </picture>
              `
            : html`<div class="shsp-card-media shsp-media-fallback" aria-hidden="true"></div>`}

          <span
            class="shsp-overlay"
            style="background-color:${slide.overlay_color || '#000000'};opacity:${overlayOpacity / 100};"
            aria-hidden="true"
          ></span>

          <div class="shsp-card-panel" style="color:${slide.text_color || '#ffffff'};">
            ${slide.title ? html`<h3 class="shsp-card-title">${slide.title}</h3>` : ''}
            ${slide.description ? html`<p class="shsp-card-desc">${slide.description}</p>` : ''}
            ${showCta && slide.cta_text && slide.cta_url
              ? html`
                  <a
                    class="shsp-cta"
                    href="${slide.cta_url}"
                    style="background-color:${slide.button_bg_color || '#0ea5a3'};color:${slide.button_text_color || '#ffffff'};"
                  >
                    ${slide.cta_text}
                  </a>
                `
              : ''}
          </div>
        </article>
      </div>
    `;
  }

  render() {
    const slides = this.config?.slides ?? [];
    const total = slides.length;
    if (total === 0) return html``;

    const showArrows = this.config?.show_arrows ?? true;
    const showDots = this.config?.show_dots ?? true;

    return html`
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
          ${slides.map((slide, i) => this.renderSlide(slide, i, total))}
        </div>

        ${showArrows && total > 1
          ? html`
              <button
                type="button"
                class="shsp-arrow shsp-arrow-prev"
                aria-label="Previous card"
                ?disabled="${!(this.config?.loop ?? true) && this.activeIndex === 0}"
                @click="${this.prev}"
              >
                <span class="shsp-arrow-icon" aria-hidden="true"></span>
              </button>
              <button
                type="button"
                class="shsp-arrow shsp-arrow-next"
                aria-label="Next card"
                ?disabled="${!(this.config?.loop ?? true) && this.activeIndex === total - 1}"
                @click="${this.next}"
              >
                <span class="shsp-arrow-icon" aria-hidden="true"></span>
              </button>
            `
          : ''}
        ${showDots && total > 1
          ? html`
              <div class="shsp-dots" role="tablist" aria-label="Card navigation">
                ${slides.map(
                  (_, i) => html`
                    <button
                      type="button"
                      class="shsp-dot ${i === this.activeIndex ? 'is-active' : ''}"
                      role="tab"
                      aria-label="Go to card ${i + 1}"
                      aria-selected="${i === this.activeIndex ? 'true' : 'false'}"
                      @click="${() => this.scrollToIndex(i)}"
                    ></button>
                  `
                )}
              </div>
            `
          : ''}
      </section>
    `;
  }
}
