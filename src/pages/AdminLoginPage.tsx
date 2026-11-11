import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Input, Typography } from "antd";
import { setAccessAuthed } from "../lib/accessAuth";

const { Text } = Typography;
const PASSWORD = import.meta.env.VITE_ACCESS_LOG_PASSWORD as string | undefined;

/** 관리자 로그인. 성공하면 헤더에 '방문자 모니터링' 메뉴가 나타난다. */
export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!PASSWORD) {
      setError("VITE_ACCESS_LOG_PASSWORD 환경변수가 설정되지 않았습니다.");
      return;
    }
    if (value !== PASSWORD) {
      setError("비밀번호가 올바르지 않습니다.");
      return;
    }
    setAccessAuthed(true);
    navigate("/access-logs", { replace: true });
  };

  return (
    <div style={{ width: "100%", maxWidth: 360, margin: "10vh auto", padding: 16, boxSizing: "border-box" }}>
      <Card title="관리자 로그인">
        <Input.Password
          placeholder="비밀번호"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPressEnter={submit}
        />
        {error && <Text type="danger">{error}</Text>}
        <Button type="primary" block style={{ marginTop: 12 }} onClick={submit}>
          로그인
        </Button>
      </Card>
    </div>
  );
}
