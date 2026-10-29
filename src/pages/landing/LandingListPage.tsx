import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, deleteDoc, doc, query, orderBy, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Table, Button, Space, Typography, Card, Tag } from "antd"; 
import { Plus, Trash2, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"; 

const { Title, Text } = Typography;

const PAGE_SIZE = 10;

export default function LandingListPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchList = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "survey_list"), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      setList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      alert("목록을 불러오지 못했습니다."); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
      const replyCollectionRef = collection(db, name);
      const replySnapshot = await getDocs(replyCollectionRef);
      
      const batch = writeBatch(db);
      replySnapshot.forEach((document) => {
        batch.delete(document.ref);
      });
      await batch.commit();

      await deleteDoc(doc(db, "survey_list", id));

      alert("삭제되었습니다."); 
      setCurrentPage(1);
      fetchList();
    } catch (e) {
      alert("삭제 실패"); 
    }
  };

  const handleViewLanding = (recordId: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const landingUrl = `${baseUrl}#/landing/view/${recordId}`;
    window.open(landingUrl, "_blank"); 
  };

  const columns = [
    {
      title: (
        <span>
          설문지명
          <br />
          <span style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 'normal' }}>설문지 상태</span>
        </span>
      ),
      dataIndex: "name",
      key: "name",
      width: 260,
      render: (val: string, record: any) => (
        <Space direction="vertical" size={4}>
          <span>{val}</span>
          {record.status === "closed"
            ? <Tag color="default" style={{ margin: 0 }}>모집완료</Tag>
            : <Tag color="green" style={{ margin: 0 }}>모집중</Tag>}
        </Space>
      ),
    },
    {
      title: "페이지 타입",
      dataIndex: "page_type",
      key: "page_type",
      width: 120,
      render: (val: string) =>
        val === "selective"
          ? <Tag color="red">선택형</Tag>
          : <Tag color="blue">일반형</Tag>,
    },
    {
      title: (
        <span>
          생성일시
          <br />
          수정일시
        </span>
      ),
      key: "dates",
      width: 260,
      render: (_: any, record: any) => (
        <Space direction="vertical" size={2} style={{ whiteSpace: 'nowrap' }}>
          <span>
            생성 : {record.created_at?.toDate()?.toLocaleString() || "-"}
          </span>
          <span>
            수정 : {record.updated_at?.toDate()?.toLocaleString() || "-"}
          </span>
        </Space>
      ),
    },
    {
      title: "관리",
      key: "action",
      width: 180, 
      render: (_: any, record: any) => (
        <Space size="small">
          <Button 
            type="primary"
            icon={<ExternalLink size={14} />} 
            style={{ backgroundColor: '#5b8def', borderColor: '#5b8def' }}
            onClick={(e) => { e.stopPropagation(); handleViewLanding(record.id); }}
          >
            랜딩 이동
          </Button>
          
          <Button danger icon={<Trash2 size={14} />} onClick={(e) => { e.stopPropagation(); handleDelete(record.id, record.name); }}>삭제</Button>
        </Space>
      ),
    },
  ];

  const totalPages = Math.ceil(list.length / PAGE_SIZE) || 1;
  const pagedList = list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}>
      <Card variant="borderless" className="shadow-sm">
        <Space style={{ justifyContent: "space-between", width: "100%", marginBottom: 20 }}>
          <Title level={3} style={{ margin: 0 }}>랜딩 관리</Title>
          <Button type="primary" icon={<Plus size={14} />} onClick={() => navigate("/landing/store")} style={{ backgroundColor: '#27ae60', borderColor: '#27ae60' }}>
            새 랜딩 페이지 등록
          </Button>
        </Space>

        <Table 
          dataSource={pagedList} 
          columns={columns} 
          rowKey="id" 
          loading={loading} 
          onRow={(record) => ({
            onClick: () => navigate(`/landing/store/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          pagination={false}
        />

        {/* 페이지네이션 (설문 리스트와 통일) */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20, marginTop: 24 }}>
          <Button icon={<ChevronLeft size={16} />} disabled={currentPage === 1 || loading}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
            이전
          </Button>
          <Text strong>{currentPage} / {totalPages}</Text>
          <Button disabled={currentPage >= totalPages || loading}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
            다음 <ChevronRight size={16} style={{ marginLeft: 4 }} />
          </Button>
        </div>
      </Card>
    </div>
  );
}