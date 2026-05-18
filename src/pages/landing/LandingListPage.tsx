import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Table, Button, Space, Typography, Card } from "antd"; 
import { Plus, Edit, Trash2, ExternalLink } from "lucide-react"; // 💡 ExternalLink 아이콘 추가

const { Title } = Typography;

export default function LandingListPage({ onEdit, onAdd }: { onEdit: (id: string) => void; onAdd: () => void }) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDelete = async (id: string) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "survey_list", id));
      alert("삭제되었습니다."); 
      fetchList();
    } catch (e) {
      alert("삭제 실패"); 
    }
  };

  // 💡 상세 랜딩페이지로 이동하는 핸들러 (새 탭 열기)
  const handleViewLanding = (recordName: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    
    // ↙ recordId 대신 실제 영문/숫자 name 항목이 주소에 들어가도록 수정
    const landingUrl = `${baseUrl}#/landing/${recordName}`;
    
    window.open(landingUrl, "_blank"); 
  };

  const columns = [
    { title: "설문지명", dataIndex: "name", key: "name" },
    { title: "생성일시", dataIndex: "created_at", key: "created_at", render: (val: any) => val?.toDate()?.toLocaleString() || "-" },
    { title: "수정일시", dataIndex: "updated_at", key: "updated_at", render: (val: any) => val?.toDate()?.toLocaleString() || "-" },
    {
      title: "관리",
      key: "action",
      width: 220, // 💡 버튼이 추가됨에 따라 컬럼 너비를 조금 늘렸습니다.
      render: (_: any, record: any) => (
        <Space size="small">
          {/* 💡 새 탭 보기 버튼 추가 */}
          <Button 
            type="dashed"
            icon={<ExternalLink size={14} />} 
            onClick={() => handleViewLanding(record.name)}
          >
            보기
          </Button>
          
          <Button icon={<Edit size={14} />} onClick={() => onEdit(record.id)}>수정</Button>
          
          <Button danger icon={<Trash2 size={14} />} onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}>
      <Card variant="borderless" className="shadow-sm">
        <Space style={{ justifyContent: "space-between", width: "100%", marginBottom: 20 }}>
          <Title level={3} style={{ margin: 0 }}>랜딩 페이지 템플릿 관리</Title>
          <Button type="primary" icon={<Plus size={14} />} onClick={onAdd} style={{ backgroundColor: '#27ae60', borderColor: '#27ae60' }}>
            새 랜딩페이지 추가
          </Button>
        </Space>
        <Table dataSource={list} columns={columns} rowKey="id" loading={loading} />
      </Card>
    </div>
  );
}