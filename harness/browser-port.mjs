// browser-port 연결 파일 — 소비처가 한 번 복사해 두고 고치지 않는다. 원본을 실행 시점에 읽고, 브라우저는 원본 설정이 정한다.
// 원본 위치 = BROWSER_PORT_HOME → 설정 파일(BROWSER_PORT_CONFIG 또는 ~/.config/browser-port/config.json)의 home → PATH 의 browser-port 명령. 소비처에 경로·도구 이름을 적지 않는다.
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const fromConfig = () => { try { return JSON.parse(readFileSync(process.env.BROWSER_PORT_CONFIG || join(homedir(), '.config', 'browser-port', 'config.json'), 'utf8')).home || null; } catch { return null; } };
const fromPath = () => { const c = (process.env.PATH ?? '').split(delimiter).map((d) => d && join(d, 'browser-port')).find((p) => p && existsSync(p)); return c ? dirname(dirname(realpathSync(c))) : null; };
const HOME = process.env.BROWSER_PORT_HOME || fromConfig() || fromPath();
if (!HOME) throw new Error('browser-port 원본을 찾지 못했다 — 설정 파일의 home, PATH 의 browser-port 명령, BROWSER_PORT_HOME 중 하나로 위치를 알린다');
const ENTRY = join(HOME, 'src', 'index.mjs');
if (!existsSync(ENTRY)) throw new Error(`browser-port 원본을 찾지 못했다: ${ENTRY} — BROWSER_PORT_HOME 으로 위치를 지정한다`);
const port = await import(pathToFileURL(ENTRY).href);
export const { launch, VERSION, DRIVERS, DEFAULT_DRIVER, DRIVER_ENV, CONFIG_ENV, CONFIG_PATH, configuredDriver } = port;
export default port;
