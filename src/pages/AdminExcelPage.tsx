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
  startAt,
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
  target?: string;
  created_at: any;
  [key: string]: any; 
}

interface SurveyListData {
  id: string;
  title?: string;
  name: string; 
  created_at?: any;
}

function ExcelPageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { message: msg, modal } = App.useApp();
  
  const [data, setData] = useState<SurveyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [dynamicKeys, setDynamicKeys] = useState<string[]>([]);

  const [searchType, setSearchType] = useState<string>(searchParams.get("type") || "성함");
  const [searchText, setSearchText] = useState<string>(searchParams.get("text") || "");
  
  const [surveyList, setSurveyList] = useState<SurveyListData[]>([]);
  const [selectedCollectionName, setSelectedCollectionName] = useState<string>(searchParams.get("targetCollection") || "");

  const currentPage = Number(searchParams.get("page")) || 1;
  const firstId = searchParams.get("firstId");
  const lastId = searchParams.get("lastId");

  const PAGE_SIZE = 10;

  const fetchSurveyList = async () => {
    try {
      const listQuery = query(collection(db, "survey_list"), orderBy("created_at", "desc"));
      const querySnapshot = await getDocs(listQuery);
      
      const list = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SurveyListData[];
      
      setSurveyList(list);

      if (list.length > 0 && !searchParams.get("targetCollection")) {
        const defaultTarget = list[0].name;
        setSelectedCollectionName(defaultTarget);
        setSearchParams(
          {
            targetCollection: defaultTarget,
            page: "1",
            type: "성함", 
            text: ""
          },
          { replace: true }
        );
      }
    } catch (error) {
      console.error("survey_list 로드 실패:", error);
      const fallbackSnapshot = await getDocs(collection(db, "survey_list"));
      const fallbackList = fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SurveyListData[];
      setSurveyList(fallbackList);
      if (fallbackList.length > 0 && !searchParams.get("targetCollection")) {
        const defaultTarget = fallbackList[0].name;
        setSelectedCollectionName(defaultTarget);
        setSearchParams({ targetCollection: defaultTarget, page: "1", type: "성함", text: "" }, { replace: true });
      }
    }
  };

  useEffect(() => {
    fetchSurveyList();
  }, []);

  const fetchTotalCount = async (targetCollection: string, type: string, text: string) => {
    if (!targetCollection) return;
    try {
      const coll = collection(db, targetCollection);
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

  const fetchData = useCallback(async (
    direction: 'first' | 'next' | 'prev' | 'stay', 
    targetCollection: string, 
    type: string, 
    text: string
  ) => {
    if (!targetCollection) return;
    setLoading(true);
    try {
      const collRef = collection(db, targetCollection);
      let queryConstraints: any[] = [];

      if (text.trim() !== "") {
        queryConstraints.push(where(type, "==", text.trim()));
        queryConstraints.push(orderBy(type));
      } else {
        queryConstraints.push(orderBy("created_at", "desc"));
      }

      let q;
      if (direction === 'stay' && firstId) {
        const cursorDoc = await getDoc(doc(db, targetCollection, firstId));
        q = query(collRef, ...queryConstraints, startAt(cursorDoc), limit(PAGE_SIZE));
      } 
      else if (direction === 'next' && lastId) {
        const cursorDoc = await getDoc(doc(db, targetCollection, lastId));
        q = query(collRef, ...queryConstraints, startAfter(cursorDoc), limit(PAGE_SIZE));
      } 
      else if (direction === 'prev' && firstId) {
        const cursorDoc = await getDoc(doc(db, targetCollection, firstId));
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

        const excludedKeys = ["id", "created_at", "target"];
        const keysSet = new Set<string>();
        rows.forEach(row => {
          Object.keys(row).forEach(key => {
            if (!excludedKeys.includes(key)) {
              keysSet.add(key);
            }
          });
        });
        
        const sortedKeys = Array.from(keysSet).sort((a, b) => {
          const priority = ["성함", "연락처", "약국명"];
          const idxA = priority.indexOf(a);
          const idxB = priority.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.localeCompare(b);
        });
        setDynamicKeys(sortedKeys);

        const newFirstId = querySnapshot.docs[0].id;
        const newLastId = querySnapshot.docs[querySnapshot.docs.length - 1].id;
        
        let nextPage = currentPage;
        if (direction === 'first') nextPage = 1;
        else if (direction === 'next') nextPage = currentPage + 1;
        else if (direction === 'prev') nextPage = currentPage - 1;

        setSearchParams({
          targetCollection: targetCollection,
          page: String(nextPage),
          firstId: newFirstId,
          lastId: newLastId,
          type: type,
          text: text
        });
      } else {
        setData([]);
        setDynamicKeys([]);
      }
    } catch (error: any) {
      console.error("Firebase Error:", error);
      msg.error("데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [firstId, lastId, currentPage, setSearchParams, msg]);

  useEffect(() => {
    const qCollection = searchParams.get("targetCollection") || "";
    const qText = searchParams.get("text") || "";
    const qType = searchParams.get("type") || "성함"; 
    
    setSearchText(qText);
    setSearchType(qType);

    if (qCollection) {
      setSelectedCollectionName(qCollection);
      fetchTotalCount(qCollection, qType, qText);

      if (currentPage > 1 && firstId) {
        fetchData('stay', qCollection, qType, qText);
      } else {
        fetchData('first', qCollection, qType, qText);
      }
    } else {
      setLoading(false);
    }
  }, [searchParams.get("targetCollection"), searchParams.get("text"), searchParams.get("type")]); 

  const handleSurveyChange = (collectionName: string) => {
    setSelectedCollectionName(collectionName);
    setSearchParams({
      targetCollection: collectionName,
      page: "1",
      type: "성함", 
      text: ""
    });
  };

  const handleSearch = () => {
    setSearchParams({
      targetCollection: selectedCollectionName,
      page: "1",
      type: searchType,
      text: searchText
    });
  };

  const handleRefresh = () => {
    setSearchText("");
    setSearchType("성함"); 
    if (surveyList.length > 0) {
      setSelectedCollectionName(surveyList[0].name);
      setSearchParams({ targetCollection: surveyList[0].name });
    } else {
      setSearchParams({});
    }
  };

  const executeDownload = async () => {
    if (!selectedCollectionName) return;
    setLoading(true);
    try {
      const collRef = collection(db, selectedCollectionName);
      let queryConstraints: any[] = [];
      const qText = searchParams.get("text") || "";
      const qType = searchParams.get("type") || "성함"; 

      if (qText.trim() !== "") {
        queryConstraints.push(where(qType, "==", qText.trim()));
        queryConstraints.push(orderBy(qType));
      } else {
        queryConstraints.push(orderBy("created_at", "desc"));
      }
      const q = query(collRef, ...queryConstraints);
      const querySnapshot = await getDocs(q);
      const allData = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) })) as SurveyData[];
      
      const keysSet = new Set<string>();
      allData.forEach(row => {
        Object.keys(row).forEach(key => {
          if (!["id", "created_at", "target"].includes(key)) keysSet.add(key);
        });
      });
      
      const sortedKeys = Array.from(keysSet).sort((a, b) => {
        const priority = ["성함", "연락처", "약국명"];
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      const headers = ["No", "신청시간", ...sortedKeys];

      const rows = allData.map((item, index) => {
        const rowCells = [
          String(allData.length - index),
          item.created_at?.toDate()?.toLocaleString() || "미정"
        ];
        
        sortedKeys.forEach(key => {
          let val = item[key] !== undefined ? String(item[key]) : "";
          
          // 🔥 [수정 1] 0 잘림 현상 방지: 0으로 시작하는 숫자 배열 혹은 '연락처' 필드는 엑셀 수식 형태 `="값"`으로 변환하여 안전하게 문자로 고정합니다.
          if (key === "연락처" || (val.startsWith("0") && !isNaN(Number(val.replace(/-/g, ""))))) {
            val = `="${val}"`; 
          }

          if (val.includes(",") || val.includes("\n") || val.includes('"')) {
            // 수식 내부 큰따옴표 이스케이프 구조 처리
            rowCells.push(`"${val.replace(/"/g, '""')}"`);
          } else {
            rowCells.push(val);
          }
        });
        return rowCells;
      });

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
      console.error(err);
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
    { 
      title: "신청시간", 
      dataIndex: "created_at", 
      key: "created_at", 
      width: 220, // 🔥 [수정 2] 너비를 180에서 220으로 확장
      render: (val) => (
        // 🔥 줄바꿈 방지 스타일 적용
        <span style={{ whiteSpace: "nowrap" }}>
          {val?.toDate()?.toLocaleString() || "미정"}
        </span>
      )
    },
    ...dynamicKeys.map(key => ({
      title: key,
      dataIndex: key,
      key: key,
      render: (text: any) => {
        if (key === "성함") return <Text strong>{text || "-"}</Text>;
        return text || "-";
      }
    }))
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Text type="secondary" strong>설문지 선택</Text>
            <Select 
              value={selectedCollectionName || undefined} 
              style={{ width: '100%', maxWidth: '300px' }} 
              onChange={handleSurveyChange}
              placeholder="설문지를 선택해주세요"
            >
              {surveyList.map((survey) => (
                <Option key={survey.id} value={survey.name}>
                  {survey.name || survey.title}
                </Option>
              ))}
            </Select>
          </div>

          <Space.Compact style={{ width: '100%', maxWidth: '600px' }}>
            <Select value={searchType} style={{ width: '120px' }} onChange={(val) => setSearchType(val)}>
              <Option value="성함">성함</Option>
              <Option value="연락처">연락처</Option>
              <Option value="약국명">약국명</Option>
            </Select>
            <Input 
              placeholder="완전 일치 검색" 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
            />
            <Button type="primary" icon={<Search size={16} />} onClick={handleSearch}>검색</Button>
          </Space.Compact>

          <Table 
            dataSource={data} 
            columns={columns} 
            rowKey="id" 
            loading={loading} 
            pagination={false} 
            scroll={{ x: 'max-content' }}
          />

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '20px' }}>
            <Button 
              icon={<ChevronLeft size={16} />} 
              disabled={currentPage === 1 || loading} 
              onClick={() => fetchData('prev', selectedCollectionName, searchType, searchText)}
            >
              이전
            </Button>
            <Text strong>{currentPage} / {Math.ceil(total / PAGE_SIZE) || 1}</Text>
            <Button 
              disabled={(currentPage * PAGE_SIZE) >= total || loading} 
              onClick={() => fetchData('next', selectedCollectionName, searchType, searchText)}
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