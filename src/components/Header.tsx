import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { PAGE_LIST } from '../config/pages';
import { useNavigate } from 'react-router-dom';

const Header = () => {
    const navigate = useNavigate(); // 2. navigate 함수 생성
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // 헤더에 표시할 메뉴 필터링 (메인 제외 + 개발용 필터)
    const visibleMenus = PAGE_LIST.filter(page => 
        page.showInHeader && (!page.devOnly || import.meta.env.DEV)
    );

    // 새 창 열기 핸들러
    const handleOpenTab = (path: string, blank: boolean = false) => {
        console.log(blank)
        if(blank){
          window.open(`#${path}`, '_blank');
        } else {
          navigate(path);
        }
        setIsMenuOpen(false);
    };

    return (
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* 로고 클릭 시 메인으로 새 창 이동 */}
                    <button 
                        onClick={() => handleOpenTab('/', true)} 
                        className="text-xl font-bold text-blue-600"
                    >
                        DailyPharm
                    </button>

                    {/* 데스크탑 메뉴 */}
                    <nav className="hidden md:flex space-x-8">
                        {visibleMenus.map((page) => (
                            <button 
                                key={page.path} 
                                onClick={() => handleOpenTab(page.path, page.path === "/")}
                                className="text-sm font-medium text-gray-600 hover:text-blue-600"
                            >
                                {page.title}
                            </button>
                        ))}
                    </nav>

                    <div className="md:hidden">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            {isMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* 모바일 메뉴 */}
            {isMenuOpen && (
                <div className="md:hidden bg-white border-b px-2 pt-2 pb-3 space-y-1">
                    {visibleMenus.map((page) => (
                        <button
                            key={page.path}
                            onClick={() => handleOpenTab(page.path, page.path === "/")}
                            className="w-full text-left block px-3 py-2 text-base font-medium text-gray-600 hover:bg-blue-50 rounded-md"
                        >
                            {page.title}
                        </button>
                    ))}
                </div>
            )}
        </header>
    );
};

export default Header;