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
  function showLocation(
    scroll: boolean,
    id = location.hash.slice(1),
    focus = true,
  ) {
    const target = document.getElementById(id);
    const chapter =
      target?.closest<HTMLElement>('[data-chapter]') ?? chapters[0];
    const atClosing = target === closing;
    for (const section of chapters)
      section.hidden = atClosing || section !== chapter;
    closing.hidden = !atClosing;
    for (const link of links) {
      if (!atClosing && link.dataset.chapterLink === chapter.dataset.chapter) {
        link.setAttribute('aria-current', 'step');
        // Keep the active chapter in view within the phone's horizontal nav,
        // without moving the page away from the selected artwork or heading.
        const nav = link.parentElement!;
        const item = link.getBoundingClientRect();
        const bounds = nav.getBoundingClientRect();
        if (item.left < bounds.left) nav.scrollLeft -= bounds.left - item.left;
        else if (item.right > bounds.right)
          nav.scrollLeft += item.right - bounds.right;
      } else link.removeAttribute('aria-current');
    }
    exhibition!.dataset.currentChapter = atClosing
      ? 'closing'
      : chapter.dataset.chapter;
    if (scroll && target) {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      if (!focus) return;
      const focusTarget = target.querySelector<HTMLElement>(
        'h2[tabindex], .exhibition-art',
      );
      focusTarget?.focus({ preventScroll: true });
    }
  }
  showLocation(Boolean(location.hash));
  window.addEventListener('hashchange', () => showLocation(true));
  // The audio tour brings each stop on screen without touching the hash or
  // moving keyboard focus away from its controls.
  document.addEventListener('nnxyz:reveal', (event) => {
    const id = (event as CustomEvent<{ id: string | null }>).detail.id;
    if (id) showLocation(true, id, false);
  });
}
