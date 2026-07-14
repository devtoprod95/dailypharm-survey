import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase"; 
import { Form, Input, Button, Card, Checkbox, Space, Typography, Divider, Row, Col, Upload, Image, Select, Radio } from "antd"; 
import { ArrowLeft, Eye, Upload as UploadIcon, Key as KeyIcon, AlertCircle, Plus, Trash2, GripVertical } from "lucide-react"; 

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const DEFAULT_FORM_VALUES = {
  name: "",
  page_type: "normal",
  show_title: true,
  title: "팜스타트 대행 서비스 신청",
  subtitle: "현재 팜스타트 패키지 신청 시 39만원 이상 절감 혜택 제공 중!",
  show_subtitle: true,
  show_top_image: true,
  top_image_url: "",
  // 초기 디폴트 2개 세팅
  fields: [
    { key: "name", label: "성함", type: "text", show: true, required: true },
    { key: "phone", label: "연락처", type: "number", show: true, required: true },
  ],
  questions: [],
  terms_privacy: { 
    title: "개인정보 수집 및 이용 동의 (필수)", 
    show: true, 
    content: "수집 업체 : 데일리팜\n수집 목적 : SNS 온라인 대행 6개월 패키지 상담 정보 제공\n수집 항목 : 성함/연락처\n보관 기간 : 신청 후 1년" 
  },
  terms_third_party: { 
    title: "개인정보 제3자 제공 동의 (필수)", 
    show: true, 
    content: "제공받는 자 : 킹메이커\n이용 목적 : SNS 온라인 대행 운영 및 service 광고 및 마케팅\n수집 항목 : 성함/연락처\n보유 및 이용 기간 : 목적 달성 시까지 (관련 법령에 따라 보관 후 삭제)" 
  },
  disagree_notice_text: "※ 미동의 시 상담 및 이벤트 혜택 수령이 불가능합니다.",
  show_disagree_notice: true,
  submit_button_text: "무료 상담하고 혜택 받기",
  footer_notice_text1: "정보는 서비스 안내 및 상담 목적으로만 사용됩니다.",
  footer_notice_text2: "관련 문의 이메일 : pharmstart@dailypharm.com",
  show_footer_notice1: true,
  show_footer_notice2: true,
};

const REPO_OWNER = "devtoprod95";
const REPO_NAME = "dailypharm-survey";

interface ImageItem {
  id: string;
  previewUrl: string | null;
  rawFile: File | null;
  existingUrl: string | null;
}

const getImgSrc = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const baseUrl = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  return `${baseUrl}${cleanUrl}`;
};

