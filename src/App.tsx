import React, { useState } from 'react';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [teamType, setTeamType] = useState<string>('praise'); 
  const [role, setRole] = useState<string | null>(null); 
  
  const [roomName, setRoomName] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('수'); 
  const [selectedTime, setSelectedTime] = useState<string>('19:30'); 
  const [alarmEnabled, setAlarmEnabled] = useState<boolean>(true); 
  
  const [selectedSongTab, setSelectedSongTab] = useState<number>(0); 
  const [isPublished, setIsPublished] = useState<boolean>(false); 

  const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];

  const [songs] = useState([
    { title: '은혜로다', form: 'Verse - Chorus - Bridge' },
    { title: '주 님의 품에', form: 'Verse - Chorus' }
  ]);

  return (
    <>
      {/* Tailwind CSS CDN 스타일 자동 로드 */}
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      
      {/* 모바일 앱 뷰포트 컨테이너 */}
      <div className="min-h-screen bg-gray-900 flex justify-center items-center p-0 sm:p-4 font-sans antialiased">
        <div className="w-full max-w-md bg-slate-50 min-h-screen sm:min-h-[844px] sm:max-h-[844px] sm:rounded-[40px] shadow-2xl flex flex-col justify-between overflow-hidden relative border-0 sm:border-8 sm:border-slate-800">
          
          {/* 앱 상단 헤더 / 상태바 느낌 연출 */}
          <header className="bg-white px-6 pt-6 pb-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10 shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse"></div>
              <span className="text-xs font-black tracking-wider text-gray-400 uppercase">ENSEMBLE HUB</span>
            </div>
            {currentView !== 'home' && (
              <button 
                onClick={() => setCurrentView('home')} 
                className="text-xs font-bold text-gray-400 hover:text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full transition"
              >
                홈으로
              </button>
            )}
          </header>

          {/* 앱 메인 스크롤 콘텐츠 영역 */}
          <main className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* --- [1] 홈 화면 --- */}
            {currentView === 'home' && (
              <div className="h-full flex flex-col justify-center space-y-8 py-10">
                <div className="text-center space-y-2">
                  <div className="inline-block bg-indigo-50 text-indigo-600 font-extrabold text-xs px-3 py-1.5 rounded-full mb-2">
                    SMART BAND WORKFLOW
                  </div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">합주 & 콘티<br/>스마트 플랫폼</h1>
                  <p className="text-sm text-gray-500">팀 성격에 맞는 모드를 터치하여 시작하세요.</p>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={() => { setTeamType('praise'); setCurrentView('praise_role'); }}
                    className="w-full p-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-3xl font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform active:scale-95 transition flex items-center justify-between group"
                  >
                    <div className="text-left">
                      <div className="text-xl font-extrabold">🙌 찬양팀 모드</div>
                      <div className="text-xs text-indigo-200 mt-1">예배 콘티, 송폼, 말씀 묵상 특화</div>
                    </div>
                    <span className="text-2xl group-hover:translate-x-1 transition-transform">➔</span>
                  </button>

                  <button 
                    onClick={() => { setTeamType('band'); setRole('leader'); setCurrentView('band_mode'); }}
                    className="w-full p-6 bg-slate-900 text-white rounded-3xl font-bold shadow-lg shadow-slate-300 hover:bg-slate-800 transform active:scale-95 transition flex items-center justify-between group"
                  >
                    <div className="text-left">
                      <div className="text-xl font-extrabold">🎸 실용음악 밴드 모드</div>
                      <div className="text-xs text-slate-400 mt-1">세션 구성, 합주 세트리스트 공유</div>
                    </div>
                    <span className="text-2xl group-hover:translate-x-1 transition-transform">➔</span>
                  </button>
                </div>
              </div>
            )}

            {/* --- [2] 찬양팀 역할 선택 --- */}
            {currentView === 'praise_role' && (
              <div className="space-y-6 pt-4">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">역할을 선택해 주세요</h2>
                  <p className="text-xs text-gray-400 mt-1">인도자 및 단원 역할 구분에 따라 화면이 최적화됩니다.</p>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={() => { setRole('leader'); setCurrentView('create_room'); }}
                    className="w-full p-5 bg-white border-2 border-indigo-500 rounded-3xl font-bold text-indigo-600 shadow-md hover:bg-indigo-50 transform active:scale-95 transition text-left space-y-1"
                  >
                    <div className="text-base font-extrabold">👑 인도자 (방 만들기)</div>
                    <div className="text-xs text-indigo-400">새로운 합주 방을 개설하고 알림 및 콘티를 발행합니다.</div>
                  </button>

                  <button 
                    onClick={() => { setRole('member'); setCurrentView('join_room'); }}
                    className="w-full p-5 bg-white border border-gray-200 rounded-3xl font-bold text-gray-700 shadow-sm hover:bg-gray-50 transform active:scale-95 transition text-left space-y-1"
                  >
                    <div className="text-base font-extrabold">👤 일반 단원 (방 참여하기)</div>
                    <div className="text-xs text-gray-400">발급받은 6자리 코드로 입장하여 악보를 확인합니다.</div>
                  </button>
                </div>
              </div>
            )}

            {/* --- [3] 방 만들기 (인도자) --- */}
            {currentView === 'create_room' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">새 합주 방 개설</h2>
                  <p className="text-xs text-gray-400 mt-1">연습 일정을 설정하면 24시간 전 자동 알림이 세팅됩니다.</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-1">
                    <label className="text-xs font-bold text-gray-500">방 이름</label>
                    <input 
                      type="text" 
                      placeholder="예: 청년부 주일 찬양팀" 
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
                    <label className="text-xs font-bold text-gray-500">연습 요일</label>
                    <div className="grid grid-cols-7 gap-1">
                      {daysOfWeek.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setSelectedDay(day)}
                          className={`py-2 rounded-xl text-xs font-extrabold transition ${selectedDay === day ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-1">
                    <label className="text-xs font-bold text-gray-500">연습 시간</label>
                    <input 
                      type="time" 
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full p-3 bg-gray-50 rounded-xl text-sm font-black text-gray-800 focus:outline-none"
                    />
                  </div>

                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-extrabold text-indigo-900">🔔 연습 24시간 전 자동 리마인드</span>
                      <input 
                        type="checkbox" 
                        checked={alarmEnabled} 
                        onChange={(e) => setAlarmEnabled(e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded-lg focus:ring-0"
                      />
                    </div>
                    <p className="text-[11px] text-indigo-600 leading-tight">
                      매주 <span className="font-bold">{selectedDay}요일 {selectedTime}</span> 연습 기준, 정확히 24시간 전 단원 스마트폰으로 푸시 알림이 발송됩니다.
                    </p>
                  </div>

                  <button 
                    onClick={() => { setRoomCode('KPT-742'); setCurrentView('admin_dash'); }}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-base shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition"
                  >
                    방 생성 및 코드 발급하기 ➔
                  </button>
                </div>
              </div>
            )}

            {/* --- [4] 방 참여하기 (단원) --- */}
            {currentView === 'join_room' && (
              <div className="space-y-6 pt-4">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">합주 방 입장</h2>
                  <p className="text-xs text-gray-400 mt-1">인도자에게 받은 6자리 참여 코드를 입력하세요.</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">6자리 방 코드</label>
                    <input 
                      type="text" 
                      placeholder="KPT-742" 
                      className="w-full p-4 bg-gray-50 rounded-2xl text-xl font-black tracking-widest text-center text-indigo-600 uppercase border border-gray-200 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">본인 닉네임 (세션/파트)</label>
                    <input 
                      type="text" 
                      placeholder="예: 김건반" 
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold text-gray-800 focus:outline-none"
                    />
                  </div>

                  <button 
                    onClick={() => setCurrentView('member_dash')}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition"
                  >
                    대시보드 입장 ➔
                  </button>
                </div>
              </div>
            )}

            {/* --- [5] 단원용 스마트 대시보드 --- */}
            {currentView === 'member_dash' && (
              <div className="space-y-4">
                {/* 메인 프로필/일정 카드 */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-5 rounded-3xl shadow-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black bg-indigo-500 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        파트: {nickname || '세컨건반'}
                      </span>
                      <h2 className="text-xl font-black mt-2">{roomName || '청년부 주일 찬양팀'}</h2>
                    </div>
                    <span className="text-xs font-bold bg-white text-indigo-900 px-2.5 py-1 rounded-full shadow-sm">
                      코드 {roomCode || 'KPT-742'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-indigo-100 font-medium pt-1 border-t border-indigo-500">
                    <span>📅 매주 {selectedDay}요일 {selectedTime} 연습 (24시간 전 알림 작동 중)</span>
                  </div>
                </div>

                {/* 곡 선택 상단 탭 */}
                <div className="flex space-x-2 overflow-x-auto pb-1">
                  {songs.map((song, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setSelectedSongTab(idx)}
                      className={`flex-1 py-3 px-4 rounded-2xl text-xs font-extrabold whitespace-nowrap transition transform active:scale-95 ${selectedSongTab === idx ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}
                    >
                      {idx + 1}. {song.title}
                    </button>
                  ))}
                </div>

                {/* 악보 슬라이드Viewer 카드 */}
                <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-center text-xs text-gray-400 font-bold px-1">
                    <span>📄 악보 미리보기</span>
                    <span>1 / 2 Page</span>
                  </div>
                  <div className="w-full h-52 bg-slate-100 rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-2 text-indigo-600 font-bold text-lg">
                      🎵
                    </div>
                    <p className="text-xs font-black text-gray-700">{songs[selectedSongTab].title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">좌우 스와이프로 다음 페이지 확인</p>
                  </div>
                  
                  {/* 송폼 인디케이터 */}
                  <div className="p-3 bg-indigo-50 rounded-2xl text-center border border-indigo-100">
                    <span className="text-[11px] font-black text-indigo-900">📌 송폼: {songs[selectedSongTab].form}</span>
                  </div>
                </div>

                {/* 아코디언 드롭다운 세션 */}
                <div className="space-y-2">
                  <details className="group bg-white border border-gray-200 rounded-2xl p-4 text-xs font-bold text-gray-700 shadow-sm cursor-pointer">
                    <summary className="flex justify-between items-center list-none">
                      <span>🎬 찬양 레퍼런스 영상 모아보기</span>
                      <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-gray-500 font-medium">
                      <div className="p-2 bg-gray-50 rounded-xl flex justify-between items-center">
                        <span>1. 은혜로다 (원곡 음원)</span>
                        <span className="text-indigo-600 font-bold text-[10px]">재생 ➔</span>
                      </div>
                      <div className="p-2 bg-gray-50 rounded-xl flex justify-between items-center">
                        <span>2. 주 님의 품에 (라이브)</span>
                        <span className="text-indigo-600 font-bold text-[10px]">재생 ➔</span>
                      </div>
                    </div>
                  </details>

                  <details className="group bg-white border border-gray-200 rounded-2xl p-4 text-xs font-bold text-gray-700 shadow-sm cursor-pointer">
                    <summary className="flex justify-between items-center list-none">
                      <span>📝 말씀 구절 및 인도자 묵상</span>
                      <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-gray-600 font-normal leading-relaxed">
                      <p className="font-extrabold text-indigo-600">[말씀] 시편 23편 1-3절</p>
                      <p className="text-[11px] text-gray-500">"여호와는 나의 목자시니 내게 부족함이 없으리로다..."</p>
                    </div>
                  </details>
                </div>

                {/* PDF 일괄 다운로드 버튼 */}
                <button 
                  onClick={() => alert('전체 악보가 결합된 PDF 파일 다운로드가 시작됩니다.')}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-slate-800 transform active:scale-95 transition flex items-center justify-center space-x-2"
                >
                  <span>📥 전체 악보 PDF 일괄 병합 다운로드</span>
                </button>
              </div>
            )}

            {/* --- [6] 인도자 대시보드 --- */}
            {currentView === 'admin_dash' && (
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2.5 py-1 rounded-full uppercase">
                      ADMIN CONSOLE
                    </span>
                    <h2 className="text-xl font-black text-gray-900 mt-1">{roomName || '청년부 주일 찬양팀'}</h2>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-bold ${isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isPublished ? '🟢 게시됨' : '🟠 작성 중'}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                  <h3 className="text-xs font-black text-gray-700">⏰ 연습 일정 및 알림 관리</h3>
                  <div className="flex gap-2">
                    <select 
                      value={selectedDay} 
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="p-2.5 bg-gray-50 rounded-xl text-xs font-bold border-0 focus:outline-none"
                    >
                      {daysOfWeek.map(d => <option key={d} value={d}>{d}요일</option>)}
                    </select>
                    <input 
                      type="time" 
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="p-2.5 bg-gray-50 rounded-xl text-xs font-bold border-0 focus:outline-none flex-1"
                    />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                  <h3 className="text-xs font-black text-gray-700">🎵 콘티 목록 관리</h3>
                  {songs.map((song, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-xl space-y-1.5">
                      <input type="text" defaultValue={song.title} className="w-full p-2 bg-white rounded-lg text-xs font-bold border border-gray-200" />
                      <input type="text" defaultValue={song.form} className="w-full p-2 bg-white rounded-lg text-[11px] text-gray-500 border border-gray-200" />
                    </div>
                  ))}
                  <button className="w-full py-2.5 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl text-xs font-extrabold hover:bg-indigo-50 transition">
                    + 곡 추가하기
                  </button>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button 
                    onClick={() => { setIsPublished(true); alert('콘티가 단원들에게 최종 발행되었습니다!'); }}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-indigo-100 active:scale-95 transition"
                  >
                    {isPublished ? '✨ 콘티 재발행' : '✅ 최종 등록 및 게시'}
                  </button>
                </div>

                <button 
                  onClick={() => setCurrentView('member_dash')}
                  className="w-full text-center text-xs font-extrabold text-indigo-600 hover:underline pt-2"
                >
                  단원용 앱 화면 미리보기 ➔
                </button>
              </div>
            )}

          </main>

          {/* 모바일 하단 홈 바 가상 연출 */}
          <footer className="bg-white py-2 flex justify-center items-center border-t border-gray-100">
            <div className="w-32 h-1 bg-gray-300 rounded-full"></div>
          </footer>

        </div>
      </div>
    </>
  );
}
