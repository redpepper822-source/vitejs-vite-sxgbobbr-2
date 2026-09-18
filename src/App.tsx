import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, set, get, onValue } from 'firebase/database';

interface RoomHistory {
  code: string;
  name: string;
  role: 'leader' | 'member';
  lastAccessed: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<string>('login');
  
  // 실제 로그인 유저 상태
  const [user, setUser] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Firebase에서 불러올 내 히스토리 목록
  const [recentRooms, setRecentRooms] = useState<RoomHistory[]>([]);

  const [teamType, setTeamType] = useState<string>('praise'); 
  const [role, setRole] = useState<string | null>(null); 
  
  const [roomName, setRoomName] = useState<string>('청년부 주일 찬양팀');
  const [roomCode, setRoomCode] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('수'); 
  const [selectedTime, setSelectedTime] = useState<string>('19:30'); 

  // --- 1. 앱 실행 시 로그인 상태 실시간 감지 ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        setCurrentView('my_hub');
        loadUserHistory(currentUser.uid); // 로그인되면 내 히스토리 불러오기
      } else {
        setCurrentView('login');
      }
    });
    return () => unsubscribe();
  }, []);

  // --- 2. Firebase Database에서 내 히스토리 불러오기 ---
  const loadUserHistory = (uid: string) => {
    const historyRef = ref(db, `users/${uid}/history`);
    onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const historyArray = Object.values(data) as RoomHistory[];
        // 최신순으로 정렬
        historyArray.sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
        setRecentRooms(historyArray);
      } else {
        setRecentRooms([]);
      }
    });
  };

  // --- 3. 로그인 및 자동 회원가입 로직 ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return alert('이메일과 비밀번호를 입력해주세요.');
    
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (error: any) {
      // 계정이 없으면 에러가 나므로, 편의상 바로 회원가입 시도
      try {
        await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
        alert('새로운 계정으로 가입되어 로그인되었습니다!');
      } catch (err: any) {
        alert('로그인/가입 오류: ' + err.message);
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // --- 4. 방 생성 시 Firebase에 기록 저장 ---
  const createRoom = async () => {
    if (!user) return;
    
    // 무작위 6자리 코드 생성 (예: KPT-742)
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetters = Array.from({length: 3}, () => letters.charAt(Math.floor(Math.random() * letters.length))).join('');
    const randomNumbers = Math.floor(100 + Math.random() * 900).toString();
    const newCode = `${randomLetters}-${randomNumbers}`;
    
    setRoomCode(newCode);

    const roomData = {
      code: newCode,
      name: roomName,
      day: selectedDay,
      time: selectedTime,
      createdAt: new Date().toISOString()
    };

    const historyData: RoomHistory = {
      code: newCode,
      name: roomName,
      role: 'leader',
      lastAccessed: new Date().toISOString()
    };

    // DB에 방 정보 저장 및 내 히스토리에 추가
    await set(ref(db, `rooms/${newCode}`), roomData);
    await set(ref(db, `users/${user.uid}/history/${newCode}`), historyData);
    
    setCurrentView('admin_dash');
  };

  // --- 5. 방 참여 시 Firebase에서 확인 후 기록 저장 ---
  const joinRoom = async () => {
    if (!user) return;
    const inputCode = roomCode.toUpperCase();
    
    const roomRef = ref(db, `rooms/${inputCode}`);
    const snapshot = await get(roomRef);
    
    if (snapshot.exists()) {
      const rName = snapshot.val().name;
      setRoomName(rName);
      
      const historyData: RoomHistory = {
        code: inputCode,
        name: rName,
        role: 'member',
        lastAccessed: new Date().toISOString()
      };
      // 내 히스토리에 추가
      await set(ref(db, `users/${user.uid}/history/${inputCode}`), historyData);
      
      setRoomCode(inputCode);
      setCurrentView('member_dash');
    } else {
      alert('존재하지 않는 방 코드입니다. 다시 확인해주세요.');
    }
  };

  // 초기 로딩 화면
  if (isAuthLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-indigo-600">서버 연결 중...</div>;
  }

  return (
    <>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
        {/* 네비게이션 바 */}
        {currentView !== 'login' && (
          <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3.5 flex justify-between items-center">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('my_hub')}>
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-md">EH</div>
                <span className="font-black text-lg text-slate-900 tracking-tight">ENSEMBLE HUB</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="hidden md:inline-block text-xs font-bold text-slate-500 mr-2">{user?.email?.split('@')[0]}님</span>
                {currentView !== 'my_hub' && (
                  <button onClick={() => setCurrentView('my_hub')} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">⬅ 뒤로</button>
                )}
                <button onClick={handleLogout} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold">로그아웃</button>
              </div>
            </div>
          </header>
        )}

        <main className={`flex-1 flex flex-col ${currentView === 'login' ? 'justify-center' : ''} max-w-6xl mx-auto w-full p-4 md:p-8`}>
          
          {/* 로그인 화면 */}
          {currentView === 'login' && (
            <div className="max-w-sm mx-auto w-full bg-white rounded-3xl p-8 border shadow-2xl space-y-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">EH</div>
                <h1 className="text-2xl font-black text-slate-900">클라우드 동기화 로그인</h1>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <input type="email" placeholder="이메일 (아무거나 입력 시 자동가입)" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold" />
                <input type="password" placeholder="비밀번호 (6자리 이상)" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold" />
                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-slate-800 transition">이메일로 시작하기</button>
              </form>
            </div>
          )}

          {/* 내 워크스페이스 (방 목록 불러오기) */}
          {currentView === 'my_hub' && (
            <div className="max-w-4xl mx-auto w-full py-4 space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">나의 워크스페이스</h2>
                  <p className="text-sm text-slate-500">어떤 기기에서든 내 히스토리가 유지됩니다.</p>
                </div>
                <button onClick={() => setCurrentView('home')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg">
                  + 새로운 방 개설 / 참여
                </button>
              </div>

              {recentRooms.length === 0 ? (
                <div className="py-12 text-center bg-white border border-dashed border-slate-300 rounded-3xl text-slate-500 font-bold">
                  아직 참여하거나 개설한 방이 없습니다. 새로운 방을 만들어 보세요!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentRooms.map((room, idx) => (
                    <div key={idx} onClick={() => { setRoomCode(room.code); setRoomName(room.name); setCurrentView(room.role === 'leader' ? 'admin_dash' : 'member_dash'); }} className="bg-white p-6 rounded-3xl border shadow-sm cursor-pointer hover:shadow-md flex flex-col justify-between h-48">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase ${room.role === 'leader' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {room.role === 'leader' ? '👑 인도자' : '👤 단원'}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-400">{room.code}</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-800">{room.name}</h3>
                      </div>
                      <div className="text-xs font-bold text-slate-400">마지막 접속: {new Date(room.lastAccessed).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 방 개설 및 참여 분기 (홈) */}
          {currentView === 'home' && (
            <div className="max-w-xl mx-auto my-12 space-y-4">
              <button onClick={() => { setRole('leader'); setCurrentView('create_room'); }} className="w-full p-6 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg">👑 새로운 방 만들기</button>
              <button onClick={() => { setRole('member'); setCurrentView('join_room'); }} className="w-full p-6 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-lg">🔗 6자리 코드로 방 참여하기</button>
            </div>
          )}

          {/* 방 만들기 */}
          {currentView === 'create_room' && (
            <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border shadow-xl space-y-6">
              <h2 className="text-2xl font-black">방 개설</h2>
              <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl font-bold" placeholder="방 이름" />
              <button onClick={createRoom} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">방 생성 후 DB에 저장 ➔</button>
            </div>
          )}

          {/* 방 참여하기 */}
          {currentView === 'join_room' && (
            <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border shadow-xl space-y-6">
              <h2 className="text-2xl font-black">방 참여</h2>
              <input type="text" placeholder="방 코드 (예: KPT-742)" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl text-center text-xl font-black uppercase tracking-widest text-indigo-600" />
              <button onClick={joinRoom} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">클라우드 데이터 확인 후 입장 ➔</button>
            </div>
          )}

          {/* 대시보드 진입 화면 (UI 뼈대 유지) */}
          {(currentView === 'admin_dash' || currentView === 'member_dash') && (
            <div className="text-center py-20">
              <div className="inline-block p-6 bg-white rounded-3xl border shadow-xl">
                <h1 className="text-2xl font-black text-indigo-600 mb-2">{roomName}</h1>
                <p className="text-slate-500 font-bold mb-6">방 코드: <span className="text-slate-800 font-mono bg-slate-100 px-2 py-1 rounded">{roomCode}</span></p>
                <p className="text-sm text-slate-400">데이터가 실시간으로 동기화되어 저장되었습니다.<br/>이제 아이패드나 PC 어디서 접속해도 이 방 기록이 유지됩니다!</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
