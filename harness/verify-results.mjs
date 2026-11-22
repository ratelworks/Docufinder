/**
 * 검색 결과 리스트 클릭 UX 검증 — 헤드리스 Chrome(공통 모듈 browser-port).
 * v3.2.7 열기 방식 설정(한 번/두 번 클릭)·저장 위치 표시(컴팩트 포함, 꼬리 우선 축약)의
 * 실브라우저 실효 검증. 실행 전 build+preview 필요 (README 참조), ?view=results 로 마운트.
 */
import { launch } from "./browser-port.mjs";
import { css, tagByText } from "./harness-browser.mjs";

const BASE = "http://127.0.0.1:5199/?view=results";
let pass = 0, fail = 0;
const t = (name, ok, detail = "") => {
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
};

const browser = await launch({ label: "df-results" });
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
await page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForSelector("#search-result-0", { state: "visible" });
await page.wait(400); // stagger-item 애니메이션 안정화

const calls = () => page.evaluate(() => window.__calls);
const reset = () => page.evaluate(() => { window.__calls = []; });
const setCfg = async (c) => {
  await page.evaluate((cfg) => window.__setResultsCfg(cfg), c);
  await page.wait(150);
};
const count = (arr, type) => arr.filter((c) => c.type === type).length;

const filename0 = '#search-result-0 [draggable="true"]';

// ─── 두 번 클릭 모드 (기본) ─────────────────────────────
// C1: 파일명 한 번 클릭 = 선택·미리보기만 (외부 열기 없음 — "훑어보다 파일 폭탄" 방지)
{
  await reset();
  await page.click(filename0);
  await page.wait(100);
  const c = await calls();
  t("C1 두번클릭모드: 파일명 한 번 클릭 → 열기 없음", count(c, "open") === 0, JSON.stringify(c));
  t("C1 두번클릭모드: 파일명 한 번 클릭 → 카드 선택 발생", count(c, "select") >= 1, JSON.stringify(c));
}

// C2: 파일명 두 번 클릭 = 외부 열기 정확히 1회
{
  await reset();
  await page.dblclick(filename0);
  await page.wait(100);
  const c = await calls();
  t("C2 두번클릭모드: 파일명 두 번 클릭 → 열기 1회", count(c, "open") === 1, JSON.stringify(c.filter((x) => x.type === "open")));
}

// C3: 스니펫(펼침 토글, role=button) 두 번 클릭 → 열기 없음 (토글 요소 제외 규칙)
{
  await reset();
  await page.dblclick('#search-result-0 [role="button"][aria-label*="미리보기"]');
  await page.wait(100);
  const c = await calls();
  t("C3 스니펫 두 번 클릭 → 열기 없음", count(c, "open") === 0, JSON.stringify(c.filter((x) => x.type === "open")));
}

// C4: 카드 빈 영역(하단 패딩) 두 번 클릭 → 래퍼 핸들러로 열기 1회 (탐색기 관례)
{
  await reset();
  const box = await page.boundingBox("#search-result-0");
  await page.mouseClick(box.x + 300, box.y + box.height - 5, { clickCount: 2 });
  await page.wait(100);
  const c = await calls();
  t("C4 카드 빈 영역 두 번 클릭 → 열기 1회", count(c, "open") === 1, JSON.stringify(c.filter((x) => x.type === "open")));
}

// C5: 액션 버튼(경로 복사) 클릭 → 복사만, 열기·선택 오발 없음
{
  await reset();
  await page.click('#search-result-0 [aria-label="파일 경로 복사"]');
  await page.wait(100);
  const c = await calls();
  t("C5 경로 복사 버튼 → 복사 1회·열기 없음", count(c, "copy") === 1 && count(c, "open") === 0, JSON.stringify(c));
}

