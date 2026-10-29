import { useEffect, useState, useCallback } from "react";
import { db } from "../lib/firebase";
import {
  collection, addDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, doc,
} from "firebase/firestore";
import {
  Card, Typography, Form, Input, Select, Button, Space, Spin, Tag,
  App, ConfigProvider, Empty, Popconfirm,
} from "antd";
import { Send, RefreshCw, MessageSquarePlus, Trash2 } from "lucide-react";
import RichTextEditor, { sanitizeHtml, isHtmlEmpty } from "../components/RichTextEditor";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const COLLECTION = "feature_requests";

// 요청 유형 정의
const REQUEST_TYPES: Record<string, { label: string; color: string }> = {
  feature: { label: "기능 요청", color: "blue" },
  bug: { label: "버그 신고", color: "red" },
  improve: { label: "개선 제안", color: "green" },
  question: { label: "문의", color: "gold" },
  etc: { label: "기타", color: "default" },
};

interface FeatureRequest {
  id: string;
  type: string;
  title: string;
  author: string;
  content: string;
  client_id?: string;
  ip?: string;
  created_at?: any;
}

// ─── 브라우저 고유 ID (본인 글 판별용) ──────────────────────────
const CLIENT_ID_KEY = "fr_client_id";
function getClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

// 공인 IP 조회 (보조 정보, 실패해도 등록은 진행)
async function fetchPublicIp(): Promise<string> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (!res.ok) return "";
    const data = await res.json();
    return data.ip || "";
  } catch {
    return "";
  }
}

function FeatureRequestContent() {
  const { message: msg } = App.useApp();
  const [form] = Form.useForm();
  const [list, setList] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const clientId = getClientId();

  // ─── 목록 로드 ──────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, COLLECTION), orderBy("created_at", "desc"))
      );
      setList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as FeatureRequest[]);
    } catch (e) {
      // 정렬 인덱스 등 문제 시 정렬 없이 재시도
      try {
        const snap = await getDocs(collection(db, COLLECTION));
        setList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as FeatureRequest[]);
      } catch {
        msg.error("목록을 불러오지 못했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }, [msg]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // ─── 제출 ──────────────────────────────────────────────────
  const handleSubmit = async (values: any) => {
    if (!window.confirm("작성하신 내용으로 건의를 등록하시겠습니까?")) return;
    setSubmitting(true);
    try {
      const ip = await fetchPublicIp();
      await addDoc(collection(db, COLLECTION), {
        type: values.type,
        title: values.title.trim(),
        author: (values.author || "").trim() || "익명",
        content: sanitizeHtml(values.content || ""),
        client_id: clientId,
        ip,
        created_at: serverTimestamp(),
      });
      msg.success("건의가 등록되었습니다. 감사합니다!");
      form.resetFields();
      fetchList();
    } catch (e) {
      console.error(e);
      msg.error("등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION, id));
      msg.success("삭제되었습니다.");
      fetchList();
    } catch (e) {
      console.error(e);
      msg.error("삭제에 실패했습니다.");
    }
  };

  return (
    <div style={{ padding: "40px 20px", maxWidth: "900px", margin: "0 auto" }}>
      {/* 작성 폼 */}
      <Card variant="borderless" className="shadow-sm" style={{ marginBottom: 24 }}>
        <Space align="center" style={{ marginBottom: 4 }}>
          <MessageSquarePlus size={22} style={{ color: "#27ae60" }} />
          <Title level={3} style={{ margin: 0 }}>건의함</Title>
        </Space>
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          필요한 기능, 버그, 개선 아이디어, 문의 사항을 자유롭게 남겨주세요. 개발자가 확인 후 반영합니다.
        </Paragraph>

        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ type: "feature" }}>
          <Space style={{ width: "100%" }} styles={{ item: { flex: 1 } } as any} wrap>
            <Form.Item
              name="type"
              label="유형"
              rules={[{ required: true, message: "유형을 선택해주세요." }]}
              style={{ minWidth: 180 }}
            >
              <Select>
                {Object.entries(REQUEST_TYPES).map(([key, { label }]) => (
                  <Option key={key} value={key}>{label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="author"
              label="작성자 (선택)"
              style={{ minWidth: 220, flex: 1 }}
            >
              <Input placeholder="이름 또는 닉네임 (미입력 시 익명)" maxLength={30} />
            </Form.Item>
          </Space>

          <Form.Item
            name="title"
            label="제목"
            rules={[{ required: true, message: "제목을 입력해주세요." }]}
          >
            <Input placeholder="요청 내용을 한 줄로 요약해주세요." maxLength={100} showCount />
          </Form.Item>

          <Form.Item
            name="content"
            label="상세 내용"
            required
            rules={[
              {
                validator: (_, v) =>
                  isHtmlEmpty(v || "")
                    ? Promise.reject(new Error("상세 내용을 입력해주세요."))
                    : Promise.resolve(),
              },
            ]}
          >
            <RichTextEditor placeholder="어떤 기능이 필요한지, 어떤 상황에서 불편한지 구체적으로 적어주시면 반영에 큰 도움이 됩니다." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={<Send size={15} />}
              style={{ backgroundColor: "#27ae60", borderColor: "#27ae60", height: 44, fontWeight: "bold" }}
              block
            >
              건의 등록
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 목록 */}
      <Card variant="borderless" className="shadow-sm">
        <Space style={{ justifyContent: "space-between", width: "100%", marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            접수된 요청 <Text type="secondary" style={{ fontSize: 14 }}>({list.length})</Text>
          </Title>
          <Button
            icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
            onClick={fetchList}
          >
            새로고침
          </Button>
        </Space>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin />
          </div>
        ) : list.length === 0 ? (
          <Empty description="아직 등록된 요청이 없습니다." style={{ padding: "32px 0" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {list.map((item) => {
              const typeInfo = REQUEST_TYPES[item.type] || REQUEST_TYPES.etc;
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "16px 4px",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Space size={8} wrap style={{ marginBottom: 8 }}>
                      <Tag color={typeInfo.color} style={{ margin: 0 }}>{typeInfo.label}</Tag>
                      <span style={{ fontWeight: 600 }}>{item.title}</span>
                    </Space>
                    <div
                      className="fr-content"
                      style={{ marginBottom: 8, color: "#333", lineHeight: 1.7 }}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content || "") }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      작성자: {item.author || "익명"}
                      {"  ·  "}
                      {item.created_at?.toDate?.()?.toLocaleString() || "방금 전"}
                    </Text>
                    <div style={{ marginTop: 4, fontSize: 11, color: "#bfbfbf", wordBreak: "break-all" }}>
                      IP: {item.ip || "-"}
                      {"  ·  "}
                      ID: {item.client_id || "-"}
                      {item.client_id && item.client_id === clientId && (
                        <Tag color="green" style={{ marginLeft: 6, fontSize: 10, lineHeight: "16px", padding: "0 5px" }}>
                          내 글
                        </Tag>
                      )}
                    </div>
                  </div>
                  {item.client_id && item.client_id === clientId && (
                    <Popconfirm
                      title="삭제하시겠습니까?"
                      description="삭제된 건의는 복구할 수 없습니다."
                      onConfirm={() => handleDelete(item.id)}
                      okText="삭제"
                      cancelText="취소"
                      okButtonProps={{ danger: true }}
                    >
                      <Button danger type="text" size="small" icon={<Trash2 size={14} />} />
                    </Popconfirm>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function FeatureRequestPage() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#27ae60" } }}>
      <App>
        <FeatureRequestContent />
      </App>
    </ConfigProvider>
  );
}
