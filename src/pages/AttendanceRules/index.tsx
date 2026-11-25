import {
  getAttendanceRuleUser,
  getAttendanceRuleYear,
  listAttendanceRuleUsers,
  publishAttendanceRule,
  saveCompanyAttendanceHolidays,
  saveUserAttendanceHolidays,
} from '@/services/management';
import { PageContainer } from '@ant-design/pro-components';
import { history, useLocation } from '@umijs/max';
import { Alert, Button, Calendar, Card, DatePicker, Empty, message, Modal, Select, Space, Spin, Tabs, Tag, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './index.less';
import TimeRanges from './TimeRanges';

const statusText = { UNCONFIGURED: '未配置', DRAFT: '草稿待发布', PUBLISHED: '已发布' } as const;
const weekdays = [{label:'星期一',value:1},{label:'星期二',value:2},{label:'星期三',value:3},{label:'星期四',value:4},{label:'星期五',value:5},{label:'星期六',value:6},{label:'星期日',value:0}];
const monthOptions=Array.from({length:12},(_,month)=>({value:month,label:`${month+1}月`}));
const sorted = (values:Set<string>) => [...values].sort();

export default function AttendanceRules(){
  const location=useLocation(); const query=useMemo(()=>new URLSearchParams(location.search),[location.search]);
  const [year,setYear]=useState(Number(query.get('year'))||dayjs().year());
  const [tab,setTab]=useState(['personal','company'].includes(query.get('tab') || '') ? query.get('tab')! : 'time');
  const [rule,setRule]=useState<ManagementAPI.AttendanceRuleYear>(); const [users,setUsers]=useState<ManagementAPI.AttendanceRuleUser[]>([]);
  const [userId,setUserId]=useState<number|undefined>(query.get('userId')?Number(query.get('userId')):undefined);
  const [detail,setDetail]=useState<ManagementAPI.AttendanceRuleUserDetail>(); const [companyDates,setCompanyDates]=useState(new Set<string>()); const [personalDates,setPersonalDates]=useState(new Set<string>());
  const [batchMode,setBatchMode]=useState<'add'|'remove'>(); const [batchWeekdays,setBatchWeekdays]=useState<number[]>([]); const [loading,setLoading]=useState(false); const [saving,setSaving]=useState(false); const [panelDate,setPanelDate]=useState(dayjs());
  const loadRequestRef=useRef(0); const detailRequestRef=useRef(0);
  const editablePersonalCount=useMemo(()=>[...personalDates].filter(value=>dayjs(value).isAfter(dayjs(),'day')).length,[personalDates]);
  const load=useCallback(async()=>{const requestId=++loadRequestRef.current;setLoading(true);try{const [r,u]=await Promise.all([getAttendanceRuleYear(year),listAttendanceRuleUsers(year)]);if(requestId!==loadRequestRef.current)return;setRule(r.data);setCompanyDates(new Set(r.data.companyHolidayDates));setUsers(u.data);if(!userId&&u.data.length)setUserId(u.data[0].id);}finally{if(requestId===loadRequestRef.current)setLoading(false)}},[year,userId]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{const requestId=++detailRequestRef.current;setDetail(undefined);setPersonalDates(new Set());if(!userId)return;void getAttendanceRuleUser(year,userId).then(r=>{if(requestId!==detailRequestRef.current)return;setDetail(r.data);setPersonalDates(new Set(r.data.personalHolidayDates))});return()=>{if(detailRequestRef.current===requestId)detailRequestRef.current++}},[year,userId]);
  useEffect(()=>setPanelDate(dayjs(`${year}-01-01`)),[year]);
  const updateUrl=(nextTab:string,nextUser?:number)=>{const p=new URLSearchParams({year:String(year),tab:nextTab});if(nextUser)p.set('userId',String(nextUser));history.replace(`/oa/attendance-rules?${p}`)};
  const toggleCompany=(date:Dayjs)=>{if(date.year()!==year||!date.isAfter(dayjs(),'day'))return;const key=date.format('YYYY-MM-DD');setCompanyDates(prev=>{const next=new Set(prev);next.has(key)?next.delete(key):next.add(key);return next})};
  const togglePersonal=(date:Dayjs)=>{if(date.year()!==year||!date.isAfter(dayjs(),'day'))return;const key=date.format('YYYY-MM-DD');setPersonalDates(prev=>{const next=new Set(prev);next.has(key)?next.delete(key):next.add(key);return next})};
  const showConflicts=(conflicts:ManagementAPI.AttendanceRuleConflict[])=>Modal.warning({title:'公司放假与个人放假冲突',width:620,content:<div><Alert type="warning" showIcon message={`共 ${conflicts.length} 名员工需要调整，规则暂不能发布`} /><div className={styles.conflictList}>{conflicts.map(c=><div key={c.userId}><b>{c.userName}</b><span>{c.dates.join('、')}</span></div>)}</div></div>,okText:'去调整第一位员工',onOk:()=>{const id=conflicts[0].userId;setTab('personal');setUserId(id);updateUrl('personal',id)}});
  const saveCompany=async()=>{if(!rule)return;setSaving(true);try{const r=await saveCompanyAttendanceHolidays(year,sorted(companyDates),rule.version);setRule(r.data);setCompanyDates(new Set(r.data.companyHolidayDates));message.success('公司放假已保存为草稿');await load();if(r.data.conflicts.length)showConflicts(r.data.conflicts)}finally{setSaving(false)}};
  const savePersonal=async()=>{if(!rule||!userId)return;const required=detail?.requiredPersonalHolidayCount??rule.requiredPersonalHolidayCount;if(editablePersonalCount!==required){message.error(`剩余个人放假必须设置 ${required} 天，当前已选 ${editablePersonalCount} 天`);return}setSaving(true);try{const r=await saveUserAttendanceHolidays(year,userId,sorted(personalDates),rule.version);setDetail(r.data);message.success('个人放假已保存');await load()}finally{setSaving(false)}};
  const publish=async()=>{if(!rule)return;if(rule.conflicts.length){showConflicts(rule.conflicts);return}setSaving(true);try{const r=await publishAttendanceRule(year,rule.version);setRule(r.data);message.success(`${year} 年考勤规则已发布`)}finally{setSaving(false)}};
  const openBatch=(mode:'add'|'remove')=>{setBatchMode(mode);setBatchWeekdays([])};
  const applyBatch=()=>{if(!batchMode)return;if(!batchWeekdays.length){message.warning('请至少选择一个星期');return}const start=dayjs(`${year}-01-01`);const end=dayjs(`${year}-12-31`);const today=dayjs();setPersonalDates(prev=>{const next=new Set(prev);for(let d=start;!d.isAfter(end,'day');d=d.add(1,'day'))if(d.isAfter(today,'day')&&batchWeekdays.includes(d.day())){const k=d.format('YYYY-MM-DD');if(batchMode==='remove')next.delete(k);else next.add(k)}return next});setBatchMode(undefined);setBatchWeekdays([])};
  const cell=(date:Dayjs,mode:'company'|'personal')=>{const k=date.format('YYYY-MM-DD');const company=companyDates.has(k);const personal=mode==='personal'&&personalDates.has(k);const conflict=mode==='personal'&&company&&personal;const holiday=mode==='company'?company:company||personal;const frozen=!date.isAfter(dayjs(),'day')&&!holiday;const outside=date.month()!==panelDate.month();return <div data-date={k} title={frozen?'已冻结，不可修改':undefined} aria-disabled={frozen} className={`${styles.cell} ${outside?styles.outside:''} ${frozen?styles.frozen:''} ${company?styles.company:''} ${personal?styles.personal:''} ${conflict?styles.conflict:''}`}><span className={styles.dayNumber}>{date.date()}</span>{conflict?<small>冲突</small>:company?<small>公司假</small>:personal?<small>个人假</small>:frozen?<small>已冻结</small>:null}</div>};
  const calendarHeader=({value}:{value:Dayjs})=><div className={styles.calendarHeader}><Button disabled={value.month()===0} onClick={()=>setPanelDate(value.subtract(1,'month'))}>上个月</Button><Space size={8}><Typography.Text strong>{value.year()}年</Typography.Text><Select aria-label="快速切换月份" value={value.month()} options={monthOptions} onChange={month=>setPanelDate(value.month(month))} className={styles.monthSelect}/></Space><Button disabled={value.month()===11} onClick={()=>setPanelDate(value.add(1,'month'))}>下个月</Button></div>;
  return <PageContainer title="考勤规则" subTitle="按年度设置考勤时间及放假日期">
    <Spin spinning={loading}>
      <Card className={styles.toolbar}>
        <Space wrap>
          <DatePicker picker="year" allowClear={false} value={dayjs(`${year}-01-01`)} onChange={v=>v&&setYear(v.year())}/>
          <Tag color={rule?.status==='PUBLISHED'?'green':rule?.status==='DRAFT'?'gold':'default'}>{rule?statusText[rule.status]:'加载中'}</Tag>
          {rule?.publishedRevision&&rule.status==='DRAFT'?<Typography.Text type="secondary">已发布版本仍在生效，当前修改尚未发布</Typography.Text>:null}
          <Button type="primary" disabled={!rule?.companyConfigured} loading={saving} onClick={publish}>发布年度规则</Button>
        </Space>
      </Card>
      <Tabs activeKey={tab} onChange={k=>{setTab(k);updateUrl(k,userId)}} items={[
        {key:'time',label:'1. 考勤时间',children:<TimeRanges year={year} rule={rule} onSaved={next=>{setRule(next);void load()}}/>},
        {key:'company',label:'2. 公司放假',children:<Card title="选择全公司放假日期" extra={<Button type="primary" loading={saving} onClick={saveCompany}>保存公司放假</Button>}>
          <Alert showIcon type="info" message="今天及过去日期已冻结；无假期的冻结日期会置灰，公司假仍保留高亮。只能调整明天及未来日期。"/>
          <Calendar value={panelDate} headerRender={calendarHeader} onChange={setPanelDate} onSelect={(d,info)=>info.source==='date'&&toggleCompany(d)} disabledDate={d=>d.year()!==year||!d.isAfter(dayjs(),'day')} fullCellRender={d=>cell(d,'company')}/>
        </Card>},
        {key:'personal',label:'3. 员工个人放假',disabled:!rule?.companyConfigured,children:<Card className={styles.personalCard} title="设置员工个人放假" extra={<Space wrap className={styles.personalCardExtra}>
          <Tag color={editablePersonalCount===(detail?.requiredPersonalHolidayCount??rule?.requiredPersonalHolidayCount)?'success':editablePersonalCount>(detail?.requiredPersonalHolidayCount??rule?.requiredPersonalHolidayCount??0)?'error':'processing'}>未来已选 {editablePersonalCount} / 剩余应选 {detail?.requiredPersonalHolidayCount??rule?.requiredPersonalHolidayCount??'-'} 天</Tag>
          <Button type="primary" loading={saving} disabled={!userId} onClick={savePersonal}>保存个人放假</Button>
        </Space>}>
          <Alert className={styles.personalHint} showIcon type="info" message="过去时间按每满 7 天已休 1 天自动折算，不要求补录；当前只需配置剩余天数。"/>
          <Space wrap className={styles.personalTools}>
            <Select aria-label="选择员工" showSearch optionFilterProp="label" value={userId} onChange={id=>{setUserId(id);updateUrl('personal',id)}} options={users.map(u=>({value:u.id,label:`${u.name}（${u.username}） · 未来${u.holidayCount}/${u.requiredPersonalHolidayCount??rule?.requiredPersonalHolidayCount??'-'}天${u.conflictCount?` · ${u.conflictCount}项冲突`:''}`}))} style={{minWidth:260}}/>
            <Typography.Text type="secondary">批量操作只修改未来日期；冻结日期保持不变</Typography.Text>
            <div className={styles.batchActions}>
              <Button onClick={()=>openBatch('add')}>批量添加</Button>
              <Button danger onClick={()=>openBatch('remove')}>批量取消</Button>
            </div>
          </Space>
          {detail?.conflictDates.length?<Alert showIcon type="error" message={`当前员工有 ${detail.conflictDates.length} 个冲突日期，请在红色日期上点击取消后保存`} />:null}
          {userId?<Calendar value={panelDate} headerRender={calendarHeader} onChange={setPanelDate} onSelect={(d,info)=>info.source==='date'&&togglePersonal(d)} disabledDate={d=>d.year()!==year||!d.isAfter(dayjs(),'day')} fullCellRender={d=>cell(d,'personal')}/>:<Empty description="请选择员工"/>}
        </Card>}
      ]}/>
    </Spin>
    <Modal className={styles.batchModal} width={480} open={Boolean(batchMode)} title={batchMode==='remove'?'批量取消个人假':'批量添加个人假'} okText={batchMode==='remove'?'确认取消':'确认添加'} cancelText="返回" okButtonProps={{danger:batchMode==='remove'}} onCancel={()=>{setBatchMode(undefined);setBatchWeekdays([])}} onOk={applyBatch}>
      <Typography.Paragraph type="secondary">选择一个或多个星期，系统会将操作应用到本年度所有未来的对应日期。</Typography.Paragraph>
      <Select aria-label="选择批量星期" mode="multiple" allowClear placeholder="请选择星期（可多选）" value={batchWeekdays} onChange={setBatchWeekdays} options={weekdays} style={{width:'100%'}}/>
    </Modal>
  </PageContainer>
}