// C6: 경로 세그먼트 클릭 → 해당 폴더 열기 (구분자·절대경로 접두 보존 — v3.2.8 수정 검증)
{
  await reset();
  await page.click(`#search-result-0 [title=${css("/Users/me/Documents/업무자료 열기")}]`);
  await page.wait(100);
  let c = await calls();
  t("C6 유닉스 중간 세그먼트 → 절대경로 폴더 열기", count(c, "folder") === 1 && c.find((x) => x.type === "folder")?.p === "/Users/me/Documents/업무자료", JSON.stringify(c));
  await reset();
  await page.click(`#search-result-1 [title=${css("C:\\문서 열기")}]`);
  await page.wait(100);
  c = await calls();
  t("C6 윈도우 중간 세그먼트 → 폴더 열기", count(c, "folder") === 1 && c.find((x) => x.type === "folder")?.p === "C:\\문서", JSON.stringify(c));
}

// ─── 저장 위치 표시 ─────────────────────────────────────
// P1: 기본(넓게) 보기 — 경로 브레드크럼 표시
{
  const text = await page.innerText("#search-result-0");
  t("P1 기본 보기: 경로 세그먼트 표시", text.includes("부서별지침"), "");
}

// P2: 컴팩트 보기 — 경로 줄 유지 + 꼬리 우선 축약 (말단 폴더가 보인다)
{
  await setCfg({ density: "compact" });
  const pathBtn = '#search-result-0 button[title*="클릭: 파일 위치 열기"]';
  const label = await page.innerText(pathBtn);
  t("P2 컴팩트: 경로 줄 존재", (await page.count(pathBtn)) === 1, `count=${await page.count(pathBtn)}`);
  t("P2 컴팩트: 말단 폴더 보임(꼬리 우선)", label.includes("최종확정본") && label.startsWith("…"), `label=${label}`);
  const winLabel = await page.innerText('#search-result-1 button[title*="클릭: 파일 위치 열기"]');
  t("P2 컴팩트: 윈도우 경로 말단 보임", winLabel.includes("분기보고"), `label=${winLabel}`);
}

// P3: 컴팩트 경로 클릭 → 파일 위치 열기 (reveal), 열기·선택 오발 없음
{
  await reset();
  await page.click('#search-result-0 button[title*="클릭: 파일 위치 열기"]');
  await page.wait(100);
  const c = await calls();
  t("P3 컴팩트 경로 클릭 → 위치 열기 1회", count(c, "folder") === 1 && count(c, "open") === 0, JSON.stringify(c));
}

// P4: 경로 표시 끔 → 경로 줄 사라짐
{
  await setCfg({ showResultPath: false });
  const text = await page.innerText("#search-result-0");
  const pathBtnCount = await page.count('#search-result-0 button[title*="클릭: 파일 위치 열기"]');
  t("P4 경로 표시 끔: 경로 줄 없음", !text.includes("최종확정본") && pathBtnCount === 0, `text=${text.slice(0, 60)}`);
  await setCfg({ showResultPath: true, density: "normal" });
}

// ─── 파일명 매치 섹션 ───────────────────────────────────
// 파일명 매치 행 — 글자로 찾아 표지(data-harness)를 붙인다. 다시 그려지면 표지가 사라지므로 쓰기 직전마다 붙인다
const filenameItem = '[data-harness="fname"]';
const markFilename = () => tagByText(page, 'div[role="button"]', "예산안.xlsx", "fname");
// 클릭 표적은 파일명 텍스트로 고정 — 브레드크럼 줄이 생겨 행 중심점이 세그먼트 버튼에 걸릴 수 있음
const filenameTitle = `${filenameItem} div.font-medium`;

// F1: 두 번 클릭 모드 — 한 번 클릭은 인앱 미리보기, 두 번 클릭은 외부 열기
{
  await reset();
  await markFilename();
  await page.click(filenameTitle);
  await page.wait(100);
  let c = await calls();
  t("F1 파일명 매치 한 번 클릭 → 미리보기·열기 없음", count(c, "preview") === 1 && count(c, "open") === 0, JSON.stringify(c));
  await reset();
  await markFilename();
  await page.dblclick(filenameTitle);
  await page.wait(100);
  c = await calls();
  t("F1 파일명 매치 두 번 클릭 → 열기 1회", count(c, "open") === 1, JSON.stringify(c.filter((x) => x.type === "open")));
}

// F2: 경로가 폴더 기준 브레드크럼으로 표시 (파일명 중복 제거)
{
  await markFilename();
  const text = await page.innerText(filenameItem);
  t("F2 파일명 매치: 폴더 경로 표시", text.includes("장기보관용자료함"), text.slice(0, 80));
}

