// browser-port 연결 파일 — 소비처가 한 번 복사해 두고 고치지 않는다. 원본을 실행 시점에 읽고, 브라우저는 원본 설정이 정한다.
// 원본 위치 = 환경변수 BROWSER_PORT_HOME → PATH 의 browser-port 명령(실제 파일 <원본>/bin/browser-port). 소비처에 경로·도구 이름을 적지 않는다.
import { existsSync, realpathSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const COMMAND = 'browser-port';
const fromPath = () => (process.env.PATH ?? '').split(delimiter).map((d) => d && join(d, COMMAND)).find((c) => c && existsSync(c));
const cmd = process.env.BROWSER_PORT_HOME ? null : fromPath();
if (!process.env.BROWSER_PORT_HOME && !cmd) throw new Error(`browser-port 원본을 찾지 못했다 — PATH 에 ${COMMAND} 명령이 없다(원본의 bin/${COMMAND} 를 PATH 에 걸거나 BROWSER_PORT_HOME 으로 지정)`);
const ENTRY = join(process.env.BROWSER_PORT_HOME || dirname(dirname(realpathSync(cmd))), 'src', 'index.mjs');
if (!existsSync(ENTRY)) throw new Error(`browser-port 원본을 찾지 못했다: ${ENTRY} — BROWSER_PORT_HOME 으로 위치를 지정한다`);
const port = await import(pathToFileURL(ENTRY).href);
// 원본의 내보내기를 빠짐없이 같은 이름으로(tests/config.test.mjs 가 대조)
export const { launch, VERSION, DRIVERS, DEFAULT_DRIVER, DRIVER_ENV, CONFIG_ENV, CONFIG_PATH, configuredDriver } = port;
export default port;
