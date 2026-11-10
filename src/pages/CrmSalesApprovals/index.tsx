import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { listCrmSalesPendingApprovals } from '@/services/crm';
export default function CrmSalesApprovals(){return <PageContainer title="销售订单审核"><ProTable rowKey="id" search={false} request={async()=>({data:await listCrmSalesPendingApprovals(),success:true})} columns={[{title:'申请编号',dataIndex:'applicationNo'},{title:'客户名称',dataIndex:'customerName'},{title:'销售人员',dataIndex:'salespersonName'},{title:'订单金额',dataIndex:'totalAmount',render:(_,r:any)=>`¥${Number(r.totalAmount).toFixed(2)}`},{title:'申请时间',dataIndex:'createdAt'},{title:'操作',valueType:'option',render:(_,r:any)=><a onClick={()=>history.push(`/crm/sales-orders/${r.id}`)}>审核详情</a>}]}/></PageContainer>}
