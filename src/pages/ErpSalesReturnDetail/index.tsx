import { getErpSalesReturn, decideErpSalesReturn, receiveErpSalesReturn } from '@/services/erp';
import { returnStatus } from '@/utils/salesStatus';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import { Button, Card, Descriptions, Input, message, Space, Tag } from 'antd';
import { useEffect, useState } from 'react';

export default function ErpSalesReturnDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const [data, setData] = useState<any>();
  const [opinion, setOpinion] = useState('');
  const load = () => getErpSalesReturn(Number(id)).then(setData).catch((error: any) => message.error(error?.message || '加载失败'));
  useEffect(() => { load(); }, [id]);
  const decide = async (approve: boolean) => {
    try { await decideErpSalesReturn(Number(id), approve, opinion); message.success(approve ? '已审核通过' : '已驳回'); load(); }
    catch (error: any) { message.error(error?.message || '操作失败'); }
  };
  const receive = async () => {
    try { await receiveErpSalesReturn(Number(id)); message.success('退货已收货并回补库存'); load(); }
    catch (error: any) { message.error(error?.message || '收货失败'); }
  };
  return (
    <PageContainer title="销售退货详情" onBack={() => history.push('/erp/sales-returns')}>
      {data && <>
        <Card>
          <Descriptions>
            <Descriptions.Item label="退货单号">{data.returnNo}</Descriptions.Item>
            <Descriptions.Item label="正式订单号">{data.orderNo}</Descriptions.Item>
            <Descriptions.Item label="客户名称">{data.customerName}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={returnStatus(data.status).color}>{returnStatus(data.status).text}</Tag></Descriptions.Item>
            <Descriptions.Item label="退货原因">{data.reason}</Descriptions.Item>
            <Descriptions.Item label="审核意见">{data.approvalOpinion || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>
        <ProTable rowKey="id" search={false} options={false} pagination={false} dataSource={data.lines} columns={[
          { title: '商品编号', dataIndex: 'productCode' },
          { title: '商品名称', dataIndex: 'productName' },
          { title: '退回仓库', dataIndex: 'warehouseName' },
          { title: '退货数量', dataIndex: 'quantity' },
          { title: '退货金额', dataIndex: 'amount' },
        ]} />
        <Card><Space>
          {data.status === 'PENDING_APPROVAL' && <><Input value={opinion} onChange={(event) => setOpinion(event.target.value)} placeholder="审核意见" style={{ width: 300 }} /><Button danger onClick={() => decide(false)}>驳回</Button><Button type="primary" onClick={() => decide(true)}>审核通过</Button></>}
          {data.status === 'APPROVED' && <Button type="primary" onClick={receive}>确认退货收货并入库</Button>}
        </Space></Card>
      </>}
    </PageContainer>
  );
}
