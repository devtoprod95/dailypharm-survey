import { useEffect, useState, useCallback } from "react";
import { db } from "../lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  endBefore,
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
  const [data, setData] = useState<SurveyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [firstVisible, setFirstVisible] = useState<any>(null);
  const [lastVisible, setLastVisible] = useState<any>(null);

  const [searchType, setSearchType] = useState<string>("name");
  const [searchText, setSearchText] = useState<string>("");

  const { message: msg, modal } = App.useApp();
  const PAGE_SIZE = 10;

  const fetchTotalCount = async (targetText: string) => {
    try {
      const coll = collection(db, "survey");
      let q = query(coll);
      if (targetText.trim() !== "") {
        q = query(coll, where(searchType, "==", targetText.trim()));
      }
      const snapshot = await getCountFromServer(q);
      setTotal(snapshot.data().count);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData = useCallback(async (direction: 'first' | 'next' | 'prev', targetText: string = searchText) => {
    setLoading(true);
    try {
      const collRef = collection(db, "survey");
      let queryConstraints: any[] = [];

      // [핵심 변경] 검색어가 있으면 해당 필드로 정렬, 없으면 생성일로 정렬
      if (targetText.trim() !== "") {
        queryConstraints.push(where(searchType, "==", targetText.trim()));
        queryConstraints.push(orderBy(searchType)); // 에러 방지를 위해 검색 필드로 정렬 고정
      } else {
        queryConstraints.push(orderBy("created_at", "desc"));
      }

      let q;
      if (direction === 'first') {
        q = query(collRef, ...queryConstraints, limit(PAGE_SIZE));
      } else if (direction === 'next' && lastVisible) {
        q = query(collRef, ...queryConstraints, startAfter(lastVisible), limit(PAGE_SIZE));
      } else if (direction === 'prev' && firstVisible) {
        q = query(collRef, ...queryConstraints, endBefore(firstVisible), limitToLast(PAGE_SIZE));
      } else {
        setLoading(false);
        return;
      }

      const querySnapshot = await getDocs(q);
      const rows = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...(doc.data() as object) 
      })) as SurveyData[];

      if (rows.length > 0) {
        setData(rows);
        setFirstVisible(querySnapshot.docs[0]);
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        
        if (direction === 'first') setCurrentPage(1);
        else if (direction === 'next') setCurrentPage(prev => prev + 1);
        else if (direction === 'prev') setCurrentPage(prev => prev - 1);
      } else {
        if (direction === 'first') {
          setData([]);
          setCurrentPage(1);
        }
      }
    } catch (error: any) {
      console.error("Firebase Error:", error);
      msg.error("검색/정렬 인덱스가 필요합니다. 콘솔의 링크를 확인하세요.");
    } finally {
      setLoading(false);
    }
  }, [firstVisible, lastVisible, searchType, searchText, msg]);

  useEffect(() => {
    fetchTotalCount("");
    fetchData('first', "");
  }, []);

  const handleSearch = () => {
    fetchTotalCount(searchText);
    fetchData('first', searchText);
  };

  const handleRefresh = () => {
    setSearchText("");
    fetchTotalCount("");
    fetchData('first', "");
  };

  const executeDownload = async () => {
    setLoading(true);
    try {
      const collRef = collection(db, "survey");
      let queryConstraints: any[] = [];
      
      if (searchText.trim() !== "") {
        queryConstraints.push(where(searchType, "==", searchText.trim()));
        queryConstraints.push(orderBy(searchType));
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
            <Select defaultValue="name" style={{ width: '120px' }} onChange={(val) => setSearchType(val)}>
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
            <Button icon={<ChevronLeft size={16} />} disabled={currentPage === 1 || loading} onClick={() => fetchData('prev')}>이전</Button>
            <Text strong>{currentPage} / {Math.ceil(total / PAGE_SIZE) || 1}</Text>
            <Button disabled={(currentPage * PAGE_SIZE) >= total || loading} onClick={() => fetchData('next')}>
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