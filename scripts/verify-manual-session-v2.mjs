import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const chapters=['系统简介.md','登录与账号基础操作.md','系统管理.md','OA协同办公.md','系统使用操作手册大纲.md'];
const root=process.cwd(), failures=[],references=new Set();
for(const file of chapters){
 const text=await readFile(file,'utf8');
 if((text.match(/^# /gm)||[]).length!==1)failures.push(`${file}: 一级标题数量错误`);
 const headings=[...text.matchAll(/^#{2,3} (\d+(?:\.\d+)+) /gm)].map(x=>x[1]);
 if(new Set(headings).size!==headings.length)failures.push(`${file}: 章节编号重复`);
 for(const [,target] of text.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)){
  if(/^https?:/.test(target))continue;
  const p=path.resolve(path.dirname(file),target);references.add(p);
  try{await stat(p)}catch{failures.push(`${file}: 图片不存在 ${target}`)}
 }
}
const manifest=JSON.parse(await readFile('docs/images/manual-session-v2-manifest.json','utf8'));
if(manifest.failures.length)failures.push('截图任务存在失败项');
if(manifest.screenshots.length!==28)failures.push(`应为28张截图，实际${manifest.screenshots.length}`);
for(const shot of manifest.screenshots){
 const bytes=await readFile(shot.file);
 if(bytes.toString('hex',0,8)!=='89504e470d0a1a0a')failures.push(`${shot.file}: 非PNG`);
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(width!==shot.viewport.width+340||height!==shot.captureSize.height||shot.captureSize.width!==shot.viewport.width)failures.push(`${shot.file}: 成品尺寸与真实原图及说明栏不一致`);
 if(shot.name.startsWith('mobile-')&&shot.viewport.width!==390)failures.push(`${shot.file}: 移动视口不是390px`);
 if(!references.has(path.resolve(shot.file)))failures.push(`${shot.file}: 无正文引用`);
}
for(const name of ['oa-daily-use-overview','oa-attendance-rule-flow','oa-attendance-settlement-flow','oa-attendance-correction-flow','oa-expense-approval-flow','oa-leave-approval-flow','oa-leave-day-count','system-employee-delete-flow','oa-approver-hierarchy']){
 const file=`docs/images/diagrams-v2/${name}.png`;const bytes=await readFile(file);
 if(bytes.readUInt32BE(16)!==1672||bytes.readUInt32BE(20)!==941)failures.push(`${file}: 流程图尺寸异常`);
 if(!references.has(path.resolve(file)))failures.push(`${file}: 无正文引用`);
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1}else console.log(`通过：${chapters.length}份手册、${references.size}个唯一图片引用、28张截图和9张流程图；移动视口390px。`);
