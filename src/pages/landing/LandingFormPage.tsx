import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase"; 
import { Form, Input, Button, Card, Checkbox, Space, Typography, Divider, Row, Col, Upload, Image } from "antd"; 
import { ArrowLeft, Eye, Upload as UploadIcon, Key as KeyIcon, AlertCircle } from "lucide-react"; 

const { Title, Text } = Typography;
const { TextArea } = Input;

const DEFAULT_FORM_VALUES = {
  name: "",
  show_title: true,
  title: "팜스타트 대행 서비스 신청",
  subtitle: "현재 팜스타트 패키지 신청 시 39만원 이상 절감 혜택 제공 중!",
  show_subtitle: true,
  show_top_image: true,
  top_image_url: "",
  fields: {
    name: { label: "성함", show: true, required: true },
    phone: { label: "연락처", show: true, required: true },
    pharmacy: { label: "약국명", show: true, required: true },
  },
  terms_privacy: { 
    title: "개인정보 수집 및 이용 동의 (필수)", 
    show: true, 
    content: "수집 업체 : 데일리팜\n수집 목적 : SNS 온라인 대행 6개월 패키지 상담 정보 제공\n수집 항목 : 성명/약국명/연락처\n보관 기간 : 신청 후 1년" 
  },
  terms_third_party: { 
    title: "개인정보 제3자 제공 동의 (필수)", 
    show: true, 
    content: "제공받는 자 : 킹메이커\n이용 목적 : SNS 온라인 대행 운영 및 service 광고 및 마케팅\n수집 항목 : 성명/약국명/연락처\n보유 및 이용 기간 : 목적 달성 시까지 (관련 법령에 따라 보관 후 삭제)" 
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

export default function LandingFormPage({ id, onBack }: { id?: string; onBack: () => void }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false); 
  const [timestamp, setTimestamp] = useState(new Date().getTime()); 
  const [token, setToken] = useState(""); 
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); 
  const [rawFile, setRawFile] = useState<File | null>(null); 
  
  // ✅ 최적화 1: useWatch를 제거하고, 이미지 미리보기에 필요한 name만 별도 state로 관리
  const [currentName, setCurrentName] = useState("");

  // 1. 데이터 로드 파트
  useEffect(() => {
    const initForm = async () => {
      setLoading(true);
      try {
        if (id) {
          const docRef = doc(db, "survey_list", id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            form.setFieldsValue({
              ...DEFAULT_FORM_VALUES,
              ...data, 
              fields: { ...DEFAULT_FORM_VALUES.fields, ...data.fields },
              terms_privacy: { ...DEFAULT_FORM_VALUES.terms_privacy, ...data.terms_privacy },
              terms_third_party: { ...DEFAULT_FORM_VALUES.terms_third_party, ...data.terms_third_party },
            });
            // ✅ 수정 모드일 때 기존 name 저장
            setCurrentName(data.name || "");
          }
        } else {
          form.setFieldsValue(DEFAULT_FORM_VALUES);
          setCurrentName("");
        }
      } catch (error) {
        alert("데이터 로드에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    initForm();
  }, [id, form]);

  // ✅ 최적화 2: name이 실제로 확정(포커스 아웃)되거나 변경될 때만 이미지 상태 초기화
  const handleNameChange = (val: string) => {
    const trimmed = val.trim();
    setCurrentName(trimmed);
    setImgError(false);
    setTimestamp(new Date().getTime());
    setPreviewUrl(null); 
    setRawFile(null);
  };

  // 2. 중복 체크 커스텀 벨리데이션 펑션
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

  // 3. 저장하기 파트
  const onFinish = async (values: any) => {
    const fieldNameValue = values.name ? values.name.trim() : "";
    
    if (!fieldNameValue) {
      return alert("설문지명 값이 누락되었습니다.");
    }
  
    const targetDocId = id ? id.trim() : fieldNameValue;
    const finalImageUrl = `/assets/${fieldNameValue}.png`;
    const isEditMode = !!id;
    const isImageChanged = !!rawFile; 
    const isGitHubApiRequired = !isEditMode || isImageChanged; 
  
    if (isGitHubApiRequired && !token) {
      alert(isEditMode ? "이미지를 변경하시려면 GitHub 토큰을 입력해 주세요." : "신규 생성 시에는 이미지 업로드를 위해 GitHub 토큰이 필수입니다.");
      const tokenInput = document.getElementById("github-token-input");
      if (tokenInput) {
        tokenInput.scrollIntoView({ behavior: "smooth", block: "center" });
        tokenInput.focus();
      }
      return;
    }
  
    if (!isEditMode && !rawFile) {
      alert("새로운 랜딩 페이지를 만들 때는 상단 이미지를 필수로 선택해 주세요.");
      const uploadSection = document.getElementById("image-upload-section");
      if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
  
    // 🔥 [추가] 최종 저장/수정 여부 컨펌창 블록
    const confirmMessage = isEditMode 
      ? "입력하신 내용으로 수정하시겠습니까?" 
      : "새로운 랜딩 페이지를 생성하시겠습니까?";
      
    if (!window.confirm(confirmMessage)) {
      return; // 사용자가 '취소'를 누르면 여기서 함수를 종료하여 진행을 막습니다.
    }
  
    setLoading(true);
    try {
      if (isGitHubApiRequired && rawFile) {
        const getBase64 = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = (error) => reject(error);
          });
        };
  
        const base64Content = await getBase64(rawFile);
        const filePath = `public/assets/${fieldNameValue}_pending.png`;
  
        const gitRes = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `token ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: `upload: ${fieldNameValue} 랜딩 이미지 대기열 추가`,
              content: base64Content,
              branch: "main"
            }),
          }
        );
  
        if (!gitRes.ok) {
          throw new Error("GitHub 이미지 등록에 실패했습니다. 토큰 권한을 확인해주세요.");
        }
      }
  
      const savePayload = {
        ...values,
        name: fieldNameValue, 
        top_image_url: finalImageUrl,
        created_at: isEditMode ? (form.getFieldValue("created_at") || serverTimestamp()) : serverTimestamp(),
        updated_at: serverTimestamp(),
      };
  
      await setDoc(doc(db, "survey_list", targetDocId), savePayload, { merge: true });
  
      let alertText = isGitHubApiRequired ? "저장되었습니다." : "수정되었습니다." + " 이미지 처리는 일정 시간이 소요됩니다.";
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

        {/* GitHub Personal Access Token 입력란 */}
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
              • <span style={{ color: '#16a34a', fontWeight: '600' }}>기존 글 수정할 때</span> : 이미지를 바꿀 때만 입력합니다. <strong>(교체 안 하면 비워두셔도 됩니다)</strong>
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
            validateTrigger="onBlur" // 포커스가 나갈 때 validation 실행
            rules={[
              { required: true, message: "설문지명은 필수 항목입니다." },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: "영문, 숫자, _, - 만 가능합니다." },
              { validator: checkDuplicateName }
            ]}
          >
            {/* ✅ 최적화 3: 타이핑할 때는 닥치고 입력만 받고, 포커스가 빠져나갈 때(onBlur)만 한 번 state 변경 */}
            <Input 
              placeholder="예: survey_pharm_start" 
              disabled={!!id} 
              onBlur={(e) => handleNameChange(e.target.value)} 
            />
          </Form.Item>

          {/* 1. 상단 비주얼 영역 */}
          <SectionHeader num="1" title="상단 비주얼 영역" />
          <Form.Item name="show_top_image" valuePropName="checked">
            <Checkbox>상단 이미지 영역 노출</Checkbox>
          </Form.Item>
          
          <Space id="image-upload-section" orientation="vertical" style={{ width: '100%' }} size="middle">
            <Upload 
              beforeUpload={(file) => {
                setImgError(false);
                setTimestamp(new Date().getTime());
                setRawFile(file);
                const objectUrl = URL.createObjectURL(file);
                setPreviewUrl(objectUrl);
                // alert(`파일 지정 완료: ${file.name}`);
                return false; 
              }} 
              showUploadList={false}
            >
              <Button icon={<UploadIcon size={14} />}>이미지 파일 선택 (교체 시에만 클릭)</Button>
            </Upload>
            
            <div style={{ padding: "16px", border: "1px dashed #d9d9d9", borderRadius: 4, textAlign: 'center', backgroundColor: '#fafafa', marginBottom: 20 }}>
              <div style={{ marginBottom: 8 }}><Eye size={12} /> <Text type="secondary" style={{ fontSize: 12 }}>이미지 미리보기 상태</Text></div>
              
              {/* ✅ 최적화 4: 무거운 전체 관찰(collectionName) 대신 가벼운 currentName state 사용 */}
              {!currentName || imgError ? (
                <div style={{ padding: "30px 0", color: "#999", backgroundColor: "#f0f0f0", borderRadius: 4, border: "1px solid #e8e8e8" }}>
                  <Text type="secondary" strong style={{ display: "block", marginBottom: 4 }}>[ 이미지 없음 ]</Text>
                  <Text type="secondary" style={{ fontSize: "11px" }}>프로젝트의 /public/assets/{currentName || "시스템명"}.png 경로에 파일을 배치해 주세요.</Text>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                  <Image 
                    src={previewUrl || `${import.meta.env.BASE_URL}assets/${currentName}.png?v=${timestamp}`} 
                    alt="상단 비주얼 영역 미리보기" 
                    style={{ maxHeight: 160, maxWidth: '100%', objectFit: 'contain' }}
                    onError={() => {
                      if (!previewUrl) setImgError(true);
                    }} 
                    preview={{ wheelZoom: true, minScale: 1, maxScale: 10 } as any}
                  />
                </div>
              )}
            </div>
          </Space>

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
          {["name", "phone", "pharmacy"].map((fKey) => (
            <Card size="small" style={{ marginBottom: 12, backgroundColor: '#fbfbfb' }} key={fKey}>
              <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                <Form.Item name={["fields", fKey, "show"]} valuePropName="checked" style={{ margin: 0 }}><Checkbox>노출</Checkbox></Form.Item>
                <Form.Item name={["fields", fKey, "required"]} valuePropName="checked" style={{ margin: 0 }}><Checkbox>필수</Checkbox></Form.Item>
                <Form.Item name={["fields", fKey, "label"]} style={{ margin: 0, flex: 1 }}><Input placeholder="라벨명" /></Form.Item>
              </div>
            </Card>
          ))}

          {/* 3. 개인정보 동의 영역 */}
          <SectionHeader num="3" title="개인정보 동의 영역" />
          {["terms_privacy", "terms_third_party"].map((tKey) => (
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fbfbfb' }} key={tKey}>
              <Form.Item name={[tKey, "show"]} valuePropName="checked" style={{ marginBottom: 8 }}>
                {/* text나 strong을 체크박스 안으로 격리시킵니다 */}
                <Checkbox>
                  <strong>{tKey.includes('privacy') ? '수집·이용' : '제3자 제공'} 노출</strong>
                </Checkbox>
              </Form.Item>
              <Form.Item name={[tKey, "title"]} label="제목" style={{ marginBottom: 8 }}><Input /></Form.Item>
              <Form.Item name={[tKey, "content"]} label="내용" style={{ marginBottom: 0 }}><TextArea rows={3} /></Form.Item>
            </Card>
          ))}

          {/* 4. 하단 스타일 및 문구 */}
          <SectionHeader num="4" title="하단 스타일 및 문구" />
          
          <Card size="small" style={{ border: '2px solid #27ae60', backgroundColor: '#f6ffed', marginBottom: 20 }}>
            <Form.Item 
              name="submit_button_text" 
              label={<Text strong style={{ color: '#1e7e43', fontSize: 15 }}>[중요] 제출 버튼 문구</Text>}
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
                  style={{ marginBottom: 0 }}
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
                <Form.Item name="footer_notice_text1" label="최하단 안내 문구1" style={{ marginBottom: 0 }}><Input /></Form.Item>
              </Col>
            </Row>
          </Card>

          <Card size="small" style={{ backgroundColor: '#fbfbfb' }}>
            <Row gutter={16} align="middle">
              <Col span={5}>
                <Form.Item name="show_footer_notice2" valuePropName="checked" noStyle><Checkbox>하단 노출2</Checkbox></Form.Item>
              </Col>
              <Col span={19}>
                <Form.Item name="footer_notice_text2" label="최하단 안내 문구2" style={{ marginBottom: 0 }}><Input /></Form.Item>
              </Col>
            </Row>
          </Card>

          <Button type="primary" htmlType="submit" loading={loading} block style={{ backgroundColor: '#27ae60', borderColor: '#27ae60', marginTop: 40, height: 50, fontSize: 17, fontWeight: 'bold' }}>
            저장하기
          </Button>
        </Form>
      </Card>
    </div>
  );
}