// F4: 말단 폴더 세그먼트 클릭 → 파일 위치 열기(reveal) — 열기·미리보기 오발 없음
{
  await reset();
  await markFilename();
  await page.click(`${filenameItem} [title*=${css("파일 위치 열기 (탐색기에서 파일 선택)")}]`);
  await page.wait(100);
  const c = await calls();
  const ok = count(c, "folder") === 1
    && c.find((x) => x.type === "folder")?.p === "/Users/me/Downloads/장기보관용자료함/예산안.xlsx"
    && count(c, "open") === 0 && count(c, "preview") === 0;
  t("F4 파일명 매치 말단 세그먼트 → reveal(파일 선택)", ok, JSON.stringify(c));
}

// F5: 중간 세그먼트 클릭 → 해당 폴더 열기 (내용 매치 로직 이식 확인)
{
  await reset();
  await markFilename();
  await page.click(`${filenameItem} [title=${css("/Users/me/Downloads 열기")}]`);
  await page.wait(100);
  const c = await calls();
  t("F5 파일명 매치 중간 세그먼트 → 해당 폴더 열기", count(c, "folder") === 1 && c.find((x) => x.type === "folder")?.p === "/Users/me/Downloads" && count(c, "open") === 0, JSON.stringify(c));
}

// F3: 복사본 배지("N곳") 더블클릭 → 행 열기로 오발 없음 (내부 버튼 제외 규칙)
{
  await reset();
  await page.dblclick('button[aria-label^="복사본"]');
  await page.wait(150);
  const c = await calls();
  t("F3 복사본 배지 더블클릭 → 열기 없음", count(c, "open") === 0, JSON.stringify(c.filter((x) => x.type === "open")));
  await page.press("Escape"); // 팝오버 정리
  await page.clickAt(500, 850); // 바깥 클릭으로 확실히 닫기
  await reset();
}

// ─── 그룹 뷰 ────────────────────────────────────────────
{
  await setCfg({ viewMode: "grouped" });
  await page.waitForSelector("#grouped-search-result-0", { state: "visible" });
  const groupFilename = '#grouped-search-result-0 div[title*="두 번 클릭"]';

  await reset();
  await page.click(groupFilename);
  await page.wait(100);
  let c = await calls();
  t("G1 그룹 파일명 한 번 클릭 → 열기 없음·선택 발생", count(c, "open") === 0 && count(c, "select") >= 1, JSON.stringify(c));

  await reset();
  await page.dblclick(groupFilename);
  await page.wait(100);
  c = await calls();
  t("G1 그룹 파일명 두 번 클릭 → 열기 1회", count(c, "open") === 1, JSON.stringify(c.filter((x) => x.type === "open")));

  // G2: 청크 행(펼침 토글) 두 번 클릭 → 열기 없음 (role=button 제외 규칙)
  await reset();
  await page.dblclick('#grouped-search-result-0 [role="button"][title*="펼치기"]');
  await page.wait(100);
  c = await calls();
  t("G2 그룹 청크 행 두 번 클릭 → 열기 없음", count(c, "open") === 0, JSON.stringify(c.filter((x) => x.type === "open")));
  await setCfg({ viewMode: "flat" });
}

// ─── 한 번 클릭 모드 (구버전 동작 복원) ─────────────────
{
  await setCfg({ openOnSingleClick: true });
  await reset();
  await page.click(filename0);
  await page.wait(100);
  let c = await calls();
  t("S1 한번클릭모드: 파일명 한 번 클릭 → 즉시 열기", count(c, "open") === 1, JSON.stringify(c));
  t("S1 한번클릭모드: 카드 선택으로 버블 안 됨", count(c, "select") === 0, JSON.stringify(c));

  await reset();
  await markFilename();
  await page.click(filenameTitle);
  await page.wait(100);
  c = await calls();
  t("S2 한번클릭모드: 파일명 매치 한 번 클릭 → 즉시 열기", count(c, "open") === 1 && count(c, "preview") === 0, JSON.stringify(c));
}

await browser.close();
console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
process.exit(fail > 0 ? 1 : 0);
