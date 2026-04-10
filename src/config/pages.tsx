import React from 'react';
import { 
    HomeIcon, 
    RocketLaunchIcon, 
    TableCellsIcon, 
    BeakerIcon,
} from '@heroicons/react/24/outline';

export interface PageConfig {
    title: string;
    path: string;
    description: string;
    icon: React.ReactNode;
    showInHeader: boolean;
    devOnly?: boolean;
}

export const PAGE_LIST: PageConfig[] = [
    {
        title: "랜딩 페이지",
        path: "/",
        description: "사용자들이 보는 실제 랜딩 페이지",
        icon: <HomeIcon className="w-6 h-6" />,
        showInHeader: true
    },
    {
        title: "배포 관리",
        path: "/deploy",
        description: "랜딩 이미지 교체 및 GitHub 자동 배포",
        icon: <RocketLaunchIcon className="w-6 h-6" />,
        showInHeader: true
    },
    {
        title: "설문 리스트",
        path: "/excel-down",
        description: "설문 데이터 확인 및 엑셀 추출",
        icon: <TableCellsIcon className="w-6 h-6" />,
        showInHeader: true
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