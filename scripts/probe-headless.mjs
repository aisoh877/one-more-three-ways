// Run only in an already-authorized test environment. No install, elevation, or profile reuse.
import {pathToFileURL} from 'node:url';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
const modulePath=process.env.PLAYWRIGHT_MODULE;
if(!modulePath)throw new Error('Set PLAYWRIGHT_MODULE to an existing playwright-core/index.mjs path.');
const {chromium}=await import(pathToFileURL(modulePath).href);
const playwrightVersion=JSON.parse(await readFile(resolve(dirname(modulePath),'package.json'),'utf8')).version;
const options={headless:true,chromiumSandbox:true,timeout:8000};
if(process.env.QA_CHROMIUM_EXECUTABLE)options.executablePath=process.env.QA_CHROMIUM_EXECUTABLE;
const result={measuredAt:new Date().toISOString(),playwrightVersion,runtime:process.version,headless:true,chromiumSandbox:true,profile:'new disposable profile; no existing profile',transport:'Playwright remote-debugging pipe',externalNavigation:false,pageCreated:false,screenshotCreated:false,permissionsChanged:false,lockScreenChanged:false};
let browser;
try{browser=await chromium.launch(options);const page=await browser.newPage();result.pageCreated=true;await page.setContent('<title>Local headless capability probe</title>');result.title=await page.title();result.browserVersion=browser.version();result.status='available';}
catch(error){const message=String(error);result.status='blocked';result.error=message.split('\n')[0];result.signal=message.match(/signal=(\w+)/)?.[1]??null;result.diagnostics=message.split('\n').filter(line=>/\[err\]|<process did exit:|exception while trying to kill/.test(line)).slice(0,15).map(line=>line.replace(/\u001b\[[0-9;]*m/g,''));process.exitCode=1;}
finally{await browser?.close();await writeFile('evidence/headless-probe.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
