import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  updateProfile,
  deleteUser
} from 'firebase/auth';
import { ref, set, get, onValue, remove } from 'firebase/database';

interface RoomHistory {
  code: string;
  name: string;
  role: 'leader' | 'member';
  lastAccessed: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<string>('login');
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true); 
  
  // 인증 및 사용자 상태
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // 회원가입 전용 추가 상태
  const [signupName, setSignupName] = useState('');
  const [signupPart, setSignupPart] = useState('보컬');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  
  // 프로필 관리 상태
  const [profilePart, setProfilePart] = useState('보컬');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // 대시보드 및 방 관련 상태
  const [recentRooms, setRecentRooms] = useState<RoomHistory[]>([]);
  const [teamType, setTeamType] = useState<string>('praise'); 
  const [role, setRole] = useState<string | null>(null); 
  const [roomName, setRoomName] = useState<string>('청년부 주일 찬양팀');
  const [roomCode, setRoomCode] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('수'); 
  const [selectedTime, setSelectedTime] = useState<string>('19:30'); 
  const partsList = ['보컬', '어쿠스틱 기타', '일렉 기타', '베이스', '드럼', '메인 건반', '세컨 건반', '엔지니어/미디어', '인도자'];

  // 약관 텍스트
  const termsText = `제1조 (목적)
본 약관은 ENSEMBLE HUB(이하 "서비스")가 제공하는 제반 서비스의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (회원의 의무)
① 회원은 서비스 가입 시 정확한 정보를 기재해야 하며, 타인의 정보를 도용할 수 없습니다.
② 회원은 본인의 계정(이메일, 비밀번호)을 안전하게 관리할 책임이 있으며, 계정 공유로 인해 발생하는 문제에 대한 책임은 회원 본인에게 있습니다.

제3조 (서비스의 변경 및 중지)
서비스는 운영상, 기술상의 필요에 따라 제공하고 있는 서비스를 변경하거나 중지할 수 있으며, 이 경우 사전에 공지합니다.`;

  const privacyText = `1. 수집하는 개인정보 항목
- 필수 항목: 이메일 주소, 비밀번호, 사용자 이름(닉네임), 주 포지션(세션)

2. 개인정보의 수집 및 이용 목적
- 회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별 및 인증
- 서비스 내 합주 방 개설 및 참여 기록 유지, 팀원 간의 원활한 소통 지원

3. 개인정보의 보유 및 이용 기간
- 원칙적으로 회원의 개인정보는 회원 탈퇴 시까지 보유 및 이용되며, 회원 탈퇴 즉시 지체 없이 영구 파기됩니다.

4. 동의를 거부할 권리
- 이용자는 본 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있으나, 동의 거부 시 서비스 회원가입 및 이용이 제한됩니다.`;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        setCurrentView('my_hub');
        loadUserHistory(currentUser.uid);
        loadUserProfile(currentUser.uid);
      } else {
        setCurrentView('login');
      }
    });
    return () => unsubscribe();
  }, []);

  const loadUserHistory = (uid: string) => {
    const historyRef = ref(db, `users/${uid}/history`);
    onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const historyArray = Object.values(data) as RoomHistory[];
        historyArray.sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
        setRecentRooms(historyArray);
      } else {
        setRecentRooms([]);
      }
    });
  };

  const loadUserProfile = (uid: string) => {
    get(ref(db, `users/${uid}/profile`)).then(snapshot => {
      if (snapshot.exists()) {
        setProfilePart(snapshot.val().mainPart || '보컬');
      }
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert('이메일과 비밀번호를 입력해주세요.');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      alert('로그인 실패: 이메일이나 비밀번호를 확인해주세요.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !signupName) return alert('모든 항목을 입력해주세요.');
    if (password.length < 6) return alert('비밀번호는 6자리 이상이어야 합니다.');
    if (!agreeTerms || !agreePrivacy) return alert('이용약관 및 개인정보 처리에 모두 동의하셔야 합니다.');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: signupName });
      await set(ref(db, `users/${userCredential.user.uid}/profile`), { mainPart: signupPart });
      alert('환영합니다! 회원가입이 완료되었습니다.');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') alert('이미 가입된 이메일입니다.');
      else alert('회원가입 오류: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setEmail('');
    setPassword('');
  };

  const updateProfileData = async () => {
    if (!user) return;
    try {
      await updateProfile(user, { displayName: signupName || user.displayName });
      await set(ref(db, `users/${user.uid}/profile`), { mainPart: profilePart });
      alert('프로필이 성공적으로 업데이트 되었습니다.');
      setCurrentView('my_hub');
    } catch (err: any) {
      alert('프로필 업데이트 오류: ' + err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmDelete = window.confirm(
      "정말로 탈퇴하시겠습니까? 탈퇴 시 모든 워크스페이스 히스토리와 프로필 정보가 영구적으로 삭제되며 복구할 수 없습니다."
    );
    if (!confirmDelete) return;

    try {
      await remove(ref(db, `users/${user.uid}`));
      await deleteUser(user);
      alert('그동안 이용해주셔서 감사합니다. 회원 탈퇴가 완료되었습니다.');
      setCurrentView('login');
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        alert('보안을 위해 다시 로그인한 후 탈퇴를 진행해 주세요.');
        handleLogout();
      } else {
        alert('회원 탈퇴 중 오류가 발생했습니다: ' + err.message);
      }
    }
  };

  const createRoom = async () => {
    if (!user) return;
    const randomLetters = Array.from({length: 3}, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(Math.floor(Math.random() * 26))).join('');
    const newCode = `${randomLetters}-${Math.floor(100 + Math.random() * 900)}`;
    setRoomCode(newCode);

    const roomData = { code: newCode, name: roomName, day: selectedDay, time: selectedTime };
    const historyData: RoomHistory = { code: newCode, name: roomName, role: 'leader', lastAccessed: new Date().toISOString() };

    await set(ref(db, `rooms/${newCode}`), roomData);
    await set(ref(db, `users/${user.uid}/history/${newCode}`), historyData);
    setCurrentView('admin_dash');
  };

  const joinRoom = async () => {
    if (!user) return;
    const inputCode = roomCode.toUpperCase();
    const snapshot = await get(ref(db, `rooms/${inputCode}`));
    
    if (snapshot.exists()) {
      const rName = snapshot.val().name;
      setRoomName(rName);
      const historyData: RoomHistory = { code: inputCode, name: rName, role: 'member', lastAccessed: new Date().toISOString() };
      await set(ref(db, `users/${user.uid}/history/${inputCode}`), historyData);
      setRoomCode(inputCode);
      setCurrentView('member_dash');
    } else {
      alert('존재하지 않는 방 코드입니다.');
    }
  };

  if (isAuthLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-indigo-600">안전하게 서버 연결 중...</div>;
  }

  return (
    <>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
        
        {/* 상단 네비게이션 */}
        {currentView !== 'login' && (
          <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3.5 flex justify-between items-center">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('my_hub')}>
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-md">EH</div>
                <span className="font-black text-lg text-slate-900 tracking-tight hidden sm:inline-block">ENSEMBLE HUB</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-500 mr-1">{user?.displayName || '유저'}님</span>
                <button onClick={() => { setSignupName(user?.displayName || ''); setCurrentView('profile'); }} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition">프로필 설정</button>
                <button onClick={handleLogout} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition">로그아웃</button>
              </div>
            </div>
          </header>
        )}

        <main className={`flex-1 flex flex-col ${currentView === 'login' ? 'justify-center' : ''} max-w-6xl mx-auto w-full p-4 md:p-8`}>
          
          {/* --- [로그인 / 회원가입 화면] --- */}
          {currentView === 'login' && (
            <div className="max-w-md mx-auto w-full bg-white rounded-3xl p-6 md:p-8 border shadow-xl space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">EH</div>
                <h1 className="text-2xl font-black text-slate-900">{isLoginMode ? '환영합니다' : '새 계정 만들기'}</h1>
                <p className="text-xs text-slate-500 font-medium">
                  {isLoginMode ? 'ENSEMBLE HUB에 로그인하세요.' : '가입하여 나와 팀의 합주를 기록하세요.'}
                </p>
              </div>

              <form onSubmit={isLoginMode ? handleLogin : handleSignup} className="space-y-5">
                <div className="space-y-3">
                  <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500" />
                  <input type="password" placeholder="비밀번호 (6자리 이상)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500" />
                </div>
                
                {!isLoginMode && (
                  <div className="space-y-5 animate-fadeIn">
                    <div className="flex space-x-2">
                      <input type="text" placeholder="닉네임 (이름)" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="w-1/2 p-4 bg-slate-50 border rounded-xl text-sm font-bold focus:outline-none" />
                      <select value={signupPart} onChange={(e) => setSignupPart(e.target.value)} className="w-1/2 p-4 bg-slate-50 border rounded-xl text-sm font-bold focus:outline-none">
                        {partsList.map(part => <option key={part} value={part}>{part}</option>)}
                      </select>
                    </div>

                    <div className="space-y-4">
                      {/* 서비스 이용약관 영역 */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 ml-1">서비스 이용약관</label>
                        <div className="h-28 overflow-y-auto p-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-relaxed whitespace-pre-wrap">
                          {termsText}
                        </div>
                        <div className="flex items-center space-x-2 ml-1">
                          <input type="checkbox" id="terms" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                          <label htmlFor="terms" className="text-xs font-bold text-slate-700 cursor-pointer">(필수) 위 서비스 이용약관에 동의합니다.</label>
                        </div>
                      </div>

                      {/* 개인정보 처리방침 영역 */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 ml-1">개인정보 수집 및 이용</label>
                        <div className="h-28 overflow-y-auto p-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-relaxed whitespace-pre-wrap">
                          {privacyText}
                        </div>
                        <div className="flex items-center space-x-2 ml-1">
                          <input type="checkbox" id="privacy" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                          <label htmlFor="privacy" className="text-xs font-bold text-slate-700 cursor-pointer">(필수) 위 개인정보 수집 및 이용에 동의합니다.</label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-slate-800 transition mt-2">
                  {isLoginMode ? '로그인' : '동의하고 가입하기'}
                </button>
              </form>

              <div className="text-center pt-2">
                <button onClick={() => { setIsLoginMode(!isLoginMode); setEmail(''); setPassword(''); }} className="text-xs font-bold text-indigo-600 hover:underline">
                  {isLoginMode ? '아직 계정이 없으신가요? 30초 회원가입' : '이미 계정이 있으신가요? 로그인'}
                </button>
              </div>
            </div>
          )}

          {/* --- [프로필 설정 및 탈퇴 화면] --- */}
          {currentView === 'profile' && (
            <div className="max-w-md mx-auto w-full space-y-6 py-8">
              <h2 className="text-2xl font-black text-slate-900">내 프로필 설정</h2>
              
              <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">로그인 계정</label>
                  <input type="text" value={user?.email || ''} disabled className="w-full p-3 bg-slate-100 border rounded-xl text-sm font-bold text-slate-400 cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">사용자 이름 (닉네임)</label>
                  <input type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">나의 기본 포지션 (세션)</label>
                  <select value={profilePart} onChange={(e) => setProfilePart(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold">
                    {partsList.map(part => <option key={part} value={part}>{part}</option>)}
                  </select>
                </div>
                <button onClick={updateProfileData} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-md hover:bg-indigo-700 transition">
                  변경사항 저장
                </button>
              </div>

              {/* Danger Zone: 회원 탈퇴 */}
              <div className="bg-red-50 rounded-3xl p-6 border border-red-100 mt-8">
                <h3 className="text-sm font-black text-red-600 mb-2">Danger Zone</h3>
                <p className="text-xs text-red-500 font-medium mb-4 leading-relaxed">
                  계정을 삭제하면 지금까지 참여한 모든 방 히스토리 및 내 프로필 정보가 데이터베이스에서 즉시 파기되며, 영구적으로 복구할 수 없습니다.
                </p>
                <button onClick={handleDeleteAccount} className="w-full py-3 bg-white border-2 border-red-200 text-red-600 rounded-xl font-black hover:bg-red-100 transition">
                  회원 탈퇴 및 데이터 삭제
                </button>
              </div>
            </div>
          )}

          {/* --- [나의 워크스페이스] --- */}
          {currentView === 'my_hub' && (
            <div className="max-w-4xl mx-auto w-full py-4 space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">{user?.displayName || '유저'}님의 공간</h2>
                  <p className="text-sm text-slate-500">최근에 참여한 모든 합주 방입니다.</p>
                </div>
                <button onClick={() => setCurrentView('home')} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black shadow-lg">
                  + 새로운 방 개설 / 참여
                </button>
              </div>

              {recentRooms.length === 0 ? (
                <div className="py-12 text-center bg-white border border-dashed rounded-3xl text-slate-500 font-bold">
                  아직 참여한 방이 없습니다. 새로운 방을 만들어 보세요!
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- 방 진입 및 생략된 기타 화면들 --- */}
          {currentView === 'home' && (
            <div className="max-w-xl mx-auto my-12 space-y-4">
              <button onClick={() => { setRole('leader'); setCurrentView('create_room'); }} className="w-full p-6 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg">👑 새로운 방 개설하기</button>
              <button onClick={() => { setRole('member'); setCurrentView('join_room'); }} className="w-full p-6 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-lg">🔗 방 참여하기 (6자리 코드)</button>
            </div>
          )}

          {currentView === 'create_room' && (
            <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border shadow-xl space-y-6">
              <h2 className="text-2xl font-black">방 개설</h2>
              <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl font-bold" placeholder="방 이름" />
              <button onClick={createRoom} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">방 생성 완료 ➔</button>
            </div>
          )}

          {currentView === 'join_room' && (
            <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border shadow-xl space-y-6">
              <h2 className="text-2xl font-black">방 참여</h2>
              <input type="text" placeholder="방 코드 (예: KPT-742)" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl text-center text-xl font-black uppercase tracking-widest text-indigo-600" />
              <button onClick={joinRoom} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">입장하기 ➔</button>
            </div>
          )}

          {(currentView === 'admin_dash' || currentView === 'member_dash') && (
            <div className="text-center py-20">
              <div className="inline-block p-6 bg-white rounded-3xl border shadow-xl">
                <h1 className="text-2xl font-black text-indigo-600 mb-2">{roomName}</h1>
                <p className="text-slate-500 font-bold mb-6">방 코드: <span className="text-slate-800 font-mono bg-slate-100 px-2 py-1 rounded">{roomCode}</span></p>
                <button onClick={() => setCurrentView('my_hub')} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-sm">워크스페이스로 돌아가기</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
