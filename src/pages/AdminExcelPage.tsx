import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "../lib/firebase";
import {
  collection, getDocs, getDoc, doc, query,
  orderBy, limit, startAfter, endBefore, startAt,
  limitToLast, where, getCountFromServer, deleteDoc
} from "firebase/firestore";
import { Table, Button, Space, Typography, Card, App, ConfigProvider, Input, Select, Popconfirm } from "antd";
import { Download, RefreshCw, Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;
const { Option } = Select;

const PAGE_SIZE = 10;
const PRIORITY_KEYS = ["성함", "연락처", "약국명"];
const EXCLUDED_KEYS = ["id", "created_at", "target"];

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
  page_type?: string;
  questions?: { title: string; type: string; options?: { text: string; order: number }[] }[];
  created_at?: any;
}

// URL 파라미터에서 firstId/lastId를 완전히 제거하는 유틸
function buildParams(base: Record<string, string>, remove: string[] = []) {
  const p = new URLSearchParams(base);
  remove.forEach(k => p.delete(k));
  return p;
}

// 동적 키 정렬 로직
function sortDynamicKeys(keys: Set<string>): string[] {
  return Array.from(keys).sort((a, b) => {
    const ai = PRIORITY_KEYS.indexOf(a);
    const bi = PRIORITY_KEYS.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
}

function ExcelPageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { message: msg, modal } = App.useApp();

  const [data, setData] = useState<SurveyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [dynamicKeys, setDynamicKeys] = useState<string[]>([]);
  const [surveyList, setSurveyList] = useState<SurveyListData[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  // 🔥 선택형 질문 키(질문 제목)를 별도 추적: 테이블에서 제외, 엑셀에서만 표시
  const [questionKeys, setQuestionKeys] = useState<Set<string>>(new Set());

  // URL에서 파생되는 값들
  const selectedCollectionName = searchParams.get("targetCollection") || "";
  const searchType = searchParams.get("type") || "성함";
  const searchText = searchParams.get("text") || "";
  const currentPage = Number(searchParams.get("page")) || 1;
  const firstId = searchParams.get("firstId") || "";
  const lastId = searchParams.get("lastId") || "";

  // 로컬 검색 입력값 (URL과 분리)
  const [localSearchType, setLocalSearchType] = useState(searchType);
  const [localSearchText, setLocalSearchText] = useState(searchText);

  // ─── Survey 목록 로드 ────────────────────────────────────────────
  useEffect(() => {
    const fetchSurveyList = async () => {
      try {
        const snap = await getDocs(query(collection(db, "survey_list"), orderBy("created_at", "desc")));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as SurveyListData[];
        setSurveyList(list);

        if (list.length > 0 && !searchParams.get("targetCollection")) {
          setSearchParams(
            { targetCollection: list[0].name, page: "1", type: "성함", text: "" },
            { replace: true }
          );
        }
      } catch {
        const snap = await getDocs(collection(db, "survey_list"));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as SurveyListData[];
        setSurveyList(list);
        if (list.length > 0 && !searchParams.get("targetCollection")) {
          setSearchParams({ targetCollection: list[0].name, page: "1", type: "성함", text: "" }, { replace: true });
        }
      }
    };
    fetchSurveyList();
  }, []);

  // 🔥 선택된 설문지가 선택형이면 질문 키 집합을 파생
  useEffect(() => {
    if (!selectedCollectionName || surveyList.length === 0) {
      setQuestionKeys(new Set());
      return;
    }
    const matched = surveyList.find((s: any) => s.name === selectedCollectionName) as any;
    if (matched && matched.page_type === "selective" && Array.isArray(matched.questions)) {
      const qKeys = new Set<string>(matched.questions.map((q: any) => (q.title ? q.title.trim() : "")));
      setQuestionKeys(qKeys);
    } else {
      setQuestionKeys(new Set());
    }
  }, [selectedCollectionName, surveyList]);

  // ─── 총 개수 조회 ────────────────────────────────────────────────
  const fetchTotalCount = useCallback(async (col: string, type: string, text: string) => {
    if (!col) return;
    try {
      const coll = collection(db, col);
      const q = text.trim()
        ? query(coll, where(type, "==", text.trim()))
        : query(coll);
      const snap = await getCountFromServer(q);
      setTotal(snap.data().count);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // ─── 데이터 조회 ────────────────────────────────────────────────
  const fetchData = useCallback(async (
    direction: "first" | "next" | "prev" | "stay",
    col: string,
    type: string,
    text: string,
    _firstId: string,
    _lastId: string,
    _currentPage: number
  ) => {
    if (!col) return;
    setLoading(true);
    try {
      const collRef = collection(db, col);
      const constraints: any[] = text.trim()
        ? [where(type, "==", text.trim()), orderBy(type)]
        : [orderBy("created_at", "desc")];

      let q;
      if (direction === "stay" && _firstId) {
        const cursor = await getDoc(doc(db, col, _firstId));
        q = query(collRef, ...constraints, startAt(cursor), limit(PAGE_SIZE));
      } else if (direction === "next" && _lastId) {
        const cursor = await getDoc(doc(db, col, _lastId));
        q = query(collRef, ...constraints, startAfter(cursor), limit(PAGE_SIZE));
      } else if (direction === "prev" && _firstId) {
        const cursor = await getDoc(doc(db, col, _firstId));
        q = query(collRef, ...constraints, endBefore(cursor), limitToLast(PAGE_SIZE));
      } else {
        q = query(collRef, ...constraints, limit(PAGE_SIZE));
      }

      const snap = await getDocs(q);
      const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as object) })) as SurveyData[];

      if (rows.length > 0) {
        setData(rows);

        const keysSet = new Set<string>();
        rows.forEach(r => Object.keys(r).forEach(k => { if (!EXCLUDED_KEYS.includes(k)) keysSet.add(k); }));
        setDynamicKeys(sortDynamicKeys(keysSet));

        const newFirstId = snap.docs[0].id;
        const newLastId = snap.docs[snap.docs.length - 1].id;
        const nextPage = direction === "next" ? _currentPage + 1
          : direction === "prev" ? _currentPage - 1
          : direction === "first" ? 1
          : _currentPage;

        setSearchParams({
          targetCollection: col,
          page: String(nextPage),
          firstId: newFirstId,
          lastId: newLastId,
          type,
          text,
        });
      } else {
        setData([]);
        setDynamicKeys([]);
      }
    } catch (e: any) {
      console.error("Firebase Error:", e);
      msg.error("데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [setSearchParams, msg]);

  // ─── URL 변경 시 재조회 ──────────────────────────────────────────
  useEffect(() => {
    const col = searchParams.get("targetCollection") || "";
    const type = searchParams.get("type") || "성함";
    const text = searchParams.get("text") || "";
    const fId = searchParams.get("firstId") || "";
    const lId = searchParams.get("lastId") || "";
    const page = Number(searchParams.get("page")) || 1;

    setLocalSearchType(type);
    setLocalSearchText(text);
    setSelectedRowKeys([]);

    if (!col) { setLoading(false); return; }

    fetchTotalCount(col, type, text);

    const direction = (page > 1 && fId) ? "stay" : "first";
    fetchData(direction, col, type, text, fId, lId, page);
  }, [
    searchParams.get("targetCollection"),
    searchParams.get("text"),
    searchParams.get("type"),
    searchParams.get("page"),
  ]);

  // ─── 핸들러 ─────────────────────────────────────────────────────
  const handleSurveyChange = (name: string) => {
    setSearchParams({ targetCollection: name, page: "1", type: "성함", text: "" });
  };

  const handleSearch = () => {
    setSearchParams({ targetCollection: selectedCollectionName, page: "1", type: localSearchType, text: localSearchText });
  };

  const handleRefresh = () => {
    setLocalSearchText("");
    setLocalSearchType("성함");
    const target = surveyList[0]?.name || "";
    setSearchParams(target ? { targetCollection: target } : {});
  };

  // 삭제 후 커서 ID 없이 1페이지로 복귀 — 핵심 수정 포인트
  const resetToFirstPage = () => {
    const params: Record<string, string> = {
      targetCollection: selectedCollectionName,
      page: "1",
      type: searchType,
      text: searchText,
    };
    // firstId, lastId를 아예 포함하지 않음 → 'first' direction으로 강제
    setSearchParams(params, { replace: true });
  };

  const handleDeleteSingle = async (id: string) => {
    if (!selectedCollectionName) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, selectedCollectionName, id));
      
      alert("성공적으로 삭제되었습니다.");
      
      // 가장 확실하고 간단하게 새로고침 처리
      window.location.reload();
      
    } catch (error) {
      console.error("삭제 실패:", error);
      msg.error("삭제 처리에 실패했습니다.");
      setLoading(false); 
    }
  };

  const handleDeleteBulk = async () => {
    if (!selectedCollectionName || selectedRowKeys.length === 0) return;
    try {
      setLoading(true);
      await Promise.all(
        selectedRowKeys.map((id) => deleteDoc(doc(db, selectedCollectionName, String(id))))
      );
      
      alert(`${selectedRowKeys.length}건의 데이터가 삭제되었습니다.`);
      
      // 일괄 삭제 후에도 똑같이 새로고침
      window.location.reload();
  
    } catch (error) {
      console.error("일괄 삭제 실패:", error);
      msg.error("일괄 삭제 처리에 실패했습니다.");
      setLoading(false); 
    }
  };

  // ─── CSV 다운로드 ────────────────────────────────────────────────
  const executeDownload = async () => {
    if (!selectedCollectionName) return;
    setLoading(true);
    try {
      const constraints: any[] = searchText.trim()
        ? [where(searchType, "==", searchText.trim()), orderBy(searchType)]
        : [orderBy("created_at", "desc")];
      const snap = await getDocs(query(collection(db, selectedCollectionName), ...constraints));
      const allData = snap.docs.map(d => ({ id: d.id, ...(d.data() as object) })) as SurveyData[];

      const keysSet = new Set<string>();
      allData.forEach(r => Object.keys(r).forEach(k => { if (!EXCLUDED_KEYS.includes(k)) keysSet.add(k); }));
      const keys = sortDynamicKeys(keysSet);

      const headers = ["No", "신청시간", ...keys];
      const rows = allData.map((item, i) => {
        const cells = [String(allData.length - i), item.created_at?.toDate()?.toLocaleString() || "미정"];
        keys.forEach(k => {
          let val = item[k] !== undefined ? String(item[k]) : "";
          if (k === "연락처" || (val.startsWith("0") && !isNaN(Number(val.replace(/-/g, ""))))) val = `="${val}"`;
          cells.push(val.includes(",") || val.includes("\n") || val.includes('"')
            ? `"${val.replace(/"/g, '""')}"` : val);
        });
        return cells;
      });

      const csv = "\ufeff" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      Object.assign(document.createElement("a"), { href: url, download: `상담신청_내역_${new Date().toISOString().slice(0, 10)}.csv` }).click();
      URL.revokeObjectURL(url);
      msg.success("다운로드 완료");
    } catch {
      msg.error("다운로드 실패");
    } finally {
      setLoading(false);
    }
  };

  // ─── 테이블 컬럼 ─────────────────────────────────────────────────
  // 🔥 테이블에서는 선택형 질문 키를 제외하고 표시 (엑셀 다운로드에서는 포함됨)
  const tableKeys = dynamicKeys.filter(key => ( !questionKeys.has(key) && PRIORITY_KEYS.includes(key) ));
  const columns: ColumnsType<SurveyData> = [
    { title: "No.", key: "no", width: 70, align: "center",
      render: (_, __, i) => total - ((currentPage - 1) * PAGE_SIZE) - i },
    { title: "신청시간", dataIndex: "created_at", key: "created_at", width: 200,
      render: (val) => <span style={{ whiteSpace: "nowrap" }}>{val?.toDate()?.toLocaleString() || "미정"}</span> },
    ...tableKeys.map(key => ({
      title: key, dataIndex: key, key,
      render: (text: any) => key === "성함" ? <Text strong>{text || "-"}</Text> : (text || "-"),
    })),
    { title: "관리", key: "action", width: 80, align: "center", fixed: "right" as const,
      render: (_, record) => (
        <Popconfirm
          title="삭제하시겠습니까?"
          description="삭제된 데이터는 복구할 수 없습니다."
          onConfirm={() => handleDeleteSingle(record.id)}
          okText="삭제" cancelText="취소" okButtonProps={{ danger: true }}
        >
          <Button type="primary" danger icon={<Trash2 size={14} />} size="small">삭제</Button>
        </Popconfirm>
      ),
    },
  ];

  // 🔥 선택형 질문 키가 있으면 상단에 안내 뱃지 표시용 플래그
  const hasHiddenQuestionCols = questionKeys.size > 0;

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}>
      <Card variant="borderless" className="shadow-sm">
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>

          {/* 헤더 */}
          <Space style={{ justifyContent: "space-between", width: "100%" }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>상담 신청 관리</Title>
              <Text type="secondary">Total <Text strong>{total}</Text> records</Text>
            </div>
            <Space wrap>
              {selectedRowKeys.length > 0 && (
                <Button danger type="primary" icon={<Trash2 size={14} />}
                  onClick={() => modal.confirm({
                    title: "선택 항목 일괄 삭제",
                    content: `선택한 ${selectedRowKeys.length}건을 삭제하시겠습니까? 되돌릴 수 없습니다.`,
                    okText: "일괄 삭제", okButtonProps: { danger: true }, cancelText: "취소",
                    onOk: handleDeleteBulk,
                  })}
                >
                  선택 삭제 ({selectedRowKeys.length})
                </Button>
              )}
              <Button icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />} onClick={handleRefresh}>새로고침</Button>
              <Button type="primary" icon={<Download size={14} />}
                style={{ backgroundColor: "#27ae60", borderColor: "#27ae60" }}
                onClick={() => modal.confirm({
                  title: "데이터 다운로드", content: "현재 조건으로 CSV를 다운로드하시겠습니까?",
                  onOk: executeDownload,
                })}
              >
                엑셀 다운로드
              </Button>
            </Space>
          </Space>

          {/* 설문지 선택 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Text type="secondary" strong>설문지 선택</Text>
            <Select
              value={selectedCollectionName || undefined}
              style={{ width: "100%", maxWidth: 300 }}
              onChange={handleSurveyChange}
              placeholder="설문지를 선택해주세요"
            >
              {surveyList.map(s => <Option key={s.id} value={s.name}>{s.name || s.title}</Option>)}
            </Select>
          </div>

          {/* 검색 */}
          <Space.Compact style={{ width: "100%", maxWidth: 600 }}>
            <Select value={localSearchType} style={{ width: 120 }} onChange={setLocalSearchType}>
              {PRIORITY_KEYS.map(k => <Option key={k} value={k}>{k}</Option>)}
            </Select>
            <Input
              placeholder="완전 일치 검색"
              value={localSearchText}
              onChange={e => setLocalSearchText(e.target.value)}
              onPressEnter={handleSearch}
            />
            <Button type="primary" icon={<Search size={16} />} onClick={handleSearch}>검색</Button>
          </Space.Compact>

          {/* 테이블 */}
          {hasHiddenQuestionCols && (
            <div style={{ padding: '8px 14px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '8px', fontSize: '13px', color: '#7c5c00' }}>
              📊 이 설문지는 <strong>선택형</strong> 페이지입니다. 질문 항목 ({Array.from(questionKeys).join(', ')}) 은 테이블에서 숨겨지며, <strong>엑셀 다운로드</strong> 시 포함됩니다.
            </div>
          )}
          <Table
            rowSelection={{ selectedRowKeys, onChange: keys => setSelectedRowKeys(keys) }}
            dataSource={data}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: "max-content" }}
          />

          {/* 페이지네이션 */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20 }}>
            <Button icon={<ChevronLeft size={16} />} disabled={currentPage === 1 || loading}
              onClick={() => fetchData("prev", selectedCollectionName, searchType, searchText, firstId, lastId, currentPage)}>
              이전
            </Button>
            <Text strong>{currentPage} / {totalPages}</Text>
            <Button disabled={currentPage >= totalPages || loading}
              onClick={() => fetchData("next", selectedCollectionName, searchType, searchText, firstId, lastId, currentPage)}>
              다음 <ChevronRight size={16} style={{ marginLeft: 4 }} />
            </Button>
          </div>

        </Space>
      </Card>
    </div>
  );
}

export default function AdminExcelPage() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#27ae60" } }}>
      <App><ExcelPageContent /></App>
    </ConfigProvider>
  );
}