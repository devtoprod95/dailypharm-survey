import { Navigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where, writeBatch,
} from "firebase/firestore";
import { Button, Input, Popconfirm, Switch, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { db } from "../lib/firebase";
import { ACCESS_LOG_COLLECTION, IP_SETTING_COLLECTION, getClientIp } from "../lib/tracker";
import { getPageTitle } from "../lib/pageTitles";
import { ACCESS_AUTH_EVENT, isAccessAuthed, setAccessAuthed } from "../lib/accessAuth";

const { Title, Text } = Typography;

const MAX_LOGS = 2000;

interface AccessLog {
  id: string;
  type: "page" | "action";
  ip: string;
  path: string;
  title: string;
  action: string;
  detail: string;
  userAgent: string;
  time: Date | null;
}

interface IpGroup {
  ip: string;
  count: number;
  pageCount: number;
  actionCount: number;
  lastAt: Date | null;
  excluded: boolean;
  logs: AccessLog[];
}

/** 날짜(위) / 시각(아래) 두 줄로 표시 */
const fmt = (d: Date | null) =>
  d ? (
    <div style={{ lineHeight: 1.4 }}>
      <div>{d.toLocaleDateString("ko-KR")}</div>
      <div>{d.toLocaleTimeString("ko-KR", { hour12: false })}</div>
    </div>
  ) : (
    "-"
  );

function LogView() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  // IP → 텔레그램 알림 여부 (설정 문서가 없으면 true)
  // IP → 모니터링(로그 기록) 제외 여부
  const [excluded, setExcluded] = useState<Record<string, boolean>>({});
  const [newIp, setNewIp] = useState("");
  const [msg, msgHolder] = message.useMessage();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, ACCESS_LOG_COLLECTION), orderBy("created_at", "desc"), limit(MAX_LOGS))
      );
      const settingSnap = await getDocs(collection(db, IP_SETTING_COLLECTION));
      const nextExcluded: Record<string, boolean> = {};
      settingSnap.forEach((d) => {
        nextExcluded[d.id] = d.data().track === false;
      });
      setExcluded(nextExcluded);
      setLogs(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            type: data.type ?? "page",
            ip: data.ip || "unknown",
            path: data.path ?? "",
            title: data.title || getPageTitle(data.path ?? ""),
            action: data.action ?? "",
            detail: data.detail ?? "",
            userAgent: data.userAgent ?? "",
            time: data.created_at?.toDate?.() ?? null,
          } as AccessLog;
        })
      );
    } catch (e) {
      console.error(e);
      alert("로그를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** 특정 IP의 모든 로그 삭제 (ip == X 조건으로 조회 후 500건씩 배치 삭제) */
  const removeLogsOf = async (ip: string) => {
    for (;;) {
        const snap = await getDocs(
          query(collection(db, ACCESS_LOG_COLLECTION), where("ip", "==", ip), limit(500))
        );
        if (snap.empty) break;
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        if (snap.size < 500) break;
    }
  };

  const deleteIpLogs = async (ip: string) => {
    try {
      await removeLogsOf(ip);
      msg.success(`${ip} 로그를 삭제했습니다.`);
      await load();
    } catch (e) {
      console.error(e);
      msg.error("삭제에 실패했습니다.");
    }
  };

  /** IP 삭제: 로그 + 알림/모니터링 제외 설정을 모두 삭제해 목록에서 제거한다. */
  const deleteIp = async (ip: string) => {
    try {
      await removeLogsOf(ip);
      await deleteDoc(doc(db, IP_SETTING_COLLECTION, ip));
      msg.success(`${ip} 를 삭제했습니다.`);
      await load();
    } catch (e) {
      console.error(e);
      msg.error("IP 삭제에 실패했습니다.");
    }
  };

  /** 로그 1건 삭제 */
  const deleteLog = async (id: string) => {
    try {
      await deleteDoc(doc(db, ACCESS_LOG_COLLECTION, id));
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      console.error(e);
      msg.error("삭제에 실패했습니다.");
    }
  };

  /** IP를 모니터링(로그 기록)에서 제외/해제 */
  const updateExcluded = async (ip: string, isExcluded: boolean) => {
    const prev = excluded[ip];
    setExcluded((s) => ({ ...s, [ip]: isExcluded }));
    try {
      await setDoc(
        doc(db, IP_SETTING_COLLECTION, ip),
        { track: !isExcluded, updated_at: serverTimestamp() },
        { merge: true }
      );
      msg.success(`${ip} 모니터링 ${isExcluded ? "제외됨 (이후 기록 안 함)" : "제외 해제"}`);
    } catch (e) {
      console.error(e);
      setExcluded((s) => ({ ...s, [ip]: prev ?? false }));
      msg.error("설정 저장에 실패했습니다.");
    }
  };

  const addIpSetting = async () => {
    const ip = newIp.trim();
    if (!ip || ip.includes("/")) {
      msg.warning("올바른 IP를 입력하세요.");
      return;
    }
    await updateExcluded(ip, true); // 미리 등록하는 IP는 모니터링 제외가 목적
    setNewIp("");
  };

  /** 현재 접속 중인 내 IP를 알림 OFF 로 등록 */
  const addMyIp = async () => {
    const ip = await getClientIp();
    if (!ip || ip === "unknown") {
      msg.error("내 IP를 확인하지 못했습니다. (광고 차단기 등으로 조회가 막혔을 수 있습니다)");
      return;
    }
    await updateExcluded(ip, true);
  };

  const groups = useMemo<IpGroup[]>(() => {
    const map = new Map<string, IpGroup>();
    for (const log of logs) {
      let g = map.get(log.ip);
      if (!g) {
        g = { ip: log.ip, count: 0, pageCount: 0, actionCount: 0, lastAt: log.time, excluded: false, logs: [] };
        map.set(log.ip, g);
      }
      g.count++;
      if (log.type === "page") g.pageCount++;
      else g.actionCount++;
      g.logs.push(log); // logs 는 최신순이므로 그대로 최신순 유지
    }
    // 로그는 없지만 설정만 있는 IP도 목록에 포함
    for (const ip of Object.keys(excluded)) {
      if (!map.has(ip)) {
        map.set(ip, { ip, count: 0, pageCount: 0, actionCount: 0, lastAt: null, excluded: false, logs: [] });
      }
    }
    for (const g of map.values()) {
      g.excluded = excluded[g.ip] ?? false;
    }
    const k = keyword.trim().toLowerCase();
    return [...map.values()].filter((g) => !k || g.ip.toLowerCase().includes(k));
  }, [logs, excluded, keyword]);

  const columns: ColumnsType<IpGroup> = [
    { title: "IP", dataIndex: "ip", key: "ip" },
    {
      title: "모니터링 제외",
      key: "excluded",
      render: (_, g) => (
        <Switch
          checked={g.excluded}
          checkedChildren="제외"
          unCheckedChildren="포함"
          onChange={(v) => updateExcluded(g.ip, v)}
        />
      ),
      filters: [
        { text: "제외", value: true },
        { text: "포함", value: false },
      ],
      onFilter: (v, g) => g.excluded === v,
    },
    { title: "전체", dataIndex: "count", key: "count", sorter: (a, b) => a.count - b.count },
    { title: "페이지", dataIndex: "pageCount", key: "pageCount" },
    { title: "활동", dataIndex: "actionCount", key: "actionCount" },
    {
      title: "마지막 접속",
      key: "lastAt",
      render: (_, g) => fmt(g.lastAt),
      sorter: (a, b) => (a.lastAt?.getTime() ?? 0) - (b.lastAt?.getTime() ?? 0),
      defaultSortOrder: "descend",
    },
    {
      title: "관리",
      key: "actions",
      render: (_, g) => (
        <div style={{ display: "flex", gap: 6 }}>
        <Popconfirm
          title={`${g.ip} 로그 ${g.count}건을 모두 삭제할까요?`}
          description="삭제 후 복구할 수 없습니다. (제외 설정은 유지됩니다)"
          okText="삭제"
          cancelText="취소"
          okButtonProps={{ danger: true }}
          onConfirm={() => deleteIpLogs(g.ip)}
          disabled={g.count === 0}
        >
          <Button size="small" danger disabled={g.count === 0}>
            로그 삭제
          </Button>
        </Popconfirm>
        <Popconfirm
          title={`${g.ip} 를 삭제할까요?`}
          description="로그와 모니터링 제외 설정이 모두 삭제되어 목록에서 사라집니다. 복구할 수 없습니다."
          okText="삭제"
          cancelText="취소"
          okButtonProps={{ danger: true }}
          onConfirm={() => deleteIp(g.ip)}
        >
          <Button size="small" type="primary" danger>
            IP 삭제
          </Button>
        </Popconfirm>
        </div>
      ),
    },
  ];

  const logColumns: ColumnsType<AccessLog> = [
    { title: "시간", key: "time", width: 180, render: (_, l) => fmt(l.time) },
    {
      title: "구분",
      key: "type",
      width: 90,
      render: (_, l) =>
        l.type === "page" ? <Tag color="blue">페이지</Tag> : <Tag color="orange">활동</Tag>,
    },
    { title: "페이지", dataIndex: "title", key: "title" },
    {
      title: "활동/상세",
      key: "action",
      render: (_, l) => [l.action, l.detail].filter(Boolean).join(" - ") || "-",
    },
    {
      title: "",
      key: "del",
      width: 70,
      render: (_, l) => (
        <Popconfirm title="이 기록을 삭제할까요?" okText="삭제" cancelText="취소" onConfirm={() => deleteLog(l.id)}>
          <Button size="small" type="text" danger>
            삭제
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: "40px 20px", maxWidth: 1100, margin: "0 auto" }}>
      {msgHolder}
      <Title level={3}>방문자 모니터링 (IP별 접근/활동)</Title>
      <Text type="secondary">최근 {MAX_LOGS}건 기준 · 제외: / , /landing/view/* (랜딩 상세 전체)</Text>
      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <Input
          allowClear
          placeholder="IP 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ maxWidth: 260 }}
        />
        <Button onClick={load} loading={loading}>
          새로고침
        </Button>
        <Input
          placeholder="IP 직접 추가 (모니터링 제외로 등록)"
          value={newIp}
          onChange={(e) => setNewIp(e.target.value)}
          onPressEnter={addIpSetting}
          style={{ maxWidth: 260, marginLeft: "auto" }}
        />
        <Button onClick={addIpSetting}>추가</Button>
        <Button onClick={addMyIp}>내 IP 제외 등록</Button>
        <Button danger onClick={() => setAccessAuthed(false)}>
          로그아웃
        </Button>
      </div>
      <Table<IpGroup>
        rowKey="ip"
        loading={loading}
        columns={columns}
        dataSource={groups}
        pagination={{ pageSize: 20 }}
        expandable={{
          expandedRowRender: (g) => (
            <Table<AccessLog>
              rowKey="id"
              size="small"
              columns={logColumns}
              dataSource={g.logs}
              pagination={{ pageSize: 10 }}
              expandable={{
                expandedRowRender: (l) => <Text type="secondary">{l.userAgent}</Text>,
              }}
            />
          ),
        }}
      />
    </div>
  );
}

export default function AccessLogPage() {
  const [authed, setAuthed] = useState(isAccessAuthed);
  useEffect(() => {
    const sync = () => setAuthed(isAccessAuthed());
    window.addEventListener(ACCESS_AUTH_EVENT, sync);
    return () => window.removeEventListener(ACCESS_AUTH_EVENT, sync);
  }, []);
  return authed ? <LogView /> : <Navigate to="/admin-login" replace />;
}
