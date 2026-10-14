/** Progressive enhancement: without JS the complete exhibition remains readable. */
export function initExhibition() {
  const exhibition = document.querySelector<HTMLElement>('[data-exhibition]');
  if (!exhibition) return;
  const chapters = Array.from(
    exhibition.querySelectorAll<HTMLElement>('[data-chapter]'),
  );
  const closing = exhibition.querySelector<HTMLElement>('[data-closing]')!;
  const links = Array.from(
    exhibition.querySelectorAll<HTMLAnchorElement>('[data-chapter-link]'),
  );
  function showLocation(scroll: boolean) {
    const target = document.getElementById(location.hash.slice(1));
    const chapter =
      target?.closest<HTMLElement>('[data-chapter]') ?? chapters[0];
    const atClosing = target === closing;
    for (const section of chapters)
      section.hidden = atClosing || section !== chapter;
    closing.hidden = !atClosing;
    for (const link of links) {
      if (!atClosing && link.dataset.chapterLink === chapter.dataset.chapter)
        link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    }
    exhibition!.dataset.currentChapter = atClosing
      ? 'closing'
      : chapter.dataset.chapter;
    if (scroll && target) {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      const focusTarget = target.querySelector<HTMLElement>(
        'h2[tabindex], .exhibition-art',
      );
      focusTarget?.focus({ preventScroll: true });
    }
  }
  showLocation(Boolean(location.hash));
  window.addEventListener('hashchange', () => showLocation(true));
}
