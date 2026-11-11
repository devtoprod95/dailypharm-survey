import React from 'react';
import { 
    HomeIcon, 
    RocketLaunchIcon, 
    TableCellsIcon, 
    BeakerIcon,
    ChatBubbleLeftRightIcon,
    ShieldCheckIcon,
    KeyIcon,
} from '@heroicons/react/24/outline';

export interface PageConfig {
    title: string;
    path: string;
    description: string;
    icon: React.ReactNode;
    showInHeader: boolean;
    devOnly?: boolean;
    /** 접근 로그 비밀번호 인증에 성공한 경우에만 헤더에 노출 */
    requiresAuth?: boolean;
    /** 관리자 로그인에 성공하면 헤더에서 숨김 */
    hideWhenAuth?: boolean;
}

export const PAGE_LIST: PageConfig[] = [
    {
        title: "랜딩 관리",
        path: "/landing",
        description: "랜딩 관리 페이지",
        icon: <HomeIcon className="w-6 h-6" />,
        showInHeader: true
    },
    // {
    //     title: "배포 관리",
    //     path: "/deploy",
    //     description: "랜딩 이미지 교체 및 GitHub 자동 배포",
    //     icon: <RocketLaunchIcon className="w-6 h-6" />,
    //     showInHeader: true
    // },
    {
        title: "설문 리스트",
        path: "/excel-down",
        description: "설문 데이터 확인 및 엑셀 추출",
        icon: <TableCellsIcon className="w-6 h-6" />,
        showInHeader: true
    },
    {
        title: "건의함",
        path: "/feature-request",
        description: "기능 요청, 버그 신고, 문의 등 의견 작성",
        icon: <ChatBubbleLeftRightIcon className="w-6 h-6" />,
        showInHeader: true
    },
    {
        title: "관리자 로그인",
        path: "/admin-login",
        description: "로그인 성공 시 방문자 모니터링 메뉴 노출",
        icon: <KeyIcon className="w-6 h-6" />,
        showInHeader: true,
        hideWhenAuth: true
    },
    {
        title: "방문자 모니터링",
        path: "/access-logs",
        description: "IP별 접근/활동 로그 및 텔레그램 알림 설정",
        icon: <ShieldCheckIcon className="w-6 h-6" />,
        showInHeader: true,
        requiresAuth: true
    },
    {
        title: "시스템 테스트",
        path: "/test",
        description: "DB 인덱스 및 연결 확인용",
        icon: <BeakerIcon className="w-6 h-6" />,
        showInHeader: true,
        devOnly: true
    }
];