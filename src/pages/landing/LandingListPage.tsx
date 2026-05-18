import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, query, orderBy, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Table, Button, Space, Typography, Card } from "antd"; 
import { Plus, Edit, Trash2, ExternalLink } from "lucide-react"; 

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

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    try {
      const replyCollectionRef = collection(db, name);
      const replySnapshot = await getDocs(replyCollectionRef);
      
      // 2. 일괄 삭제를 위한 묶음(Batch) 생성
      const batch = writeBatch(db);
      
      // 컬렉션 하위에 문서들이 존재할 경우에만 일괄 삭제 등록
      replySnapshot.forEach((document) => {
        batch.delete(document.ref);
      });

      // 3. 참여자 응답 데이터 일괄 삭제 실행
      await batch.commit();

      await deleteDoc(doc(db, "survey_list", id));

      alert("삭제되었습니다."); 
      fetchList();
    } catch (e) {
      alert("삭제 실패"); 
    }
  };

  const handleViewLanding = (recordName: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
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
      width: 220, 
      render: (_: any, record: any) => (
        <Space size="small">
          <Button 
            type="dashed"
            icon={<ExternalLink size={14} />} 
            onClick={() => handleViewLanding(record.name)}
          >
            보기
          </Button>
          
          <Button icon={<Edit size={14} />} onClick={() => onEdit(record.id)}>수정</Button>
          
          <Button danger icon={<Trash2 size={14} />} onClick={() => handleDelete(record.id, record.name)} />
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

        {/* 💡 pagination 속성을 추가하여 한 페이지에 30개씩 보이도록 제어합니다. */}
        <Table 
          dataSource={list} 
          columns={columns} 
          rowKey="id" 
          loading={loading} 
          pagination={{
            pageSize: 30, // 한 페이지에 노출할 데이터 수
            // showSizeChanger: true, // 사용자가 10, 20, 30, 50개씩 보기 변경 가능 옵션
            // pageSizeOptions: ["30", "100", "150", "500"], // 변경 가능한 선택지 구성
            // placement: ["bottomCenter"] // 페이지네이션 번호 위치를 하단 중앙으로 배치
          }}
        />
      </Card>
    </div>
  );
}