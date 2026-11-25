import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),url=process.env.MANUAL_APP_URL||'http://127.0.0.1:18080';
const raw='/private/tmp/xinhe-manual-session-v2';
const user={id:16,username:'demo_employee',name:'演示员工',companyId:1,companyName:'演示公司',roles:['COMPANY_ADMIN'],permissions:[]};
const days=[{date:'2026-11-16',dayType:'WORKDAY'},{date:'2026-11-17',dayType:'PERSONAL_HOLIDAY'},{date:'2026-11-18',dayType:'WORKDAY'},{date:'2026-11-19',dayType:'COMPANY_HOLIDAY'},{date:'2026-11-20',dayType:'WORKDAY'}];
const leave={id:10,applicantName:'演示员工',departmentName:'研发部',leaveType:'SICK',startDate:days[0].date,endDate:days[4].date,leaveDays:3,reason:'身体不适，申请休息。此为操作手册演示资料。',managerName:'演示主管',finalReviewerName:'演示管理员',status:'PENDING_FINAL',submittedAt:'2026-11-14T10:00:00',managerActedAt:'2026-11-14T11:00:00',managerComment:'初审同意',days,canReview:false,canWithdraw:true};
const ranges=[{startDate:'2028-01-01',endDate:'2028-06-30',startTime:'09:00',endTime:'18:00',flexibleMinutes:30},{startDate:'2028-07-01',endDate:'2028-12-31',startTime:'08:30',endTime:'17:30',flexibleMinutes:15}];
const rule={id:10,year:2028,status:'DRAFT',companyConfigured:true,draftRevision:1,version:1,requiredPersonalHolidayCount:52,companyHolidayDates:['2028-01-01','2028-01-02'],conflicts:[],timeRanges:ranges,timeExemptDates:[]};
const attendance=['NORMAL','LATE','EARLY','LATE_EARLY','ON_LEAVE','PERSONAL_HOLIDAY','COMPANY_HOLIDAY'].map((status,i)=>({id:i+1,userId:16,displayName:'演示员工',username:'demo_employee',orgName:'研发部',punchDate:`2026-11-${String(10+i).padStart(2,'0')}`,firstPunchTime:status==='ON_LEAVE'||status.endsWith('HOLIDAY')?null:`2026-11-${10+i}T${status==='NORMAL'?'09:30':status==='EARLY'?'09:00':'09:35'}:00`,lastPunchTime:status==='ON_LEAVE'||status.endsWith('HOLIDAY')?null:`2026-11-${10+i}T${status==='NORMAL'?'17:30':status==='LATE'?'18:00':'17:20'}:00`,punchCount:status==='ON_LEAVE'||status.endsWith('HOLIDAY')?0:2,status,leaveType:'SICK'}));
const expense={id:88,claimNo:'BX-202611180001',applicantName:'演示负责人',applicantOrgName:'研发部',totalAmount:128.5,status:'REVIEWING',currentNodeName:'最终审批',submittedAt:'2026-11-18 09:00:00',approvalRound:1,version:4,directFinalApproval:true,canWithdraw:true,canReview:false,items:[{id:501,expenseCategory:'TRANSPORT',expenseDate:'2026-11-17',expenseLocation:'杭州',amount:128.5,description:'出差交通费用（演示）'}],attachments:[],approvalNodes:[{id:701,approvalRound:1,sequenceNo:1,nodeType:'FINAL_APPROVER',reviewerName:'演示管理员',status:'PENDING'}]};
let browser;const manifest=[];
const B=(p,n)=>p.getByRole('button',{name:n,exact:true});const T=(p,n)=>p.getByText(n,{exact:true});
async function fixtures(page,opt={}){
 await page.route('**/api/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname;let data=[];
 if(p==='/api/auth/current')data=user;
 else if(p==='/api/auth/profile'){if(req.method()==='PUT')return route.fulfill({status:409,json:{code:409,message:'手机号已被其他账号使用'}});data={username:user.username,displayName:user.name,phone:'13800138000',email:'demo@example.com'};}
 else if(p==='/api/hr/onboarding/invitations')data=[{id:1,candidateName:'演示员工',departmentName:'研发部',positionName:'工程师',status:'SUBMITTED',profileId:20,profileStatus:'CREATED',accountStatus:'CREATED',submittedAt:'2026-11-14T10:00:00',expiresAt:'2026-11-20T23:59:59'}];
 else if(p==='/api/system/org-units/tree')data=[{id:1,name:'研发部',children:[]}];
 else if(p==='/api/system/users')data=[{id:16,username:user.username,displayName:user.name,phone:'138****8000',status:'ENABLED'}];
 else if(p==='/api/oa/attendance/rules/my-schedule')data={date:'2026-11-25',status:'WORKDAY',startTime:'09:00',endTime:'18:00',flexibleMinutes:30};
 else if(p==='/api/oa/attendance/my')data=attendance;
 else if(p==='/api/oa/attendance/records')data={data:attendance,total:attendance.length,page:1,pageSize:20};
 else if(p==='/api/oa/attendance/rules/2028')data={...rule,timeRanges:opt.gap?[{...ranges[0],endDate:'2028-06-29'},ranges[1]]:ranges};
 else if(p==='/api/oa/attendance/rules/2028/users')data=[{id:16,name:user.name,username:user.username,holidayCount:4,requiredPersonalHolidayCount:52,conflictCount:0}];
 else if(p==='/api/oa/attendance/rules/2028/users/16')data={year:2028,userId:16,companyConfigured:true,version:1,companyHolidayDates:rule.companyHolidayDates,personalHolidayDates:['2028-01-09','2028-01-16','2028-01-23','2028-01-30'],conflictDates:[],requiredPersonalHolidayCount:52};
 else if(p==='/api/oa/attendance/leave-requests')data=[{...leave,...opt.leave}];
 else if(p==='/api/oa/attendance/leave-requests/preview')data={days,conflictDates:[],managerName:leave.managerName,finalReviewerName:leave.finalReviewerName};
 else if(p==='/api/oa/attendance/leave-requests/10')data={...leave,...opt.leave};
 else if(p==='/api/oa/attendance/leave-requests/10/attachment'){return route.fulfill({contentType:opt.pdf?'application/pdf':'image/png',body:opt.pdf?await readFile(path.resolve(root,'../docs/testing/fixtures/CRM-TEST-附件样本.pdf')):await readFile(path.join(raw,'proof.png'))});}
 else if(p==='/api/oa/expenses/mine'||p==='/api/oa/expenses/pending')data=[expense];
 else if(p==='/api/oa/expenses/88')data={...expense,...opt.expense};
 else if(p==='/api/oa/expenses/approval-preview')data={departmentName:'研发部',nodes:expense.approvalNodes};
 return route.fulfill({json:{code:0,message:'success',data}});
 });
}
async function mark(locator,n){if(await locator.count()!==1)throw Error(`标注匹配数 ${await locator.count()}`);await locator.waitFor({state:'visible'});const box=await locator.boundingBox();const size=locator.page().viewportSize();if(!box||box.width<2||box.height<2||box.x<0||box.y<0||box.x+box.width>size.width+1||box.y+box.height>size.height+1)throw Error('标注目标越界 '+JSON.stringify(box));await locator.evaluate((el,n)=>{el.style.outline='3px solid #1677ff';el.style.outlineOffset='2px';const r=el.getBoundingClientRect();const tag=document.createElement('span');tag.textContent=n;Object.assign(tag.style,{position:'fixed',left:`${r.left+4}px`,top:`${r.top+4}px`,zIndex:2147483647,background:'#1677ff',color:'white',borderRadius:'50%',width:'22px',height:'22px',textAlign:'center',font:'bold 14px/22px sans-serif',pointerEvents:'none'});document.body.appendChild(tag)},n);}
async function shot(name,route,prepare,annotations,opt={}){
 const mobile=name.startsWith('mobile-'),viewport={width:mobile?390:1280,height:mobile?1000:1000};const context=await browser.newContext({viewport,deviceScaleFactor:1});const p=await context.newPage();if(opt.locationUnavailable)await p.addInitScript(()=>{Object.defineProperty(navigator.geolocation,'getCurrentPosition',{value:(_success,error)=>error({code:1,message:'手册演示，待选择位置'})})});await fixtures(p,opt);await p.goto(url+route,{waitUntil:'networkidle'});await p.addStyleTag({content:'*,*::before,*::after{transition-duration:0s!important;animation-duration:0s!important}'});await p.waitForTimeout(200);if(prepare)await prepare(p);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(700);
 if(mobile){const width=await p.evaluate(()=>document.documentElement.scrollWidth);if(width>390)throw Error(`移动页面横向溢出 ${width}`);}
 const notes=annotations.map(x=>x[0]);for(let i=0;i<annotations.length;i++)await mark(annotations[i][1](p),i+1);
 const source=path.join(raw,name+'.png');await p.screenshot({path:source,fullPage:mobile,animations:'disabled'});const buffer=await readFile(source);const imageHeight=buffer.readUInt32BE(20);const target=path.join(root,'docs/images',mobile?'mobile-v2':'dom-v2',name+'.png');const rail=await browser.newPage({viewport:{width:viewport.width+340,height:imageHeight}});await rail.setContent(`<style>*{box-sizing:border-box}body{margin:0;display:flex;font:17px/1.6 'PingFang SC',sans-serif;background:#f4f7fb;color:#172033}img{width:${viewport.width}px;height:${imageHeight}px}aside{padding:24px;width:340px}h2{font-size:21px}p{padding:14px;background:white;border:2px solid #1677ff;border-radius:10px;overflow-wrap:anywhere}small{display:block;color:#64748b}</style><img src="data:image/png;base64,${buffer.toString('base64')}"><aside><h2>操作说明</h2>${notes.map((t,i)=>`<p><b>${i+1}</b>　${t}</p>`).join('')}<small>当前系统真实页面<br>隔离接口演示数据<br>${mobile?'移动视口 390 CSS px':''}</small></aside>`);await rail.screenshot({path:target,fullPage:true});await rail.close();manifest.push({name,file:path.relative(root,target),viewport,captureSize:{width:viewport.width,height:imageHeight},notes,raw:source,fixture:'隔离接口演示数据，未修改业务记录'});console.log('captured',name);await context.close();
}
async function main(){for(const dir of [raw,'docs/images/dom-v2','docs/images/mobile-v2'])await mkdir(dir,{recursive:true});browser=await chromium.launch({headless:true,channel:'chrome'});
 const proof=await browser.newPage({viewport:{width:580,height:280}});await proof.setContent('<style>body{font:22px/2 sans-serif;padding:25px;color:#234}</style><h2>请假证明 · 演示附件</h2><p>仅用于操作手册，非真实医疗记录。</p>');await proof.screenshot({path:path.join(raw,'proof.png')});await proof.close();
 const tasks=[
 ['system-login','/login',null,[['用户名或手机号共用输入框',p=>p.getByPlaceholder('用户名或手机号')],['输入密码后登录',p=>p.getByPlaceholder('密码',{exact:true})]]],
 ['employee-list-delete','/system/employees',null,[['查看已提交人员的档案',p=>p.getByRole('button',{name:/查看档案/})],['从列表删除人员档案',p=>B(p,'删除档案')]]],
 ['employee-delete-confirm','/system/employees',async p=>B(p,'删除档案').click(),[['阅读关联账号和历史数据影响',p=>p.locator('.ant-modal-confirm-content')],['确认无误才删除；本图未执行删除',p=>p.getByRole('dialog').getByRole('button',{name:'删除档案',exact:true})]]],
 ['attendance-time-ranges','/oa/attendance-rules?year=2028',null,[['按日期范围配置上下班和弹性时间',p=>p.getByRole('group',{name:'考勤时间段 1'})],['保存后仍需发布年度规则',p=>B(p,'发布年度规则')]]],
 ['attendance-time-gap','/oa/attendance-rules?year=2028',null,[['缺口日期必须补齐后才能保存',p=>T(p,'还缺 1 天')],['查看具体未覆盖日期',p=>T(p,'2028-06-30')]] ,{gap:true}],
 ['rules-company','/oa/attendance-rules?year=2028&tab=company',null,[['考勤时间配置在公司放假之前',p=>p.getByRole('tab',{name:'1. 考勤时间',exact:true})],['公司假只配置日期',p=>B(p,'保存公司放假')]]],
 ['rules-personal','/oa/attendance-rules?year=2028&tab=personal&userId=16',null,[['先选择员工再设置个人假',p=>p.getByRole('combobox',{name:'选择员工'})],['核对剩余天数后保存',p=>B(p,'保存个人放假')]]],
 ['attendance-statuses','/oa/attendance',null,[['分别选择上班、下班打卡',p=>B(p,'上班打卡')],['异常只标记迟到或早退',p=>p.getByRole('table').getByText('迟到、早退',{exact:true})],['已批准请假显示具体假种',p=>p.getByRole('table').getByText('已请假—病假',{exact:true})]]],
 ['attendance-correction-create','/oa/attendance',async p=>{await B(p,'申请补打卡').click();await p.waitForTimeout(3500);await p.getByRole('dialog').locator('.ant-form-item').filter({hasText:'打卡类型'}).locator('.ant-select-selector').click()},[['补卡必须选择上班或下班类型',p=>p.locator('.ant-select-dropdown').filter({visible:true})],['填写补卡原因，提交前补齐时间和位置',p=>p.getByRole('dialog').getByLabel('申请原因',{exact:true})]],{locationUnavailable:true}],
 ['attendance-admin-entry','/oa/all-attendance',async p=>{await B(p,'录入打卡').click();await p.waitForTimeout(3500);await p.getByRole('dialog').locator('.ant-form-item').filter({hasText:'打卡类型'}).locator('.ant-select-selector').click()},[['指定要补录的员工',p=>p.getByRole('dialog').getByLabel('人员',{exact:true})],['补录必须选择上班或下班类型',p=>p.locator('.ant-select-dropdown').filter({visible:true})]],{locationUnavailable:true}],
 ['all-attendance','/oa/all-attendance',null,[['查看公司范围考勤状态',p=>p.getByRole('columnheader',{name:'状态',exact:true})],['个人假仍显示个人假',p=>p.getByRole('table').getByText('个人假',{exact:true})]]],
 ['oa-navigation','/oa/approval/leave-requests',null,[['员工从请假申请进入',p=>p.getByRole('menuitem',{name:'请假申请',exact:true})],['审批人统一从请假审批进入',p=>p.getByRole('menuitem',{name:'请假审批',exact:true})]]],
 ['leave-list','/oa/approval/leave-requests',null,[['从列表打开申请详情',p=>p.getByRole('table').getByRole('button',{name:'查看详情'})],['撤回在列表操作中',p=>p.getByRole('table').getByRole('button',{name:'撤回申请'})]]],
 ['leave-create','/oa/approval/leave-requests',async p=>B(p,'发起请假申请').click(),[['选择病假、调休假、事假或其他',p=>p.getByRole('dialog').getByLabel('假种')],['证明附件支持图片和PDF',p=>B(p,'选择附件')]]],
 ['leave-date-preview','/oa/approval/leave-requests?date=2026-11-16',async p=>{await p.getByPlaceholder('结束日期').fill('2026-11-20');await p.getByPlaceholder('结束日期').press('Enter');await T(p,'申请范围 5 天，实际请假 3 天').waitFor()},[['范围天数与实际请假天数分开显示',p=>T(p,'申请范围 5 天，实际请假 3 天')],['个人假不计入请假，绿色高亮',p=>p.getByRole('dialog').locator('li').filter({has:p.locator('time[datetime="2026-11-17"]')})]]],
 ['leave-detail-two-stage','/oa/approval/leave-requests',async p=>p.getByRole('table').getByRole('button',{name:'查看详情'}).click(),[['实际请假天数扣除休息日',p=>p.getByRole('dialog',{name:'请假申请详情'}).getByText('日期明细',{exact:true})],['查看具体审批人和当前节点',p=>T(p,'审核流转')]]],
 ['leave-detail-single','/oa/approval/leave-requests',async p=>p.getByRole('table').getByRole('button',{name:'查看详情'}).click(),[['已到公司顶层管理员，只需一个节点',p=>T(p,'审核流转')]],{leave:{finalReviewerName:null,status:'PENDING_MANAGER',managerName:'演示管理员',managerActedAt:null,managerComment:null}}],
 ['leave-review-list','/oa/approval/leave-review',null,[['所有请假审批使用同一个列表',p=>p.getByRole('columnheader',{name:'审批进度',exact:true})],['进入详情核对申请后再审批',p=>B(p,'查看详情')]]],
 ['leave-review-detail','/oa/approval/leave-review',async p=>B(p,'查看详情').click(),[['核对日期、附件和审批进度',p=>T(p,'审核流转')],['通过或驳回当前申请',p=>B(p,'通过审批')]],{leave:{canReview:true,canWithdraw:false}}],
 ['leave-image-preview','/oa/approval/leave-requests',async p=>{await p.getByRole('table').getByRole('button',{name:'查看详情'}).click();await B(p,'请假证明.png').click();await p.locator('.ant-modal-body img').waitFor()},[['图片在页面内预览',p=>p.locator('.ant-modal-body img')]],{leave:{attachmentName:'请假证明.png',attachmentContentType:'image/png'}}],
 ['leave-pdf-preview','/oa/approval/leave-requests',async p=>{await p.getByRole('table').getByRole('button',{name:'查看详情'}).click();await B(p,'请假证明.pdf').click()},[['PDF通过预览窗口打开',p=>p.locator('iframe[title="请假证明.pdf"]')]],{pdf:true,leave:{attachmentName:'请假证明.pdf',attachmentContentType:'application/pdf'}}],
 ['expense-single-stage','/oa/expense/88',null,[['申请人是负责人时向上查找审批人',p=>T(p,'审核流转')],['匹配终审人后，一个节点完成审批',p=>p.getByText(/最终审批：演示管理员/)]]],
 ['expense-withdraw-list','/oa/expense',null,[['单节点终审尚未处理时可撤回',p=>B(p,'撤回')],['查看当前审批状态',p=>p.getByRole('columnheader',{name:'状态',exact:true})]]],
 ['expense-route-preview','/oa/expense/88',async p=>p.getByRole('button',{name:/使用说明/}).click(),[['提交前查看负责人向上匹配说明',p=>p.getByText('报销由本部门负责人审批；申请人是负责人时向上级部门查找。匹配到的负责人具备最终审批资格时，一次审批完成，否则继续流转终审。',{exact:true})]],{expense:{status:'DRAFT',canWithdraw:false,approvalNodes:[],approvalPreview:{departmentName:'研发部',nodes:expense.approvalNodes}}}],
 ['mobile-leave-list','/oa/approval/leave-requests',null,[['移动端使用卡片列表',p=>T(p,'病假').filter({visible:true})],['从卡片操作中撤回',p=>B(p,'撤回申请').filter({visible:true})]]],
 ['mobile-leave-detail','/oa/approval/leave-requests',async p=>B(p,'查看详情').filter({visible:true}).click(),[['个人假、公司假绿色突出显示',p=>T(p,'日期明细')]]],
 ['mobile-rules-personal','/oa/attendance-rules?year=2028&tab=personal&userId=16',null,[['核对天数后保存个人放假',p=>B(p,'保存个人放假')]]],
 ['phone-duplicate','/dashboard',async p=>{await p.locator('.ant-pro-sider-actions-avatar').click();await p.getByRole('dialog').getByRole('button',{name:/保\s*存/,exact:true}).click();await T(p,'手机号已被其他账号使用').waitFor()},[['号码重复时保存失败',p=>T(p,'手机号已被其他账号使用')],['调整手机号后重新保存',p=>p.getByLabel('手机号',{exact:true})]]],
 ];
 const failures=[];for(const task of tasks){if(process.env.MANUAL_ONLY&&!process.env.MANUAL_ONLY.split(',').includes(task[0]))continue;try{await shot(...task)}catch(e){console.error('FAILED',task[0],e.message);failures.push({name:task[0],error:e.message})}}
 const previous=process.env.MANUAL_ONLY?JSON.parse(await readFile('docs/images/manual-session-v2-manifest.json','utf8')).screenshots:[];
 await writeFile('docs/images/manual-session-v2-manifest.json',JSON.stringify({source:'当前dist真实页面，Playwright隔离接口脱敏演示数据；所有API写操作被拦截，无正式业务数据变更',screenshots:[...previous.filter(item=>!(process.env.MANUAL_ONLY || '').split(',').includes(item.name)),...manifest],failures},null,2));await browser.close();if(failures.length)throw Error(`${failures.length}截图失败`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
