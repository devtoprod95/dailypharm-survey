import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom"; 
import { db } from "../lib/firebase";
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  endBefore,
  startAt, // 추가
  limitToLast,
  where,
  getCountFromServer
} from "firebase/firestore";
import { Table, Button, Space, Typography, Card, App, ConfigProvider, Input, Select } from "antd";
import { Download, RefreshCw, Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;
const { Option } = Select;

interface SurveyData {
  id: string;
  name: string;
  phone: string;
  pharmacy: string;
  created_at: any;
}

function ExcelPageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { message: msg, modal } = App.useApp();
  
  const [data, setData] = useState<SurveyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [searchType, setSearchType] = useState<string>(searchParams.get("type") || "name");
  const [searchText, setSearchText] = useState<string>(searchParams.get("text") || "");
  
  const currentPage = Number(searchParams.get("page")) || 1;
  const firstId = searchParams.get("firstId");
  const lastId = searchParams.get("lastId");

  const PAGE_SIZE = 10;

  const fetchTotalCount = async (type: string, text: string) => {
    try {
      const coll = collection(db, "survey");
      let q = query(coll);
      if (text.trim() !== "") {
        q = query(coll, where(type, "==", text.trim()));
      }
      const snapshot = await getCountFromServer(q);
      setTotal(snapshot.data().count);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData = useCallback(async (direction: 'first' | 'next' | 'prev' | 'stay', type: string, text: string) => {
    setLoading(true);
    try {
      const collRef = collection(db, "survey");
      let queryConstraints: any[] = [];

      if (text.trim() !== "") {
        queryConstraints.push(where(type, "==", text.trim()));
        queryConstraints.push(orderBy(type));
      } else {
        queryConstraints.push(orderBy("created_at", "desc"));
      }

      let q;
      // [수정] stay: 새로고침 시 현재 ID 좌표부터 데이터를 가져옴
      if (direction === 'stay' && firstId) {
        const cursorDoc = await getDoc(doc(db, "survey", firstId));
        q = query(collRef, ...queryConstraints, startAt(cursorDoc), limit(PAGE_SIZE));
      } 
      else if (direction === 'next' && lastId) {
        const cursorDoc = await getDoc(doc(db, "survey", lastId));
        q = query(collRef, ...queryConstraints, startAfter(cursorDoc), limit(PAGE_SIZE));
      } 
      else if (direction === 'prev' && firstId) {
        const cursorDoc = await getDoc(doc(db, "survey", firstId));
        q = query(collRef, ...queryConstraints, endBefore(cursorDoc), limitToLast(PAGE_SIZE));
      } 
      else {
        q = query(collRef, ...queryConstraints, limit(PAGE_SIZE));
      }

      const querySnapshot = await getDocs(q);
      const rows = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...(doc.data() as object) 
      })) as SurveyData[];

      if (rows.length > 0) {
        setData(rows);
        const newFirstId = querySnapshot.docs[0].id;
        const newLastId = querySnapshot.docs[querySnapshot.docs.length - 1].id;
        
        // 방향에 따른 페이지 계산
        let nextPage = currentPage;
        if (direction === 'first') nextPage = 1;
        else if (direction === 'next') nextPage = currentPage + 1;
        else if (direction === 'prev') nextPage = currentPage - 1;

        setSearchParams({
          page: String(nextPage),
          firstId: newFirstId,
          lastId: newLastId,
          type: type,
          text: text
        });
      }
    } catch (error: any) {
      console.error("Firebase Error:", error);
      msg.error("데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [firstId, lastId, currentPage, setSearchParams, msg]);

  // [수정] 검색 파라미터가 바뀔 때만 실행되도록 하되, 새로고침 시 'stay' 모드 발동
  useEffect(() => {
    const qText = searchParams.get("text") || "";
    const qType = searchParams.get("type") || "name";
    
    setSearchText(qText);
    setSearchType(qType);
    fetchTotalCount(qType, qText);

    // 만약 1페이지가 아니고 좌표(ID)가 있다면 그 지점부터 가져오기(stay)
    if (currentPage > 1 && firstId) {
      fetchData('stay', qType, qText);
    } else {
      fetchData('first', qType, qText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("text"), searchParams.get("type")]); 

  const handleSearch = () => {
    setSearchParams({
      page: "1",
      type: searchType,
      text: searchText
    });
  };

  const handleRefresh = () => {
    setSearchText("");
    setSearchType("name");
    setSearchParams({});
  };

  const executeDownload = async () => {
    setLoading(true);
    try {
      const collRef = collection(db, "survey");
      let queryConstraints: any[] = [];
      const qText = searchParams.get("text") || "";
      const qType = searchParams.get("type") || "name";

      if (qText.trim() !== "") {
        queryConstraints.push(where(qType, "==", qText.trim()));
        queryConstraints.push(orderBy(qType));
      } else {
        queryConstraints.push(orderBy("created_at", "desc"));
      }
      const q = query(collRef, ...queryConstraints);
      const querySnapshot = await getDocs(q);
      const allData = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) })) as SurveyData[];
      
      const headers = ["No", "신청시간", "성함", "연락처", "약국명"];
      const rows = allData.map((item, index) => [
        allData.length - index,
        item.created_at?.toDate()?.toLocaleString() || "미정",
        item.name,
        item.phone,
        item.pharmacy
      ]);
      const csvContent = "\ufeff" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `상담신청_내역_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      msg.success("다운로드 완료");
    } catch (err) {
      msg.error("다운로드 실패");
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<SurveyData> = [
    { 
      title: "No.", 
      key: "no", 
      width: 80, 
      align: "center", 
      render: (_, __, index) => total - ((currentPage - 1) * PAGE_SIZE) - index 
    },
    { title: "신청시간", dataIndex: "created_at", key: "created_at", render: (val) => val?.toDate()?.toLocaleString() || "미정" },
    { title: "성함", dataIndex: "name", key: "name", render: (text) => <Text strong>{text}</Text> },
    { title: "연락처", dataIndex: "phone", key: "phone" },
    { title: "약국명", dataIndex: "pharmacy", key: "pharmacy" },
  ];

  return (
    <div style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}>
      <Card variant="borderless" className="shadow-sm">
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <Space style={{ justifyContent: "space-between", width: "100%" }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>상담 신청 관리</Title>
              <Text type="secondary">Total <Text strong>{total}</Text> records</Text>
            </div>
            <Space>
              <Button icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />} onClick={handleRefresh}>
                새로고침
              </Button>
              <Button 
                type="primary" 
                icon={<Download size={14} />} 
                style={{ backgroundColor: '#27ae60', borderColor: '#27ae60' }}
                onClick={() => modal.confirm({
                  title: '데이터 다운로드',
                  content: '내역을 CSV로 받으시겠습니까?',
                  onOk: executeDownload
                })}
              >
                엑셀 다운로드
              </Button>
            </Space>
          </Space>

          <Space.Compact style={{ width: '100%', maxWidth: '600px' }}>
            <Select value={searchType} style={{ width: '120px' }} onChange={(val) => setSearchType(val)}>
              <Option value="name">성함</Option>
              <Option value="phone">연락처</Option>
              <Option value="pharmacy">약국명</Option>
            </Select>
            <Input 
              placeholder="완전 일치 검색" 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
            />
            <Button type="primary" icon={<Search size={16} />} onClick={handleSearch}>검색</Button>
          </Space.Compact>

          <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} />

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '20px' }}>
            <Button 
              icon={<ChevronLeft size={16} />} 
              disabled={currentPage === 1 || loading} 
              onClick={() => fetchData('prev', searchType, searchText)}
            >
              이전
            </Button>
            <Text strong>{currentPage} / {Math.ceil(total / PAGE_SIZE) || 1}</Text>
            <Button 
              disabled={(currentPage * PAGE_SIZE) >= total || loading} 
              onClick={() => fetchData('next', searchType, searchText)}
            >
              다음 <ChevronRight size={16} style={{ marginLeft: '4px' }} />
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );
}

export default function AdminExcelPage() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#27ae60' } }}>
      <App><ExcelPageContent /></App>
    </ConfigProvider>
  );
}