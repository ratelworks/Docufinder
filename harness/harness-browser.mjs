// 하니스 검증 공용 도우미 — 브라우저는 공통 모듈 browser-port(vendor/browser-port)만 쓴다.
// Playwright locator(getByTitle·hasText)를 쓰던 자리를 CSS 선택자 문자열로 바꾸는 데 필요한 것만 둔다.

/** CSS 속성값 따옴표 문자열 — 역슬래시·따옴표를 이스케이프한다 (예: [title=${css('C:\\문서 열기')}]) */
export function css(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * selector 에 맞는 요소 가운데 글(innerText)에 text 가 든 첫 요소에 data-harness=tag 표지를 붙인다.
 * React 가 다시 그리면 표지가 사라질 수 있으므로 그 요소를 쓰기 직전마다 부른다. 못 찾으면 던진다.
 */
export async function tagByText(page, selector, text, tag) {
  const ok = await page.evaluate(([sel, txt, tg]) => {
    for (const old of document.querySelectorAll(`[data-harness="${tg}"]`)) old.removeAttribute("data-harness");
    const el = [...document.querySelectorAll(sel)].find((e) => (e.innerText || "").includes(txt));
    if (!el) return false;
    el.setAttribute("data-harness", tg);
    return true;
  }, [selector, text, tag]);
  if (!ok) throw new Error(`하니스: '${selector}' 가운데 '${text}' 를 가진 요소가 없습니다`);
}
