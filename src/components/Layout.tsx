import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    const { pathname } = useLocation();
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(true);

    // 스크롤 위치 계산 로직을 함수로 분리 (재사용을 위해)
    const checkScrollPosition = useCallback(() => {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        // 최상단 버튼: 300px 기준
        setShowScrollTop(scrollY > 100);

        // 최하단 버튼: 바닥에서 50px 여유 둠
        // 만약 전체 높이가 창 높이보다 작으면 (스크롤이 아예 없으면) 아래 버튼 안 보임
        if (documentHeight <= windowHeight || scrollY + windowHeight >= documentHeight - 50) {
            setShowScrollBottom(false);
        } else {
            setShowScrollBottom(true);
        }
    }, []);

    // 1. 페이지 이동 시 처리
    useEffect(() => {
        window.scrollTo(0, 0); // 맨 위로 이동
        
        // 페이지가 바뀌고 DOM이 렌더링된 직후에 높이 값을 다시 계산해야 함
        // 약간의 지연(setTimeout)을 주거나 브라우저의 다음 프레임에서 실행
        const timer = setTimeout(() => {
            checkScrollPosition();
        }, 100);

        return () => clearTimeout(timer);
    }, [pathname, checkScrollPosition]);

    // 2. 실시간 스크롤 이벤트 등록
    useEffect(() => {
        window.addEventListener('scroll', checkScrollPosition);
        window.addEventListener('resize', checkScrollPosition); // 창 크기 바뀔 때도 대응
        
        return () => {
            window.removeEventListener('scroll', checkScrollPosition);
            window.removeEventListener('resize', checkScrollPosition);
        };
    }, [checkScrollPosition]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const scrollToBottom = () => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen flex flex-col bg-white relative">
            <Header /> 
            
            <main className="flex-grow">
                {children}
            </main>
            
            {/* 플로팅 버튼 영역 */}
            <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
                {showScrollTop && (
                    <button
                        onClick={scrollToTop}
                        className="p-3 bg-white border border-gray-200 shadow-lg rounded-full text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-all duration-300"
                    >
                        <ArrowUpIcon className="w-6 h-6" />
                    </button>
                )}

                {showScrollBottom && (
                    <button
                        onClick={scrollToBottom}
                        className="p-3 bg-blue-600 shadow-lg rounded-full text-white hover:bg-blue-700 transition-all duration-300"
                    >
                        <ArrowDownIcon className="w-6 h-6" />
                    </button>
                )}
            </div>

            <Footer />
        </div>
    );
};

export default Layout;