import React, { useState } from 'react';

// --- 타입 정의 ---
interface Song {
  id: string;
  title: string;
  form: string;
  sheetUrl: string;
  youtubeUrl: string;
  scripture: string;
  meditation: string;
}

interface RoomHistory {
  code: string;
  name: string;
  role: 'leader' | 'member';
  lastAccessed: string;
}

export default function App() {
  // 화면 상태: 'login' -> 'my_hub' (히스토리) -> 'home' (새 방 만들기/참여) -> ...
  const [currentView, setCurrentView] = useState<string>('login');
  
  // 사용자 정보 (로그인 시 저장)
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 가상의 이전 기록 (데이터베이스에서 불러올 로그)
  const [recentRooms] = useState<RoomHistory[]>([
    { code: 'KPT-742', name: '청년부 주일 찬양팀', role: 'leader', lastAccessed: '2026-09-18' },
    { code: 'BND-104', name: '금요 철야 세션팀', role: 'member', lastAccessed: '2026-09-12' }
  ]);

  const [teamType, setTeamType] = useState<string>('praise'); 
  const [role, setRole] = useState<string | null>(null); 
  
  // 방 및 설정 상태
  const [roomName, setRoomName] = useState<string>('청년부 주일 찬양팀');
  const [roomCode, setRoomCode] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('수'); 
  const [selectedTime, setSelectedTime] = useState<string>('19:30'); 
  const [alarmEnabled, setAlarmEnabled] = useState<boolean>(true); 
  
  const [selectedSongTab, setSelectedSongTab] = useState<number>(0); 
  const [isPublished, setIsPublished] = useState<boolean>(false); 

  const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];

  const [songs, setSongs] = useState<Song[]>([
    {
      id: '1',
      title: '은혜로다',
      form: 'Verse - Chorus - Bridge - Chorus',
      sheetUrl: '',
      youtubeUrl: '',
      scripture: '시편 23편 1-3절',
      meditation: '이번 주는 주님의 은혜를 묵상하며 기쁨으로 찬양합시다.'
    }
  ]);

  // --- 로그인 핸들러 ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail) {
      alert('이메일을 입력해주세요.');
      return;
    }
    // 임시 로그인 처리 (실제로는 Firebase Auth 연동)
    setUser({ email: loginEmail, name: loginEmail.split('@')[0] });
    setCurrentView('my_hub'); // 로그인 성공 시 나의 히스토리 화면으로 이동
  };

  // --- 로그아웃 핸들러 ---
  const handleLogout = () => {
    setUser(null);
    setLoginEmail('');
    setLoginPassword('');
    setCurrentView('login');
  };

  const handleAddSong = () => { /* 이전과 동일한 곡 추가 로직 */
    const newSong: Song = { id: Date.now().toString(), title: `새 찬양 ${songs.length + 1}`, form: 'Intro - Verse', sheetUrl: '', youtubeUrl: '', scripture: '', meditation: '' };
    setSongs([...songs, newSong]);
  };
  const handleUpdateSong = (id: string, field: keyof Song, value: string) => {
    setSongs(songs.map(song => song.id === id ? { ...song, [field]: value } : song));
  };
  const handleDeleteSong = (id: string) => {
    if (songs.length <= 1) return alert('최소 한 곡은 있어야 합니다.');
    setSongs(songs.filter(song => song.id !== id));
    if (selectedSongTab >= songs.length - 1) setSelectedSongTab(0);
  };

  return (
    <>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
        
        {/* 상단 글로벌 반응형 내비게이션 바 (로그인 화면 제외) */}
        {currentView !== 'login' && (
          <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3.5 flex justify-between items-center">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('my_hub')}>
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">EH</div>
                <div>
                  <span className="font-black text-base md:text-lg text-slate-900 tracking-tight">ENSEMBLE HUB</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="hidden md:inline-block text-xs font-bold text-slate-500 mr-2">
                  {user?.name}님 환영합니다
                </span>
                
                {currentView !== 'my_hub' && (
                  <button 
                    onClick={() => {
                      if (currentView === 'home') setCurrentView('my_hub');
                      else if (currentView === 'member_dash' || currentView === 'admin_dash') setCurrentView('my_hub');
                      else if (currentView === 'praise_role') setCurrentView('home');
                      else if (currentView === 'create_room' || currentView === 'join_room') setCurrentView('praise_role');
                    }} 
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                  >
                    <span>⬅ 뒤로</span>
                  </button>
                )}
                
                <button onClick={handleLogout} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition">
                  로그아웃
                </button>
              </div>
            </div>
          </header>
        )}

        <main className={`flex-1 flex flex-col ${currentView === 'login' ? 'justify-center' : ''} max-w-6xl mx-auto w-full p-4 md:p-8`}>

          {/* --- [0] 로그인 화면 --- */}
          {currentView === 'login' && (
            <div className="max-w-sm mx-auto w-full bg-white rounded-3xl p-8 md:p-10 border border-slate-200 shadow-2xl space-y-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-200">
                  EH
                </div>
                <h1 className="text-2xl font-black text-slate-900">ENSEMBLE HUB</h1>
                <p className="text-xs text-slate-500 font-bold">합주와 콘티 관리를 스마트하게</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 ml-1">이메일</label>
                  <input 
                    type="email" 
                    placeholder="example@email.com" 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 ml-1">비밀번호</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <button type="submit" className="w-full py-4 mt-2 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-slate-800 transition">
                  로그인
                </button>
                
                <div className="relative flex items-center justify-center py-2">
                  <div className="border-t border-slate-200 w-full"></div>
                  <span className="bg-white px-3 text-xs text-slate-400 font-bold absolute">또는</span>
                </div>

                <button type="button" onClick={() => { setLoginEmail('google@user.com'); handleLogin(new Event('submit') as any); }} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-50 transition flex justify-center items-center space-x-2">
                  <span>Google 계정으로 계속하기</span>
                </button>
              </form>
            </div>
          )}

          {/* --- [0.5] 나의 대시보드 (로그인 직후 이전 로그 불러오기) --- */}
          {currentView === 'my_hub' && (
            <div className="max-w-4xl mx-auto w-full space-y-8 py-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">{user?.name}님의 워크스페이스</h2>
                  <p className="text-sm text-slate-500 mt-1">최근 참여한 합주 방 내역입니다.</p>
                </div>
                <button 
                  onClick={() => setCurrentView('home')}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg hover:bg-indigo-700 transition"
                >
                  + 새로운 방 개설 / 참여하기
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentRooms.map((room, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between h-48"
                       onClick={() => {
                         setRoomCode(room.code);
                         setRoomName(room.name);
                         setCurrentView(room.role === 'leader' ? 'admin_dash' : 'member_dash');
                       }}>
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase ${room.role === 'leader' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {room.role === 'leader' ? '👑 인도자' : '👤 단원'}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400">{room.code}</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-800 leading-tight">{room.name}</h3>
                    </div>
                    <div className="text-xs font-bold text-slate-400">
                      마지막 접속: {room.lastAccessed}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- [1] 홈 화면 (새 방 만들기/참여 선택) --- */}
          {currentView === 'home' && (
            <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-8 text-center">
              <div className="space-y-3">
                <span className="bg-indigo-50 text-indigo-600 text-xs font-black px-3 py-1.5 rounded-full uppercase">새로운 합주 시작</span>
                <h1 className="text-3xl font-black text-slate-900">팀 모드 선택</h1>
                <p className="text-sm text-slate-500">방의 성격에 맞는 모드를 선택하세요.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => { setTeamType('praise'); setCurrentView('praise_role'); }} className="p-6 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition text-left space-y-2">
                  <div className="text-2xl">🙌</div>
                  <div className="text-lg font-black">찬양팀 모드</div>
                  <div className="text-xs text-indigo-200">악보, 송폼, 말씀 묵상 중심</div>
                </button>
                <button onClick={() => { setTeamType('band'); setRole('leader'); setCurrentView('create_room'); }} className="p-6 bg-slate-900 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition text-left space-y-2">
                  <div className="text-2xl">🎸</div>
                  <div className="text-lg font-black">밴드 모드</div>
                  <div className="text-xs text-slate-400">세트리스트 및 세션 중심</div>
                </button>
              </div>
            </div>
          )}

          {/* --- [2] 찬양팀 역할 선택 --- */}
          {currentView === 'praise_role' && (
            <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900">역할 선택</h2>
              </div>
              <div className="space-y-3">
                <button onClick={() => { setRole('leader'); setCurrentView('create_room'); }} className="w-full p-5 bg-indigo-50 border-2 border-indigo-500 text-indigo-700 rounded-2xl font-extrabold hover:bg-indigo-100 transition text-left">
                  👑 인도자 (방 개설)
                </button>
                <button onClick={() => { setRole('member'); setCurrentView('join_room'); }} className="w-full p-5 bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl font-extrabold hover:bg-slate-100 transition text-left">
                  👤 일반 단원 (코드 참여)
                </button>
              </div>
            </div>
          )}

          {/* --- [3] 방 만들기 --- */}
          {currentView === 'create_room' && (
            <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xl space-y-6">
              <div><h2 className="text-2xl font-black">방 개설 설정</h2></div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">방 이름</label>
                  <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">연습 요일</label>
                  <div className="grid grid-cols-7 gap-1">
                    {daysOfWeek.map((day) => (
                      <button key={day} type="button" onClick={() => setSelectedDay(day)} className={`py-2.5 rounded-xl text-xs font-extrabold ${selectedDay === day ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{day}</button>
                    ))}
                  </div>
                </div>
                <button onClick={() => { setRoomCode('KPT-742'); setCurrentView('admin_dash'); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition mt-4">
                  방 생성 완료 ➔
                </button>
              </div>
            </div>
          )}

          {/* --- [4] 방 참여하기 --- */}
          {currentView === 'join_room' && (
            <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
              <div><h2 className="text-2xl font-black">방 참여하기</h2></div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">6자리 방 코드</label>
                  <input type="text" placeholder="KPT-742" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xl font-black uppercase tracking-widest text-indigo-600" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">닉네임 / 파트</label>
                  <input type="text" placeholder="예: 김건반 (세컨)" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
                </div>
                <button onClick={() => setCurrentView('member_dash')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition">
                  입장하기 ➔
                </button>
              </div>
            </div>
          )}

          {/* --- [5] 인도자 대시보드 --- */}
          {currentView === 'admin_dash' && (
            <div className="space-y-6 pb-20">
              <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black mt-2">{roomName}</h1>
                </div>
                <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700 text-center">
                  <div className="text-[10px] font-bold text-slate-400">초대 코드</div>
                  <div className="text-lg font-black font-mono text-indigo-400">{roomCode}</div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-6">
                <h3 className="text-lg font-black text-slate-900">🎵 콘티 곡 상세 설정</h3>
                <button onClick={handleAddSong} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold">
                  + 새 곡 추가
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {songs.map((song, idx) => (
                  <div key={song.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b pb-3">
                      <span className="text-xs font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">{idx + 1}번 곡</span>
                      <button onClick={() => handleDeleteSong(song.id)} className="text-xs font-bold text-red-500 hover:underline">삭제</button>
                    </div>
                    <div className="space-y-3 text-xs font-bold">
                      <input type="text" value={song.title} onChange={(e) => handleUpdateSong(song.id, 'title', e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl" placeholder="곡 제목" />
                      <input type="text" value={song.youtubeUrl} onChange={(e) => handleUpdateSong(song.id, 'youtubeUrl', e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl" placeholder="유튜브 링크 URL" />
                      <input type="text" value={song.sheetUrl} onChange={(e) => handleUpdateSong(song.id, 'sheetUrl', e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl" placeholder="악보 이미지 URL" />
                      <textarea rows={2} value={song.meditation} onChange={(e) => handleUpdateSong(song.id, 'meditation', e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl" placeholder="말씀 및 묵상 내용" />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setCurrentView('member_dash')} className="w-full py-4 mt-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg">
                단원 앱 화면 미리보기 ➔
              </button>
            </div>
          )}

          {/* --- [6] 단원 대시보드 --- */}
          {currentView === 'member_dash' && (
            <div className="space-y-6 pb-20">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-6 rounded-3xl shadow-lg flex justify-between items-center">
                <div><h2 className="text-2xl font-black mt-2">{roomName}</h2></div>
                <div className="text-xs font-black bg-white text-indigo-900 px-3 py-2 rounded-xl">코드: {roomCode}</div>
              </div>
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {songs.map((song, idx) => (
                  <button key={song.id} onClick={() => setSelectedSongTab(idx)} className={`py-3 px-6 rounded-2xl text-xs font-black whitespace-nowrap ${selectedSongTab === idx ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border'}`}>
                    {idx + 1}. {song.title}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border shadow-sm space-y-4">
                  <h3 className="text-base font-black">📄 {songs[selectedSongTab]?.title} 악보</h3>
                  <div className="bg-slate-50 rounded-2xl border min-h-[400px] flex items-center justify-center p-4">
                    {songs[selectedSongTab]?.sheetUrl ? <img src={songs[selectedSongTab].sheetUrl} alt="악보" className="max-h-[500px]" /> : <p className="text-xs text-slate-400 font-bold">등록된 악보 이미지가 없습니다.</p>}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase">🎬 영상 링크</h4>
                    {songs[selectedSongTab]?.youtubeUrl ? <a href={songs[selectedSongTab].youtubeUrl} target="_blank" rel="noreferrer" className="block p-3.5 bg-red-50 rounded-2xl text-xs font-black text-red-600">유튜브 영상 보기 ➔</a> : <p className="text-xs text-slate-400">없음</p>}
                  </div>
                  <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase">📖 말씀 / 묵상</h4>
                    <p className="text-xs font-medium text-slate-600 whitespace-pre-wrap">{songs[selectedSongTab]?.meditation || '등록된 묵상이 없습니다.'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}
