import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Tag } from 'antd';
import { listErpOrders } from '@/services/erp';

const labels:Record<string,string>={WAITING_DISPATCH:'待出库发货',DISPATCHED:'已出库发货',SIGNED:'已签收',COMPLETED:'已完成',RETURNING:'退货处理中',RETURNED:'已退货',CLOSED:'已关闭'};
export default function ErpOrders(){return <PageContainer title="ERP销售订单" content="仅展示CRM审核通过后自动同步的正式订单。"><ProTable rowKey="id" request={async(params)=>({data:await listErpOrders(params),success:true})} columns={[
  {title:'正式订单号',dataIndex:'orderNo'},
  {title:'客户名称',dataIndex:'customerName'},
  {title:'销售人员',dataIndex:'salespersonName',search:false},
  {title:'履约状态',dataIndex:'status',valueType:'select',fieldProps:{options:Object.entries(labels).map(([value,label])=>({value,label}))},render:(_,r:any)=><Tag>{labels[r.fulfillmentStatus]||'未知状态'}</Tag>},
  {title:'订单金额',dataIndex:'totalAmount',search:false,render:(_,r:any)=>`¥${Number(r.totalAmount).toFixed(2)}`},
  {title:'同步时间',dataIndex:'createdAt',search:false},
  {title:'操作',valueType:'option',render:(_,r:any)=><a onClick={()=>history.push(`/erp/orders/${r.id}`)}>详情</a>},
]}/></PageContainer>}
