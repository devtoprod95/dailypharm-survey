import { useState } from "react";
import LandingListPage from "./LandingListPage";
import LandingFormPage from "./LandingFormPage";

export function LandingManageContainer() {
  // 'list' | 'add' | 'edit' 세 가지 상태를 관리합니다.
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'edit'>('list');
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  // 목록으로 돌아갈 때 상태 초기화
  const handleBackToList = () => {
    setSelectedId(undefined);
    setViewMode('list');
  };

  // 수정 버튼 클릭 시 ID를 들고 수정 폼으로 전환
  const handleEdit = (id: string) => {
    setSelectedId(id);
    setViewMode('edit');
  };

  // 추가 버튼 클릭 시 ID 없이 추가 폼으로 전환
  const handleAdd = () => {
    setSelectedId(undefined);
    setViewMode('add');
  };

  // 현재 모드에 따라 컴포넌트를 동적으로 렌더링
  if (viewMode === 'add') {
    return <LandingFormPage onBack={handleBackToList} />;
  }

  if (viewMode === 'edit') {
    return <LandingFormPage id={selectedId} onBack={handleBackToList} />;
  }

  return <LandingListPage onEdit={handleEdit} onAdd={handleAdd} />;
}