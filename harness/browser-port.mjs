// browser-port 연결 파일 — 이 맥에서 도는 소비처(시험·측정 도구)가 한 번 복사해 두고 다시 고치지 않는다.
// 하는 일은 원본 위치를 찾아 실행 시점에 읽는 것뿐이다. 원본(dev/A_/A_BrowserPort)을 고치면 모든 소비처에 바로 반영되고,
// 어떤 브라우저를 쓸지는 원본의 설정(~/.config/browser-port/config.json 또는 BROWSER_PORT_DRIVER)이 정한다.
// 원본 위치: 환경변수 BROWSER_PORT_HOME → 기본 ~/Desktop/Claude Code/dev/A_/A_BrowserPort (worktree 안에서도 같은 원본을 본다).
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const HOME = process.env.BROWSER_PORT_HOME || join(homedir(), 'Desktop', 'Claude Code', 'dev', 'A_', 'A_BrowserPort');
const ENTRY = join(HOME, 'src', 'index.mjs');
if (!existsSync(ENTRY)) throw new Error(`browser-port 원본을 찾지 못했다: ${ENTRY} — BROWSER_PORT_HOME 으로 위치를 지정한다`);

const port = await import(pathToFileURL(ENTRY).href);
// 원본의 내보내기를 빠짐없이 같은 이름으로 다시 내보낸다(타입 browser-port.d.mts 와 같아야 한다 — tests/config.test.mjs 가 대조).
export const { launch, VERSION, DRIVERS, DEFAULT_DRIVER, DRIVER_ENV, CONFIG_ENV, CONFIG_PATH, configuredDriver } = port;
export default port;