export default function LandingFormPage({ id, onBack }: { id?: string; onBack: () => void }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false); 
  const [timestamp, setTimestamp] = useState(new Date().getTime()); 
  const [token, setToken] = useState(""); 
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [currentName, setCurrentName] = useState("");
  const pageType = Form.useWatch("page_type", form) || "normal";

  // 1. 데이터 로드 파트 (수정: dbKey 대신 컴포넌트 표준인 'key' 명칭 사용 및 필드 구조 매핑)
  useEffect(() => {
    const initForm = async () => {
      setLoading(true);
      try {
        const fixedFields = [
          { key: "name", label: "성함", type: "text", show: true, required: true },
          { key: "phone", label: "연락처", type: "number", show: true, required: true },
        ];

        if (id) {
          const docRef = doc(db, "survey_list", id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();

            // 기존 파베 데이터 중 고정 필드 2개를 제외한 나머지 커스텀 필드만 필터링 후 오름차순 정렬
            const customFields = data.fields
              ? Object.entries(data.fields)
                  .filter(([key]) => !["name", "phone"].includes(key))
                  .sort(([keyA], [keyB]) => keyA.localeCompare(keyB, undefined, { numeric: true, sensitivity: 'base' }))
                  .map(([key, value]: [string, any]) => ({
                    key: key, // 🌟 원본 파베 필드명을 key 프로퍼티에 명시적으로 보존
                    type: value.type || "text",
                    ...value
                  }))
              : [];

            const formattedFields = [...fixedFields, ...customFields];

            const loadedQuestions = (data.questions || []).map((q: any) => {
              let opts = q.options || [];
              if (Array.isArray(opts)) {
                opts = opts.map((opt: any, idx: number) => {
                  if (typeof opt === 'object' && opt !== null) {
                    return {
                      text: opt.text || '',
                      order: opt.order !== undefined ? Number(opt.order) : idx + 1
                    };
                  } else {
                    return {
                      text: String(opt),
                      order: idx + 1
                    };
                  }
                }).sort((a: any, b: any) => a.order - b.order);
              }
              return {
                ...q,
                options: opts
              };
            });

            form.setFieldsValue({
              ...DEFAULT_FORM_VALUES,
              ...data, 
              page_type: data.page_type || "normal",
              questions: loadedQuestions,
              fields: formattedFields,
              terms_privacy: { ...DEFAULT_FORM_VALUES.terms_privacy, ...data.terms_privacy },
              terms_third_party: { ...DEFAULT_FORM_VALUES.terms_third_party, ...data.terms_third_party },
            });
          
            setCurrentName(data.name || id);

            let loadedImages: ImageItem[] = [];
            if (data.images && Array.isArray(data.images)) {
              loadedImages = data.images.map((url, idx) => ({
                id: `existing-${idx}-${new Date().getTime()}`,
                previewUrl: null,
                rawFile: null,
                existingUrl: url,
              }));
            } else if (data.top_image_url) {
              loadedImages = [{
                id: `existing-0-${new Date().getTime()}`,
                previewUrl: null,
                rawFile: null,
                existingUrl: data.top_image_url,
              }];
            }
            setImageItems(loadedImages);
          }
        } else {
          // 신규 생성 시에도 고정 필드 2개는 기본 탑재
          form.setFieldsValue({
            ...DEFAULT_FORM_VALUES,
            fields: fixedFields
          });
          setCurrentName("");
          setImageItems([]);
        }
      } catch (error) {
        alert("데이터 로드에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    initForm();
  }, [id, form]);

  // 이미지 처리용 헬퍼 함수들
  const addImageItem = () => {
    setImageItems((prev) => [
      ...prev,
      {
        id: `new-${new Date().getTime()}-${prev.length}`,
        previewUrl: null,
        rawFile: null,
        existingUrl: null,
      },
    ]);
  };

  const removeImageItem = (index: number) => {
    setImageItems((prev) => {
      const target = prev[index];
      if (target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const moveImageItem = (index: number, direction: "up" | "down") => {
    setImageItems((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleImageUpload = (index: number, file: File) => {
    setImageItems((prev) => {
      const next = [...prev];
      if (next[index].previewUrl) {
        URL.revokeObjectURL(next[index].previewUrl!);
      }
      next[index] = {
        ...next[index],
        rawFile: file,
        previewUrl: URL.createObjectURL(file),
      };
      return next;
    });
    setTimestamp(new Date().getTime());
  };

  // 2. 중복 체크 벨리데이션
  const checkDuplicateName = async (_: any, value: string) => {
    if (!value) return Promise.resolve();
    if (id) return Promise.resolve();

    try {
      const q = query(collection(db, "survey_list"), where("name", "==", value.trim()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return Promise.reject(new Error("이미 사용 중인 설문지명입니다."));
      }
      return Promise.resolve();
    } catch (error) {
      console.error("중복 체크 에러:", error);
      return Promise.reject(new Error("이름 중복 확인 중 오류가 발생했습니다."));
    }
  };

  // 3. 저장하기 파트 (수정: 히든 필드로 동기화된 f.key 유무를 판단하여 키 고정 및 다중 이미지 업로드 지원)
  const onFinish = async (values: any) => {
    const fieldNameValue = values.name ? values.name.trim() : "";
    
    if (!fieldNameValue) {
      return alert("설문지명 값이 누락되었습니다.");
    }
  
    const targetDocId = id ? id.trim() : fieldNameValue;
    const isEditMode = !!id;

    // 빈 이미지 슬롯이 있는지 확인
    const hasEmptySlots = imageItems.some(item => !item.existingUrl && !item.rawFile);
    if (hasEmptySlots) {
      alert("이미지가 선택되지 않은 빈 슬롯이 있습니다. 이미지 파일을 선택하거나 빈 슬롯을 삭제해 주세요.");
      const uploadSection = document.getElementById("image-upload-section");
      if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    // 이미지가 하나도 없는 경우 (신규/수정 공통)
    if (imageItems.length === 0) {
      alert("최소 하나의 홍보 이미지를 필수로 등록해 주세요.");
      const uploadSection = document.getElementById("image-upload-section");
      if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    const hasNewUploads = imageItems.some(item => item.rawFile !== null);
    const isGitHubApiRequired = hasNewUploads;

    if (isGitHubApiRequired && !token) {
      alert(isEditMode ? "새로운 이미지를 추가/변경하시려면 GitHub 토큰을 입력해 주세요." : "신규 생성 시에는 이미지 업로드를 위해 GitHub 토큰이 필수입니다.");
      const tokenInput = document.getElementById("github-token-input");
      if (tokenInput) {
        tokenInput.scrollIntoView({ behavior: "smooth", block: "center" });
        tokenInput.focus();
      }
      return;
    }
  
    // 3. 저장하기 눌렀을 때 선택형 경우 검사 로직
    if (values.page_type === "selective") {
      const qs = values.questions || [];
      if (qs.length === 0) {
        alert("선택형 페이지의 경우 최소 1개 이상의 질문이 등록되어야 합니다.");
        return;
      }
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        if (!q.title || !q.title.trim()) {
          alert(`[질문 ${i + 1}] 질문 제목을 입력해 주세요.`);
          return;
        }
        if (q.type === "radio" || q.type === "checkbox") {
          const opts = q.options || [];
          if (opts.length === 0) {
            alert(`[질문 ${i + 1}: ${q.title}] 객관식 질문에는 최소 1개 이상의 답변 보기가 있어야 합니다.`);
            return;
          }
          for (let j = 0; j < opts.length; j++) {
            const opt = opts[j];
            if (!opt || !opt.text || !opt.text.trim()) {
              alert(`[질문 ${i + 1}]의 [보기 ${j + 1}] 내용을 입력해 주세요.`);
              return;
            }
            if (opt.order === undefined || opt.order === null || String(opt.order).trim() === "") {
              alert(`[질문 ${i + 1}]의 [보기 ${j + 1}] 순서 번호를 입력해 주세요.`);
              return;
            }
          }
        }
      }
    }
  
    const confirmMessage = isEditMode 
      ? "입력하신 내용으로 수정하시겠습니까?" 
      : "새로운 랜딩 페이지를 생성하시겠습니까?";
      
    if (!window.confirm(confirmMessage)) {
      return;
    }
  
    setLoading(true);
    try {
      if (hasNewUploads) {
        const getBase64 = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = (error) => reject(error);
          });
        };

        const headers = {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
        };

        // 1. 메인 브랜치의 최신 커밋(Ref) 정보 조회
        const refRes = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/main`,
          { headers }
        );
        if (!refRes.ok) throw new Error("GitHub Refs 정보를 가져오는데 실패했습니다.");
        const refData = await refRes.json();
        const parentCommitSha = refData.object.sha;

        // 2. 부모 커밋 정보를 상세 조회하여 트리(Tree) SHA 확인
        const commitRes = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits/${parentCommitSha}`,
          { headers }
        );
        if (!commitRes.ok) throw new Error("GitHub 커밋 정보를 가져오는데 실패했습니다.");
        const commitData = await commitRes.json();
        const baseTreeSha = commitData.tree.sha;

        // 3. 업로드 대상 파일 각각에 대해 GitHub Blob 생성
        const treeNodes = [];
        for (let idx = 0; idx < imageItems.length; idx++) {
          const item = imageItems[idx];
          if (item.rawFile) {
            const base64Content = await getBase64(item.rawFile);
            const blobRes = await fetch(
              `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs`,
              {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  content: base64Content,
                  encoding: 'base64',
                }),
              }
            );
            if (!blobRes.ok) throw new Error(`GitHub 이미지 [${idx + 1}번] 블롭 생성에 실패했습니다.`);
            const blobData = await blobRes.json();
            
            treeNodes.push({
              path: `public/assets/${fieldNameValue}_${idx}_pending.png`,
              mode: '100644',
              type: 'blob',
              sha: blobData.sha,
            });
          }
        }

        // 4. 새로운 파일 트리 생성
        const treeRes = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              base_tree: baseTreeSha,
              tree: treeNodes,
            }),
          }
        );
        if (!treeRes.ok) throw new Error("GitHub 새 트리 생성에 실패했습니다.");
        const treeData = await treeRes.json();
        const newTreeSha = treeData.sha;

        // 5. 단일 커밋(Atomic Commit) 생성
        const newCommitRes = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              message: `upload: ${fieldNameValue} 이미지 ${treeNodes.length}개 대기열 추가`,
              tree: newTreeSha,
              parents: [parentCommitSha],
            }),
          }
        );
        if (!newCommitRes.ok) throw new Error("GitHub 새 커밋 생성에 실패했습니다.");
        const newCommitData = await newCommitRes.json();
        const newCommitSha = newCommitData.sha;

        // 6. 메인 브랜치 Ref 업데이트
        const updateRefRes = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/main`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              sha: newCommitSha,
              force: false,
            }),
          }
        );
        if (!updateRefRes.ok) throw new Error("GitHub 메인 브랜치 업데이트에 실패했습니다.");
      }
  
      // 🔥 [정밀 수정] 렌더링 시 보존한 key 속성을 기준으로 파베 객체 필드명 최종 추출
      const dbFieldsObject: Record<string, any> = {};
      if (Array.isArray(values.fields)) {
        values.fields.forEach((f: any, index: number) => {
          let systemKey = "";
      
          if (f.key) {
            // hidden 아이템을 통해 name, phone 또는 기존 커스텀 필드명 키가 유실 없이 넘어온 경우 그대로 매핑
            systemKey = f.key.trim();
          } else {
            // 새로 추가한 필드(f.key가 없는 신규 항목)는 고정 필드 2개를 예외 처리하여 field_3부터 넘버링 부여
            systemKey = `field_${index + 1}`;
          }
          
          dbFieldsObject[systemKey] = {
            label: f.label || "",
            type: f.type || "text",
            show: f.show !== undefined ? !!f.show : true,
            required: f.required !== undefined ? !!f.required : true
          };
        });
      }

      // 최종 이미지 URL 목록 구성
      const dbImagesList = imageItems.map((item, idx) => {
        if (item.rawFile) {
          return `/assets/${fieldNameValue}_${idx}.png`;
        }
        return item.existingUrl || "";
      }).filter(Boolean);
 
      const savePayload = {
        ...values,
        name: fieldNameValue, 
        top_image_url: dbImagesList[0] || "",
        images: dbImagesList,
        fields: dbFieldsObject, 
        questions: values.page_type === "selective" ? (values.questions || []) : [],
        created_at: isEditMode ? (form.getFieldValue("created_at") || serverTimestamp()) : serverTimestamp(),
        updated_at: serverTimestamp(),
      };
 
      await setDoc(doc(db, "survey_list", targetDocId), savePayload);
  
      let alertText = isGitHubApiRequired ? "저장되었습니다." : "수정되었습니다.";
      alertText += " 이미지 처리는 일정 시간이 소요됩니다.";
      alert(alertText);
 
      onBack();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "저장 실패");
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = ({ errorFields }: any) => {
    if (errorFields && errorFields.length > 0) {
      const firstErrorMessage = errorFields[0].errors[0];
      alert(`${firstErrorMessage}`);
    }
  };

  const SectionHeader = ({ num, title }: { num: string; title: string }) => (
    <div style={{ backgroundColor: "#ebf7ee", padding: "10px 16px", borderRadius: "6px", marginTop: 36, marginBottom: 16, borderLeft: "4px solid #27ae60" }}>
      <Text strong style={{ fontSize: "16px", color: "#1e7e43" }}>{num}. {title}</Text>
    </div>
  );

  return (
    <div style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto" }}>
      <Button icon={<ArrowLeft size={14} />} onClick={onBack} style={{ marginBottom: 20 }}>목록으로</Button>
      
      <Card variant="borderless" className="shadow-sm">
        <Title level={3}>{id ? "상세 내용 수정" : "새 랜딩 페이지 추가"}</Title>
        <Divider style={{ margin: "12px 0 24px 0" }} />

        {/* GitHub Token 입력란 */}
        <div style={{ marginBottom: "28px", padding: "16px", backgroundColor: "#f4f7fa", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <KeyIcon size={16} style={{ color: '#4a5568' }} /> 
            <span style={{ fontSize: '14px', fontWeight: '600' }}>GitHub Personal Access Token</span>
          </label>
          <input 
            id="github-token-input"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_ 로 시작하는 토큰을 입력하세요"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '14px' }}
          />
          <div style={{ marginTop: '10px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
            <AlertCircle size={14} style={{ color: '#64748b', marginTop: '2px' }} />
            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
              <strong style={{ color: '#334155' }}>💡 언제 입력해야 하나요?</strong><br />
              • <span style={{ color: '#2563eb', fontWeight: '600' }}>새로 만들 때</span> : 이미지 전송이 필요하므로 <strong>필수 입력</strong>입니다.<br />
              • <span style={{ color: '#16a34a', fontWeight: '600' }}>이미지를 수정할 때</span> <strong>(이미지 교체 안 하면 비워두셔도 됩니다)</strong>
            </div>
          </div>
        </div>

        <Form 
          form={form} 
          layout="vertical" 
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          scrollToFirstError={{ behavior: 'smooth', block: 'center', focus: true }}
        >

          {/* 설문지명 입력란 */}
          <Form.Item 
            name="name" 
            label="설문지명" 
            validateTrigger="onBlur"
            rules={[
              { required: true, message: "설문지명은 필수 항목입니다." },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: "영문, 숫자, _, - 만 가능합니다." },
              { validator: checkDuplicateName }
            ]}
          >
            <Input 
              placeholder="예: survey_pharm_start" 
              disabled={!!id} 
            />
          </Form.Item>

          {/* 페이지 타입 선택 */}
          <Form.Item 
            name="page_type" 
            label="페이지 타입" 
            rules={[{ required: true }]}
          >
            <Radio.Group onChange={(e) => {
              const val = e.target.value;
              if (val === "selective") {
                const currentQs = form.getFieldValue("questions");
                if (!currentQs || currentQs.length === 0) {
                  form.setFieldsValue({
                    questions: [{ title: "", type: "radio", options: [{ text: "", order: 1 }] }]
                  });
                }
              }
            }}>
              <Radio value="normal">일반형</Radio>
              <Radio value="selective">선택형</Radio>
            </Radio.Group>
          </Form.Item>

          {/* 1. 상단 홍보 이미지 설정 (N개 등록 가능) */}
          <SectionHeader num="1" title="상단 홍보 이미지 설정 (N개 등록 가능)" />
          <Form.Item name="show_top_image" valuePropName="checked">
            <Checkbox>상단 이미지 영역 노출</Checkbox>
          </Form.Item>

          <div id="image-upload-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {imageItems.map((item, idx) => (
              <Card 
                size="small" 
                key={item.id} 
                style={{ backgroundColor: '#fbfbfb', border: '1px solid #f0f0f0' }}
                title={
                  <Space>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>📷 이미지 {idx + 1}</span>
                  </Space>
                }
                extra={
                  <Space>
                    <Button 
                      size="small" 
                      disabled={idx === 0} 
                      onClick={() => moveImageItem(idx, 'up')}
                    >
                      ▲ 위로
                    </Button>
                    <Button 
                      size="small" 
                      disabled={idx === imageItems.length - 1} 
                      onClick={() => moveImageItem(idx, 'down')}
                    >
                      ▼ 아래로
                    </Button>
                    <Button 
                      size="small" 
                      danger 
                      onClick={() => removeImageItem(idx)}
                    >
                      삭제
                    </Button>
                  </Space>
                }
              >
                <Row gutter={[16, 12]} align="middle">
                  <Col xs={24} sm={10}>
                    <Upload 
                      beforeUpload={(file) => {
                        handleImageUpload(idx, file);
                        return false; 
                      }} 
                      showUploadList={false}
                    >
                      <Button icon={<UploadIcon size={12} />} size="small">
                        {item.previewUrl || item.existingUrl ? "이미지 변경" : "이미지 선택"}
                      </Button>
                    </Upload>
                  </Col>
                  <Col xs={24} sm={14} style={{ display: 'flex', justifyContent: 'center' }}>
                    {item.previewUrl ? (
                      <Image 
                        src={item.previewUrl} 
                        alt={`이미지 ${idx + 1} 미리보기`} 
                        style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }} 
                        preview={{ wheelZoom: true, minScale: 1, maxScale: 10 } as any}
                      />
                    ) : item.existingUrl ? (
                      <Image 
                        src={getImgSrc(item.existingUrl) + `?v=${timestamp}`} 
                        alt={`이미지 ${idx + 1} 미리보기`} 
                        style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }} 
                        preview={{ wheelZoom: true, minScale: 1, maxScale: 10 } as any}
                      />
                    ) : (
                      <div style={{ padding: '20px', color: '#999', backgroundColor: '#f0f0f0', borderRadius: 4, fontSize: '11px' }}>
                        선택된 이미지가 없습니다.
                      </div>
                    )}
                  </Col>
                </Row>
              </Card>
            ))}

            <Button 
              type="dashed" 
              onClick={addImageItem} 
              block 
              icon={<Plus size={14} />}
              style={{ height: '40px' }}
            >
              홍보 이미지 추가하기
            </Button>
          </div>

          {/* 제목 및 소제목 설정 */}
          <Card size="small" style={{ marginTop: 20, backgroundColor: '#fcfcfc' }}>
            <Row gutter={16} align="middle">
              <Col span={5}>
                <Form.Item name="show_title" valuePropName="checked" noStyle>
                  <Checkbox>제목 노출</Checkbox>
                </Form.Item>
              </Col>
              <Col span={19}>
                <Form.Item name="title" label="메인 제목" style={{ marginBottom: 12 }}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16} align="middle">
              <Col span={5}>
                <Form.Item name="show_subtitle" valuePropName="checked" noStyle>
                  <Checkbox>소제목 노출</Checkbox>
                </Form.Item>
              </Col>
              <Col span={19}>
                <Form.Item name="subtitle" label="소제목 (혜택 강조 문구)" style={{ marginBottom: 0 }}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 2. 입력 필드 설정 */}
          <SectionHeader num="2" title="입력 폼 필드 설정" />
          <Form.List name="fields">
            {(fields, { add, remove }) => {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {fields.map((field, index) => {
                    const isFixed = index < 2;

                    return (
                      <Card 
                        size="small" 
                        style={{ backgroundColor: isFixed ? '#f5f5f5' : '#fbfbfb', border: isFixed ? '1px solid #d9d9d9' : '1px solid #f0f0f0' }} 
                        key={field.key}
                        actions={
                          !isFixed && fields.length > 2 ? [
                            <Button 
                              type="text" 
                              danger 
                              icon={<Trash2 size={14} />} 
                              onClick={() => remove(field.name)}
                              style={{ display: 'flex', alignItems: 'center', margin: '0 auto', gap: '4px' }}
                            >
                              필드 삭제
                            </Button>
                          ] : undefined
                        }
                      >
                        {/* 🌟 [핵심 수정]: 폼 데이터를 전송할 때 고유 키(name, phone, pharmacy 등)가 날아가지 않도록 hidden 필드로 매핑 */}
                        <Form.Item name={[field.name, 'key']} hidden>
                          <Input />
                        </Form.Item>

                        {isFixed && (
                          <div style={{ fontSize: '11px', color: '#8c8c8c', marginBottom: '6px', fontWeight: 'bold' }}>
                            📌 시스템 기본 고정 필드
                          </div>
                        )}

                        <Row gutter={[16, 12]} align="middle">
                          {/* 라벨명 입력란 */}
                          <Col xs={24} sm={10}>
                            <Form.Item
                              name={[field.name, 'label']}
                              rules={[{ required: true, message: '화면에 표시할 라벨명은 필수입니다.' }]}
                              style={{ margin: 0 }}
                            >
                              <Input placeholder="라벨명" disabled={isFixed} />
                            </Form.Item>
                          </Col>
                          
                          {/* 입력 타입 선택 */}
                          <Col xs={24} sm={6}>
                            <Form.Item
                              name={[field.name, 'type']}
                              rules={[{ required: true }]}
                              style={{ margin: 0 }}
                            >
                              <Select placeholder="입력 타입 선택" disabled={isFixed}>
                                <Option value="text">일반 텍스트</Option>
                                <Option value="number">숫자 (전화번호 등)</Option>
                                <Option value="email">이메일 주소</Option>
                              </Select>
                            </Form.Item>
                          </Col>

                          <Col xs={12} sm={4} style={{ textAlign: 'center' }}>
                            <Form.Item name={[field.name, 'show']} valuePropName="checked" style={{ margin: 0 }}>
                              <Checkbox disabled={isFixed}>노출 여부</Checkbox>
                            </Form.Item>
                          </Col>
                          
                          <Col xs={12} sm={4} style={{ textAlign: 'center' }}>
                            <Form.Item name={[field.name, 'required']} valuePropName="checked" style={{ margin: 0 }}>
                              <Checkbox disabled={isFixed}>필수 지정</Checkbox>
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    );
                  })}
                  
                  {fields.length < 10 ? (
                    <Button 
                      type="dashed" 
                      onClick={() => add({ show: true, required: false, type: "text", label: "" })} 
                      block 
                      icon={<Plus size={14} />}
                      style={{ height: '45px', marginTop: '4px' }}
                    >
                      새로운 입력 필드 추가하기 ({fields.length}/10)
                    </Button>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#ff4d4f', fontSize: '13px', padding: '10px', backgroundColor: '#fff2f0', borderRadius: '6px', border: '1px dashed #ffccc7' }}>
                      ⚠️ 입력 폼 필드는 최대 10개까지만 등록할 수 있습니다.
                    </div>
                  )}
                </div>
              );
            }}
          </Form.List>

          {/* 3. 질문 및 답변 설정 (선택형일 때만 노출) */}
          {pageType === "selective" && (
            <>
              <SectionHeader num="3" title="질문 및 답변 설정" />
              <Form.List name="questions">
                {(qFields, { add: addQ, remove: removeQ, move: moveQ }) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: 20 }}>
                    {qFields.map((qField, qIndex) => (
                      <div
                        key={qField.key}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("drag-type", "question");
                          e.dataTransfer.setData("drag-index", qIndex.toString());
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const type = e.dataTransfer.getData("drag-type");
                          if (type === "question") {
                            const fromIndex = parseInt(e.dataTransfer.getData("drag-index"), 10);
                            const toIndex = qIndex;
                            if (fromIndex !== toIndex) {
                              moveQ(fromIndex, toIndex);
                            }
                          }
                        }}
                      >
                        <Card
                          size="small"
                          title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <GripVertical size={16} style={{ color: '#bfbfbf', cursor: 'grab' }} />
                              <span>질문 {qIndex + 1} (드래그하여 순서 변경 가능)</span>
                            </div>
                          }
                          style={{ backgroundColor: '#fafafa', border: '1px solid #d9d9d9' }}
                          actions={[
                            <Button
                              type="text"
                              danger
                              icon={<Trash2 size={14} />}
                              onClick={() => removeQ(qField.name)}
                              style={{ display: 'flex', alignItems: 'center', margin: '0 auto', gap: '4px' }}
                            >
                              질문 삭제
                            </Button>
                          ]}
                        >
                          <Form.Item
                            name={[qField.name, 'title']}
                            label="질문 제목"
                            rules={[{ required: true, message: '질문 제목을 입력해주세요.' }]}
                            style={{ marginBottom: 12 }}
                          >
                            <Input placeholder="예: 약국 운영 형태를 선택해 주세요." />
                          </Form.Item>

                          <Form.Item
                            name={[qField.name, 'type']}
                            label="질문 유형"
                            initialValue="radio"
                            rules={[{ required: true }]}
                            style={{ marginBottom: 12 }}
                          >
                            <Select>
                              <Option value="radio">객관식 (단일 선택)</Option>
                              <Option value="checkbox">객관식 (다중 선택)</Option>
                              <Option value="text">주관식 (텍스트 입력)</Option>
                            </Select>
                          </Form.Item>

                          {/* 질문 유형이 radio나 checkbox일 때만 보기(옵션) 입력 UI 노출 */}
                          <Form.Item
                            noStyle
                            shouldUpdate={(prevValues, currentValues) => {
                              const prevType = prevValues?.questions?.[qField.name]?.type;
                              const currentType = currentValues?.questions?.[qField.name]?.type;
                              return prevType !== currentType;
                            }}
                          >
                            {({ getFieldValue }) => {
                              const type = getFieldValue(['questions', qField.name, 'type']) || 'radio';
                              if (type === 'text') return null;

                              return (
                                <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
                                  <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>답변 보기 설정 (드래그하여 순서 변경 가능)</div>
                                  <Form.List name={[qField.name, 'options']}>
                                    {(optFields, { add: addOpt, remove: removeOpt, move: moveOpt }) => (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {optFields.map((optField, optIndex) => (
                                          <Row
                                            gutter={8}
                                            key={optField.key}
                                            align="middle"
                                            draggable
                                            onDragStart={(e) => {
                                              e.stopPropagation();
                                              e.dataTransfer.setData("drag-type", "option");
                                              e.dataTransfer.setData("drag-index", optIndex.toString());
                                            }}
                                            onDragOver={(e) => {
                                              e.preventDefault();
                                            }}
                                            onDrop={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              const type = e.dataTransfer.getData("drag-type");
                                              if (type === "option") {
                                                const fromIndex = parseInt(e.dataTransfer.getData("drag-index"), 10);
                                                const toIndex = optIndex;
                                                if (fromIndex !== toIndex) {
                                                  moveOpt(fromIndex, toIndex);
                                                  setTimeout(() => {
                                                    const updatedQs = form.getFieldValue("questions") || [];
                                                    const updatedOpts = updatedQs[qIndex]?.options || [];
                                                    updatedOpts.forEach((opt: any, idx: number) => {
                                                      if (opt) opt.order = idx + 1;
                                                    });
                                                    form.setFieldsValue({ questions: updatedQs });
                                                  }, 0);
                                                }
                                              }
                                            }}
                                            style={{ padding: '6px 0', borderBottom: '1px dashed #f0f0f0' }}
                                          >
                                            {/* 드래그 핸들 */}
                                            <Col span={2} style={{ display: 'flex', justifyContent: 'center', cursor: 'grab' }}>
                                              <GripVertical size={16} style={{ color: '#bfbfbf' }} />
                                            </Col>
                                            <Col span={4}>
                                              <Form.Item
                                                name={[optField.name, 'order']}
                                                rules={[{ required: true, message: '순서는 필수입니다.' }]}
                                                style={{ margin: 0 }}
                                              >
                                                <Input type="number" placeholder="순서" style={{ textAlign: 'center' }} disabled />
                                              </Form.Item>
                                            </Col>
                                            <Col span={14}>
                                              <Form.Item
                                                name={[optField.name, 'text']}
                                                rules={[{ required: true, message: '보기 내용을 입력해주세요.' }]}
                                                style={{ margin: 0 }}
                                              >
                                                <Input placeholder={`보기 ${optIndex + 1} 내용`} />
                                              </Form.Item>
                                            </Col>
                                            <Col span={4}>
                                              <Button
                                                danger
                                                type="text"
                                                icon={<Trash2 size={14} />}
                                                onClick={() => {
                                                  removeOpt(optField.name);
                                                  setTimeout(() => {
                                                    const updatedQs = form.getFieldValue("questions") || [];
                                                    const updatedOpts = updatedQs[qIndex]?.options || [];
                                                    updatedOpts.forEach((opt: any, idx: number) => {
                                                      if (opt) opt.order = idx + 1;
                                                    });
                                                    form.setFieldsValue({ questions: updatedQs });
                                                  }, 0);
                                                }}
                                                disabled={optFields.length <= 1} // 최소 1개는 유지
                                              />
                                            </Col>
                                          </Row>
                                        ))}
                                        <Button
                                          type="dashed"
                                          onClick={() => addOpt({ text: '', order: optFields.length + 1 })}
                                          icon={<Plus size={12} />}
                                          size="small"
                                          style={{ marginTop: '4px' }}
                                        >
                                          보기 추가
                                        </Button>
                                      </div>
                                    )}
                                  </Form.List>
                                </div>
                              );
                            }}
                          </Form.Item>
                        </Card>
                      </div>
                    ))}

                    <Button
                      type="dashed"
                      onClick={() => addQ({ title: '', type: 'radio', options: [{ text: '', order: 1 }] })}
                      icon={<Plus size={14} />}
                      style={{ height: '45px' }}
                    >
                      새로운 질문 추가하기
                    </Button>
                  </div>
                )}
              </Form.List>
            </>
          )}

          {/* 3. 개인정보 동의 영역 */}
          <SectionHeader num={pageType === "selective" ? "4" : "3"} title="개인정보 동의 영역" />
          {["terms_privacy", "terms_third_party"].map((tKey) => (
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fbfbfb' }} key={tKey}>
              <Form.Item name={[tKey, "show"]} valuePropName="checked" style={{ marginBottom: 8 }}>
                <Checkbox>
                  <strong>{tKey.includes('privacy') ? '수집·이용' : '제3자 제공'} 노출</strong>
                </Checkbox>
              </Form.Item>
              <Form.Item name={[tKey, "title"]} label="제목" style={{ marginBottom: 8 }}><Input /></Form.Item>
              <Form.Item name={[tKey, "content"]} label="내용" style={{ marginBottom: 0 }}><TextArea rows={3} /></Form.Item>
            </Card>
          ))}

          {/* 4. 하단 스타일 및 문구 */}
          <SectionHeader num={pageType === "selective" ? "5" : "4"} title="하단 스타일 및 문구" />
          
          <Card size="small" style={{ border: '2px solid #27ae60', backgroundColor: '#f6ffed', marginBottom: 20 }}>
            <Form.Item 
              name="submit_button_text" 
              label={<Text strong style={{ color: '#1e7e43', fontSize: 15 }}>제출 버튼 문구</Text>}
              rules={[{ required: true, message: "버튼 문구는 필수입니다." }]}
              style={{ marginBottom: 0 }}
            >
              <Input size="large" style={{ fontWeight: 'bold' }} placeholder="버튼에 표시될 문구를 입력하세요" />
            </Form.Item>
          </Card>

          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fff1f0', borderColor: '#ffa39e' }}>
            <Row gutter={16} align="middle">
              <Col span={5}>
                <Form.Item name="show_disagree_notice" valuePropName="checked" noStyle>
                  <Checkbox><Text type="danger" strong>경고 노출</Text></Checkbox>
                </Form.Item>
              </Col>
              <Col span={19}>
                <Form.Item 
                  name="disagree_notice_text" 
                  label={<Text type="danger" style={{ fontSize: '12px' }}>미동의 시 안내 (빨간색 문구)</Text>} 
                  style={{ margin: 0 }}
                >
                  <Input style={{ color: '#cf1322', fontWeight: '500' }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fbfbfb' }}>
            <Row gutter={16} align="middle">
              <Col span={5}>
                <Form.Item name="show_footer_notice1" valuePropName="checked" noStyle><Checkbox>하단 노출1</Checkbox></Form.Item>
              </Col>
              <Col span={19}>
                <Form.Item name="footer_notice_text1" label="최하단 안내 문구1" style={{ margin: 0 }}><Input /></Form.Item>
              </Col>
            </Row>
          </Card>

          <Card size="small" style={{ backgroundColor: '#fbfbfb' }}>
            <Row gutter={16} align="middle">
              <Col span={5}>
                <Form.Item name="show_footer_notice2" valuePropName="checked" noStyle><Checkbox>하단 노출2</Checkbox></Form.Item>
              </Col>
              <Col span={19}>
                <Form.Item name="footer_notice_text2" label="최하단 안내 문구2" style={{ margin: 0 }}><Input /></Form.Item>
              </Col>
            </Row>
          </Card>

          <div style={{ display: 'flex', gap: '10px', marginTop: 40 }}>
            {/* 목록으로 버튼 (50%) */}
            <Button 
              icon={<ArrowLeft size={14} />} 
              onClick={onBack} 
              style={{ 
                flex: 1, 
                height: 50, 
                fontSize: 17, 
                fontWeight: 'bold' 
              }}
            >
              목록으로
            </Button>

            {/* 저장하기 버튼 (50%) */}
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              style={{ 
                flex: 1, 
                backgroundColor: '#27ae60', 
                borderColor: '#27ae60', 
                height: 50, 
                fontSize: 17, 
                fontWeight: 'bold' 
              }}
            >
              저장하기
            </Button>
          </div>

        </Form>
      </Card>
    </div>
  );
}