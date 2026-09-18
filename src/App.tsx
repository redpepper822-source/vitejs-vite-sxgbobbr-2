import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, deleteUser } from 'firebase/auth';
import { ref, set, get, onValue, remove } from 'firebase/database';

interface Song {
  id: string;
  title: string;
  form: string;
  sheetUrl: string; 
  youtubeUrl: string;
}

interface Volunteer {
  id: string;
  part: string;
  name: string;
}

interface RoomHistory {
  code: string;
  name: string;
  role: 'leader' | 'member';
  lastAccessed: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<string>('login');
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true); 
  
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberId, setRememberId] = useState<boolean>(false); 
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupPart, setSignupPart] = useState('보컬');
  
  const [termsScrolled, setTermsScrolled] = useState(false);
  const [privacyScrolled, setPrivacyScrolled] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  
  const [profilePart, setProfilePart] = useState('보컬');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [recentRooms, setRecentRooms] = useState<RoomHistory[]>([]);
  const [roomName, setRoomName] = useState<string>('청년부 주일 찬양팀');
  const [roomCode, setRoomCode] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('수'); 
  const [selectedTime, setSelectedTime] = useState<string>('19:30'); 
  
  // 방 생성 시 설정할 찬양팀 구성 목록 (기본 세팅)
  const defaultAvailableParts = ['싱어', '건반', '세컨', '베이스', '드럼', '어쿠스틱 기타', '일렉기타'];
  const [roomVolunteers, setRoomVolunteers] = useState<Volunteer[]>([
    { id: '1', part: '싱어', name: '' },
    { id: '2', part: '건반', name: '' },
    { id: '3', part: '베이스', name: '' },
    { id: '4', part: '드럼', name: '' }
  ]);
  const [newPartName, setNewPartName] = useState('싱어');

  const [songs, setSongs] = useState<Song[]>([]);
  const [scripture, setScripture] = useState<string>(''); 
  const [meditation, setMeditation] = useState<string>(''); 
  
  const [adminTab, setAdminTab] = useState<'songs' | 'volunteers' | 'note'>('songs'); 
  const [selectedSongTab, setSelectedSongTab] = useState<number>(0); 

  const partsList = ['보컬', '어쿠스틱 기타', '일렉 기타', '베이스', '드럼', '메인 건반', '세컨 건반', '엔지니어/미디어', '인도자'];
  const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];

  const termsText = `제1조 (목적) 본 약관은 ENSEMBLE HUB(이하 "서비스")가 제공하는 제반 서비스의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항을 규정합니다.
제2조 (회원의 의무) 회원은 서비스 가입 시 정확한 정보를 기재해야 하며, 계정 정보를 안전하게 관리할 책임이 있습니다.
제3조 (서비스 제공) 팀원 간 콘티 공유 및 일정 관리를 위한 실시간 동기화 플랫폼을 제공합니다. (내용을 끝까지 읽고 동의해주세요.)`;

  const privacyText = `1. 수집하는 개인정보: 이메일, 비밀번호, 닉네임, 주 세션 파트
2. 수집 및 이용 목적: 회원 식별, 합주 방 개설 및 참여 기록 유지, 실시간 콘티 동기화
3. 보유 및 이용 기간: 회원 탈퇴 시 즉시 영구 파기됩니다.
4. 동의 거부 권리: 동의를 거부할 수 있으나 거부 시 서비스 이용이 제한됩니다. (내용을 끝까지 읽고 동의해주세요.)`;

  useEffect(() => {
    const savedEmail = localStorage.getItem('ensemble_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberId(true);
    }
  }, []);

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
    onValue(ref(db, `users/${uid}/history`), (snapshot) => {
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
      if (snapshot.exists()) setProfilePart(snapshot.val().mainPart || '보컬');
    });
  };

  // 월요일 자동 초기화 체크 및 방 데이터 로드
  useEffect(() => {
    let unsubscribeRoom = () => {};
    if ((currentView === 'admin_dash' || currentView === 'member_dash') && roomCode) {
      const roomRef = ref(db, `rooms/${roomCode}`);
      const unsub = onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          
          // 매주 월요일 초기화 로직 체크
          const lastResetDate = data.lastResetDate || '';
          const today = new Date();
          // 이번 주 월요일 날짜 문자열 계산 (YYYY-MM-DD)
          const dayOfWeekIdx = today.getDay(); // 0(일)~6(토)
          const diffToMonday = today.getDate() - dayOfWeekIdx + (dayOfWeekIdx === 0 ? -6 : 1);
          const mondayDate = new Date(today.setDate(diffToMonday)).toISOString().split('T')[0];

          if (lastResetDate !== mondayDate) {
            // 월요일이 바뀌었으므로 콘티 곡 및 봉사자 명단 초기화 실행
            const resetSongs = [{ id: Date.now().toString(), title: '새로운 콘티 곡', form: 'Verse - Chorus', sheetUrl: '', youtubeUrl: '' }];
            const resetVolunteers = (data.volunteers || []).map((v: Volunteer) => ({ ...v, name: '' }));
            
            set(roomRef, {
              ...data,
              songs: resetSongs,
              volunteers: resetVolunteers,
              scripture: '',
              meditation: '',
              lastResetDate: mondayDate
            });
            return;
          }

          setRoomName(data.name || '합주 방');
          setSelectedDay(data.day || '수');
          setSelectedTime(data.time || '19:30');
          if (data.songs) setSongs(data.songs);
          else setSongs([]);
          if (data.volunteers) setRoomVolunteers(data.volunteers);
          if (data.scripture) setScripture(data.scripture);
          if (data.meditation) setMeditation(data.meditation);
        }
      });
      unsubscribeRoom = unsub;
    }
    return () => unsubscribeRoom();
  }, [currentView, roomCode]);

  const saveToDB = async (newSongs: Song[], newVolunteers: Volunteer[], newScripture: string, newMeditation: string) => {
    setSongs(newSongs);
    setRoomVolunteers(newVolunteers);
    setScripture(newScripture);
    setMeditation(newMeditation);
    if (roomCode) {
      await set(ref(db, `rooms/${roomCode}/songs`), newSongs);
      await set(ref(db, `rooms/${roomCode}/volunteers`), newVolunteers);
      await set(ref(db, `rooms/${roomCode}/scripture`), newScripture);
      await set(ref(db, `rooms/${roomCode}/meditation`), newMeditation);
    }
  };

  const handleAddSong = () => {
    const newSong: Song = { id: Date.now().toString(), title: `새로운 곡 ${songs.length + 1}`, form: 'Intro - Verse - Chorus', sheetUrl: '', youtubeUrl: '' };
    saveToDB([...songs, newSong], roomVolunteers, scripture, meditation);
  };

  const handleUpdateSong = (id: string, field: keyof Song, value: string) => {
    const updatedSongs = songs.map(song => song.id === id ? { ...song, [field]: value } : song);
    saveToDB(updatedSongs, roomVolunteers, scripture, meditation);
  };

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdateSong(id, 'sheetUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteSong = (id: string) => {
    if (songs.length <= 1) return alert('최소 한 곡은 등록되어야 합니다.');
    if (window.confirm('이 곡을 삭제하시겠습니까?')) {
      const updatedSongs = songs.filter(song => song.id !== id);
      if (selectedSongTab >= updatedSongs.length) setSelectedSongTab(0);
      saveToDB(updatedSongs, roomVolunteers, scripture, meditation);
    }
  };

  // 방 생성 시 찬양팀 구성 파트 추가/삭제 관리
  const handleAddVolunteerPart = () => {
    const newItem: Volunteer = { id: Date.now().toString(), part: newPartName, name: '' };
    setRoomVolunteers([...roomVolunteers, newItem]);
  };

  const handleDeleteVolunteerPart = (id: string) => {
    setRoomVolunteers(roomVolunteers.filter(v => v.id !== id));
  };

  const handleUpdateVolunteerName = (id: string, name: string) => {
    const updated = roomVolunteers.map(v => v.id === id ? { ...v, name } : v);
    saveToDB(songs, updated, scripture, meditation);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert('이메일과 비밀번호를 입력해주세요.');
    
    if (rememberId) localStorage.setItem('ensemble_saved_email', email);
    else localStorage.removeItem('ensemble_saved_email');

    if (isLoginMode) {
      try { await signInWithEmailAndPassword(auth, email, password); } 
      catch (err) { alert('로그인 실패: 이메일과 비밀번호를 확인해주세요.'); }
    } else {
      if (password.length < 6) return alert('비밀번호는 6자리 이상이어야 합니다.');
      if (password !== confirmPassword) return alert('비밀번호와 비밀번호 확인란이 일치하지 않습니다.');
      if (!agreeTerms || !agreePrivacy) return alert('약관을 끝까지 읽고 모두 동의해 주세요.');
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: signupName });
        await set(ref(db, `users/${cred.user.uid}/profile`), { mainPart: signupPart });
        alert('회원가입 완료!');
      } catch (err: any) {
        alert(err.code === 'auth/email-already-in-use' ? '이미 가입된 이메일입니다.' : '가입 오류');
      }
    }
  };

  const createRoom = async () => {
    if (!user) return;
    const code = `${Array.from({length: 3}, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ').charAt(Math.floor(Math.random()*26))).join('')}-${Math.floor(100+Math.random()*900)}`;
    setRoomCode(code);

    const today = new Date();
    const dayOfWeekIdx = today.getDay();
    const diffToMonday = today.getDate() - dayOfWeekIdx + (dayOfWeekIdx === 0 ? -6 : 1);
    const mondayDate = new Date(today.setDate(diffToMonday)).toISOString().split('T')[0];

    const defaultSongs = [{ id: Date.now().toString(), title: '첫 번째 곡', form: 'Verse - Chorus', sheetUrl: '', youtubeUrl: '' }];
    
    await set(ref(db, `rooms/${code}`), { 
      code, 
      name: roomName, 
      day: selectedDay, 
      time: selectedTime, 
      createdAt: new Date().toISOString(), 
      songs: defaultSongs, 
      volunteers: roomVolunteers,
      scripture: '', 
      meditation: '',
      lastResetDate: mondayDate
    });
    
    await set(ref(db, `users/${user.uid}/history/${code}`), { code, name: roomName, role: 'leader', lastAccessed: new Date().toISOString() });
    
    setCurrentView('admin_dash');
  };

  const joinRoom = async () => {
    if (!user) return;
    const input = roomCode.toUpperCase();
    const snap = await get(ref(db, `rooms/${input}`));
    if (snap.exists()) {
      setRoomName(snap.val().name);
      await set(ref(db, `users/${user.uid}/history/${input}`), { code: input, name: snap.val().name, role: 'member', lastAccessed: new Date().toISOString() });
      setRoomCode(input);
      setCurrentView('member_dash');
    } else {
      alert('존재하지 않는 방 코드입니다.');
    }
  };

  const handleLogout = () => { signOut(auth); setPassword(''); setConfirmPassword(''); };

  if (isAuthLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-indigo-600">안전하게 연결 중...</div>;

  return (
    <>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      <head>
        <title>ENSEMBLE HUB</title>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ensemble Hub" />
        <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='25' fill='%234f46e5'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='42' font-weight='900' font-family='sans-serif'>EH</text></svg>" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='25' fill='%234f46e5'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='42' font-weight='900' font-family='sans-serif'>EH</text></svg>" />
      </head>

      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col pb-10">
        
        {currentView !== 'login' && (
          <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3.5 flex justify-between items-center">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('my_hub')}>
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm font-black shadow-md">EH</div>
                <span className="font-black text-lg text-slate-900 tracking-tight hidden sm:inline-block">ENSEMBLE HUB</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-500 mr-1">🧑‍🎤 {user?.displayName}님 ({profilePart})</span>
                <button onClick={() => setCurrentView('profile')} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100">⚙️ 프로필</button>
                <button onClick={handleLogout} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200">👋 로그아웃</button>
              </div>
            </div>
          </header>
        )}

        <main className={`flex-1 flex flex-col ${currentView === 'login' ? 'justify-center' : ''} max-w-6xl mx-auto w-full p-4 md:p-8`}>
          
          {currentView === 'login' && (
            <div className="max-w-md mx-auto w-full bg-white rounded-3xl p-8 border shadow-xl space-y-6">
               <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg tracking-wider">EH</div>
                <h1 className="text-2xl font-black text-slate-900">{isLoginMode ? '환영합니다' : '새로운 앙상블 합류하기'}</h1>
                <p className="text-xs text-slate-500 font-medium">
                  {isLoginMode ? 'ENSEMBLE HUB에 로그인하세요.' : '가입하고 모든 합주 기록을 연동하세요.'}
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <input type="email" placeholder="이메일 주소" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-500" />
                
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="비밀번호 (6자리 이상)" 
                    value={password} 
                    onChange={(e)=>setPassword(e.target.value)} 
                    className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-500" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-indigo-600"
                  >
                    {showPassword ? "숨기기 🙈" : "보기 👁️"}
                  </button>
                </div>

                {!isLoginMode && (
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="비밀번호 확인" 
                      value={confirmPassword} 
                      onChange={(e)=>setConfirmPassword(e.target.value)} 
                      className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-500" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-indigo-600"
                    >
                      {showConfirmPassword ? "숨기기 🙈" : "보기 👁️"}
                    </button>
                  </div>
                )}
                
                {isLoginMode && (
                  <div className="flex items-center space-x-2 px-1">
                    <input type="checkbox" id="remember" checked={rememberId} onChange={(e)=>setRememberId(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded cursor-pointer border-slate-300" />
                    <label htmlFor="remember" className="text-xs font-bold text-slate-600 cursor-pointer">아이디 저장하기</label>
                  </div>
                )}

                {!isLoginMode && (
                  <div className="space-y-4 pt-2">
                    <div className="flex space-x-2">
                      <input type="text" placeholder="닉네임" value={signupName} onChange={(e)=>setSignupName(e.target.value)} className="w-1/2 p-4 bg-slate-50 border rounded-2xl text-sm font-bold focus:outline-none" />
                      <select value={signupPart} onChange={(e)=>setSignupPart(e.target.value)} className="w-1/2 p-4 bg-slate-50 border rounded-2xl text-sm font-bold focus:outline-none">
                        {partsList.map(p=><option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">📜 서비스 이용약관 (끝까지 스크롤하세요)</label>
                        <div 
                          onScroll={(e) => {
                            const target = e.currentTarget;
                            if (target.scrollHeight - target.scrollTop <= target.clientHeight + 15) {
                              setTermsScrolled(true);
                            }
                          }}
                          className="h-24 overflow-y-auto p-3 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-relaxed whitespace-pre-wrap"
                        >
                          {termsText}
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          <input 
                            type="checkbox" 
                            id="term1" 
                            disabled={!termsScrolled}
                            checked={agreeTerms} 
                            onChange={e=>setAgreeTerms(e.target.checked)} 
                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer disabled:opacity-40" 
                          />
                          <label htmlFor="term1" className={`text-xs font-bold cursor-pointer ${termsScrolled ? 'text-slate-700' : 'text-slate-400'}`}>
                            {termsScrolled ? '(필수) 서비스 이용약관 동의 완료' : '(필수) 약관을 맨 아래까지 읽어주세요'}
                          </label>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200">
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">🛡️ 개인정보 수집 및 이용 (끝까지 스크롤하세요)</label>
                        <div 
                          onScroll={(e) => {
                            const target = e.currentTarget;
                            if (target.scrollHeight - target.scrollTop <= target.clientHeight + 15) {
                              setPrivacyScrolled(true);
                            }
                          }}
                          className="h-24 overflow-y-auto p-3 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-relaxed whitespace-pre-wrap"
                        >
                          {privacyText}
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          <input 
                            type="checkbox" 
                            id="term2" 
                            disabled={!privacyScrolled}
                            checked={agreePrivacy} 
                            onChange={e=>setAgreePrivacy(e.target.checked)} 
                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer disabled:opacity-40" 
                          />
                          <label htmlFor="term2" className={`text-xs font-bold cursor-pointer ${privacyScrolled ? 'text-slate-700' : 'text-slate-400'}`}>
                            {privacyScrolled ? '(필수) 개인정보 수집 동의 완료' : '(필수) 약관을 맨 아래까지 읽어주세요'}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" className="w-full py-4 mt-2 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-indigo-700 active:scale-95 transition">
                  {isLoginMode ? '로그인' : '동의하고 가입하기'}
                </button>
              </form>

              <div className="text-center pt-4 border-t border-slate-100">
                <button onClick={() => { setIsLoginMode(!isLoginMode); setPassword(''); setConfirmPassword(''); }} className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition">
                  {isLoginMode ? '아직 계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인 화면으로'}
                </button>
              </div>
            </div>
          )}

          {currentView === 'my_hub' && (
            <div className="max-w-4xl mx-auto w-full space-y-8">
              <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-slate-200 pb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">🏕️ {user?.displayName}님의 워크스페이스</h2>
                  <p className="text-sm text-slate-500 mt-2">이전에 참여했거나 개설한 방에 바로 접속할 수 있습니다.</p>
                </div>
                <button onClick={() => setCurrentView('home')} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition">
                  <div className="text-base">🚀 새로운 활동 시작하기</div>
                  <div className="text-[10px] text-indigo-200 font-medium">새 방 개설 또는 초대 코드 입력</div>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {recentRooms.map((room, idx) => (
                  <div key={idx} onClick={() => { setRoomCode(room.code); setCurrentView(room.role === 'leader' ? 'admin_dash' : 'member_dash'); }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition flex flex-col justify-between h-48 group">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-md ${room.role === 'leader' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {room.role === 'leader' ? '👑 리더 권한' : '🧑‍🎤 단원 권한'}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400">🎫 {room.code}</span>
                      </div>
                      <h3 className="text-xl font-black text-slate-800 group-hover:text-indigo-600 transition">{room.name}</h3>
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 bg-slate-50 p-2 rounded-lg text-center">
                      해당 방 대시보드로 이동 ➔
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'home' && (
            <div className="max-w-4xl mx-auto my-12 grid grid-cols-1 md:grid-cols-2 gap-6">
              <button onClick={() => setCurrentView('create_room')} className="p-8 bg-indigo-600 text-white rounded-3xl shadow-xl hover:bg-indigo-700 transition text-left space-y-4 flex flex-col justify-between">
                <div className="text-4xl">👑</div>
                <div>
                  <h3 className="text-2xl font-black mb-1">새로운 합주 방 만들기</h3>
                  <p className="text-xs text-indigo-200 leading-relaxed">인도자(리더) 전용 메뉴입니다. 새로운 방을 개설하고 단원들에게 코드를 공유할 수 있습니다.</p>
                </div>
              </button>
              <button onClick={() => setCurrentView('join_room')} className="p-8 bg-indigo-700 text-white rounded-3xl shadow-xl hover:bg-indigo-800 transition text-left space-y-4 flex flex-col justify-between">
                <div className="text-4xl">🎫</div>
                <div>
                  <h3 className="text-2xl font-black mb-1">초대 코드로 방 참여하기</h3>
                  <p className="text-xs text-indigo-200 leading-relaxed">단원 전용 메뉴입니다. 리더에게 전달받은 6자리 코드를 입력하여 악보를 확인하세요.</p>
                </div>
              </button>
            </div>
          )}

          {/* 방 개설 상세 설정 (찬양팀 구성 설정 추가) */}
          {currentView === 'create_room' && (
            <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
              <div>
                <h2 className="text-2xl font-black">🛠️ 방 개설 상세 설정</h2>
                <p className="text-xs text-slate-500 mt-1">방 이름, 연습 시간 및 찬양팀 구성을 설정해 주세요.</p>
              </div>
              <div className="space-y-4">
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">🏷️ 방 이름</label><input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl font-bold" /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">📅 연습 요일</label><div className="flex gap-1">{daysOfWeek.map(d=><button key={d} onClick={()=>setSelectedDay(d)} className={`flex-1 py-3 rounded-xl font-bold text-xs ${selectedDay===d?'bg-indigo-600 text-white':'bg-slate-100 text-slate-500'}`}>{d}</button>)}</div></div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">⏰ 연습 시간</label>
                  <input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl font-bold text-center" />
                </div>

                {/* 찬양팀 구성 설정 탭 및 추가하기 */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-indigo-600 block">👥 우리 찬양팀 구성 설정</label>
                  <div className="flex space-x-2">
                    <select value={newPartName} onChange={(e) => setNewPartName(e.target.value)} className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs font-bold">
                      {defaultAvailableParts.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button type="button" onClick={handleAddVolunteerPart} className="px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">
                      + 추가하기
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {roomVolunteers.map(v => (
                      <div key={v.id} className="flex items-center space-x-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-900">
                        <span>{v.part}</span>
                        <button type="button" onClick={() => handleDeleteVolunteerPart(v.id)} className="text-red-500 hover:text-red-700 ml-1">×</button>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={createRoom} className="w-full py-4 px-4 bg-indigo-600 text-white rounded-2xl shadow-lg mt-4 flex flex-col items-center justify-center">
                  <span className="text-base font-black">✨ 방 생성 완료 및 관리자 콘솔 입장</span>
                  <span className="text-[10px] font-medium text-indigo-200 mt-0.5">설정된 정보로 데이터베이스에 방을 등록합니다</span>
                </button>
              </div>
            </div>
          )}

          {currentView === 'join_room' && (
            <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
               <div>
                <h2 className="text-2xl font-black">🚪 방 참여코드 입력</h2>
                <p className="text-xs text-slate-500 mt-1">대소문자 구분 없이 6자리를 입력하세요.</p>
              </div>
              <input type="text" placeholder="예: KPT-742" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} className="w-full p-5 bg-slate-50 border rounded-2xl text-center text-2xl font-black uppercase tracking-widest text-indigo-600" />
              <button onClick={joinRoom} className="w-full py-5 bg-indigo-600 text-white rounded-2xl shadow-lg flex flex-col items-center">
                <span className="text-lg font-black">🔍 데이터 확인 후 입장하기</span>
                <span className="text-[11px] font-medium text-indigo-200">올바른 코드인지 확인하고 단원 화면으로 이동합니다</span>
              </button>
            </div>
          )}

          {/* 인도자 관리 콘솔 (봉사자 명단 탭 추가) */}
          {currentView === 'admin_dash' && (
            <div className="space-y-6 pb-20">
              <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <span className="text-[10px] font-black bg-indigo-500 px-3 py-1.5 rounded-full uppercase">👑 인도자 관리 콘솔</span>
                  <h1 className="text-3xl font-black mt-3">{roomName}</h1>
                  <p className="text-sm text-slate-400 mt-2">⏰ 정기 연습: 매주 {selectedDay}요일 {selectedTime} (매주 월요일 초기화 ⚡)</p>
                </div>
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 min-w-[200px] text-center flex flex-col justify-center">
                  <div className="text-xs font-bold text-slate-400 mb-1">🎫 단원 초대용 공유 코드</div>
                  <div className="text-2xl font-black font-mono text-indigo-400">{roomCode}</div>
                </div>
              </div>

              {/* 탭 전환 (콘티 곡 관리 / 봉사자 명단 / 말씀 및 묵상) */}
              <div className="flex bg-slate-200 p-1.5 rounded-2xl max-w-lg mx-auto my-4">
                <button 
                  onClick={() => setAdminTab('songs')} 
                  className={`flex-1 py-3 rounded-xl text-xs font-black transition ${adminTab === 'songs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  🎵 콘티 곡 관리 ({songs.length})
                </button>
                <button 
                  onClick={() => setAdminTab('volunteers')} 
                  className={`flex-1 py-3 rounded-xl text-xs font-black transition ${adminTab === 'volunteers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  🙋‍♂️ 이번 주 봉사자 명단
                </button>
                <button 
                  onClick={() => setAdminTab('note')} 
                  className={`flex-1 py-3 rounded-xl text-xs font-black transition ${adminTab === 'note' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  📖 묵상 노트
                </button>
              </div>

              {adminTab === 'songs' ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">📝 콘티 곡 상세 에디터</h3>
                      <p className="text-xs text-slate-500 mt-1">수정 즉시 실시간으로 단원들 화면에 ⚡ 동기화됩니다.</p>
                    </div>
                    <button onClick={handleAddSong} className="px-5 py-3 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition flex items-center space-x-1">
                      <span className="text-sm font-black">+ 🎵 새로운 곡 추가</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {songs.map((song, idx) => (
                      <div key={song.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                          <span className="text-xs font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">🎹 {idx + 1}번 곡 설정</span>
                          <button onClick={() => handleDeleteSong(song.id)} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-lg hover:bg-red-100">🗑️ 삭제</button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">🏷️ 곡 제목</label>
                            <input type="text" value={song.title} onChange={(e) => handleUpdateSong(song.id, 'title', e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">🔄 송폼 (곡의 흐름)</label>
                            <input type="text" value={song.form} onChange={(e) => handleUpdateSong(song.id, 'form', e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">🎬 유튜브 영상 URL</label>
                            <input type="text" value={song.youtubeUrl} onChange={(e) => handleUpdateSong(song.id, 'youtubeUrl', e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs" placeholder="https://youtube.com/..." />
                          </div>
                          
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">📄 악보 이미지 (스마트폰 갤러리에서 가져오기)</label>
                            <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(song.id, e)} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer" />
                            </div>
                            {song.sheetUrl && (
                              <div className="mt-2 relative w-full h-32 bg-slate-100 rounded-xl overflow-hidden border">
                                <img src={song.sheetUrl} alt="악보 미리보기" className="w-full h-full object-contain" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : adminTab === 'volunteers' ? (
                /* 이번 주 봉사자 명단 관리 탭 */
                <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">🙋‍♂️ 이번 주 찬양팀 봉사자 명단</h3>
                    <p className="text-xs text-slate-500 mt-1">각 파트별 섬기는 봉사자의 이름을 입력하세요. (매주 월요일 자동 초기화)</p>
                  </div>
                  <div className="space-y-3">
                    {roomVolunteers.map((v) => (
                      <div key={v.id} className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <span className="w-32 text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-2 rounded-xl text-center">{v.part}</span>
                        <input 
                          type="text" 
                          value={v.name} 
                          onChange={(e) => handleUpdateVolunteerName(v.id, e.target.value)} 
                          placeholder="봉사자 이름 입력" 
                          className="flex-1 p-2 bg-white border rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500" 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">📖 예배 말씀 및 인도자 묵상 노트 설정</h3>
                    <p className="text-xs text-slate-500 mt-1">이번 주 찬양 예배와 관련된 말씀과 묵상 내용을 단원들과 공유합니다.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-indigo-600 block mb-1">📖 이번 주 말씀 구절</label>
                      <input type="text" value={scripture} onChange={(e) => saveToDB(songs, roomVolunteers, e.target.value, meditation)} placeholder="예: 시편 100:1-5" className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-indigo-600 block mb-1">💭 인도자 묵상 노트</label>
                      <textarea rows={6} value={meditation} onChange={(e) => saveToDB(songs, roomVolunteers, scripture, e.target.value)} placeholder="이번 주 찬양 콘티의 방향성과 묵상 나눔을 적어주세요." className="w-full p-4 bg-slate-50 border rounded-xl text-sm leading-relaxed" />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-slate-200">
                <button onClick={() => setCurrentView('member_dash')} className="w-full py-5 bg-slate-100 text-slate-700 rounded-2xl shadow-sm border border-slate-200 hover:bg-slate-200 transition flex flex-col items-center">
                  <span className="text-base font-black">👁️ 단원 앱 화면 미리보기</span>
                  <span className="text-[11px] font-bold text-slate-500">단원들의 기기에서 어떻게 보이는지 직접 확인합니다</span>
                </button>
              </div>
            </div>
          )}

          {/* 단원 뷰 (봉사자 명단 카드 추가 연동) */}
          {currentView === 'member_dash' && (
            <div className="space-y-6 pb-20">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black bg-indigo-400 px-3 py-1 rounded-full uppercase shadow-sm">🎧 단원 뷰 (실시간 동기화 됨)</span>
                  <h2 className="text-3xl font-black mt-3">{roomName}</h2>
                  <p className="text-sm text-indigo-100 mt-2">🧑‍🎤 본인 파트: {profilePart} / ⏰ 연습: {selectedDay}요일 {selectedTime}</p>
                </div>
                {user?.uid && (
                  <button onClick={() => setCurrentView('admin_dash')} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold self-start transition">
                    👑 인도자 에디터로 돌아가기
                  </button>
                )}
              </div>

              {songs.length > 0 ? (
                <>
                  <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                    {songs.map((song, idx) => (
                      <button key={song.id} onClick={() => setSelectedSongTab(idx)} className={`py-4 px-6 rounded-2xl text-sm font-black whitespace-nowrap shadow-sm transition ${selectedSongTab === idx ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                        🎵 {idx + 1}. {song.title}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                    <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-4">
                      <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-2xl">
                        <h3 className="text-lg font-black text-indigo-900">📄 {songs[selectedSongTab]?.title}</h3>
                        <span className="text-xs font-bold text-indigo-600 bg-white px-3 py-1.5 rounded-full shadow-sm">🔄 송폼: {songs[selectedSongTab]?.form}</span>
                      </div>
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 min-h-[400px] flex items-center justify-center p-4">
                        {songs[selectedSongTab]?.sheetUrl ? (
                          <img src={songs[selectedSongTab].sheetUrl} alt="악보 이미지" className="w-full object-contain rounded-xl shadow-sm max-h-[600px]" />
                        ) : (
                          <div className="text-center text-slate-400">
                            <div className="text-4xl mb-2">🎵</div>
                            <p className="text-sm font-bold">리더가 아직 악보 이미지를 등록하지 않았습니다.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* 이번 주 봉사자 명단 위젯 */}
                      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-[11px] font-black text-indigo-600 uppercase">🙋‍♂️ 이번 주 봉사자 명단</h4>
                        <div className="space-y-2">
                          {roomVolunteers.map(v => (
                            <div key={v.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold">
                              <span className="text-slate-500">{v.part}</span>
                              <span className="text-slate-900">{v.name || '미정'}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase">🎬 유튜브 참고 영상</h4>
                        {songs[selectedSongTab]?.youtubeUrl ? (
                          <a href={songs[selectedSongTab].youtubeUrl} target="_blank" rel="noreferrer" className="block p-4 bg-red-50 rounded-2xl text-center shadow-sm hover:bg-red-100 transition">
                            <span className="text-sm font-black text-red-600 block">유튜브 영상 열기 ➔</span>
                            <span className="text-[10px] font-bold text-red-400">새 창에서 재생됩니다</span>
                          </a>
                        ) : (
                          <p className="text-xs font-bold text-slate-400 p-4 bg-slate-50 rounded-xl text-center">등록된 영상 링크가 없습니다.</p>
                        )}
                      </div>

                      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase">📖 예배 말씀 및 리더 묵상</h4>
                        <div className="space-y-3 text-sm">
                          {scripture && <p className="font-black text-indigo-600 bg-indigo-50 p-3 rounded-xl">{scripture}</p>}
                          {meditation ? (
                            <p className="font-medium text-slate-700 whitespace-pre-wrap leading-relaxed p-2">{meditation}</p>
                          ) : (
                            <p className="text-xs font-bold text-slate-400 p-4 bg-slate-50 rounded-xl text-center">등록된 묵상이 없습니다.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white p-12 text-center rounded-3xl border border-slate-200">
                  <p className="text-lg font-black text-slate-500">인도자가 아직 곡을 등록하지 않았습니다.</p>
                </div>
              )}
            </div>
          )}

          {currentView === 'profile' && (
             <div className="max-w-md mx-auto w-full space-y-6 py-8">
               <h2 className="text-2xl font-black text-slate-900">⚙️ 내 프로필 설정</h2>
               <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-5">
                 <div><label className="text-xs font-bold text-slate-500 block mb-1">📧 로그인 계정</label><input type="text" value={user?.email || ''} disabled className="w-full p-3 bg-slate-100 border rounded-xl text-sm font-bold text-slate-400" /></div>
                 <div><label className="text-xs font-bold text-slate-500 block mb-1">👤 사용자 이름</label><input type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold" /></div>
                 <div>
                   <label className="text-xs font-bold text-slate-500 block mb-1">🎸 나의 주 세션</label>
                   <select value={profilePart} onChange={(e) => setProfilePart(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold">
                     {partsList.map(part => <option key={part} value={part}>{part}</option>)}
                   </select>
                 </div>
                 <button onClick={async () => { await updateProfile(user, { displayName: signupName }); await set(ref(db, `users/${user.uid}/profile`), { mainPart: profilePart }); alert('저장완료!'); setCurrentView('my_hub'); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-md flex justify-center hover:bg-indigo-700 transition">
                   💾 변경사항 저장하기
                 </button>
               </div>
               
               <div className="bg-red-50 rounded-3xl p-6 border border-red-100 mt-8">
                 <h3 className="text-sm font-black text-red-600 mb-2">⚠️ 계정 영구 탈퇴</h3>
                 <p className="text-xs text-red-500 font-medium mb-4">탈퇴 시 모든 정보가 파기됩니다.</p>
                 <button onClick={async () => { if(window.confirm("정말 탈퇴하시겠습니까?")) { await remove(ref(db, `users/${user.uid}`)); await deleteUser(user); setCurrentView('login'); } }} className="w-full py-3 bg-white border border-red-200 text-red-600 rounded-xl font-black hover:bg-red-100 transition">
                   🗑️ 계정 삭제 진행하기
                 </button>
               </div>
             </div>
          )}

        </main>
      </div>
    </>
  );
}
import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, deleteUser } from 'firebase/auth';
import { ref, set, get, onValue, remove } from 'firebase/database';

interface Song {
  id: string;
  title: string;
  form: string;
  sheetUrl: string; 
  youtubeUrl: string;
}

interface Volunteer {
  id: string;
  part: string;
  name: string;
}

interface RoomHistory {
  code: string;
  name: string;
  role: 'leader' | 'member';
  lastAccessed: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<string>('login');
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true); 
  
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberId, setRememberId] = useState<boolean>(false); 
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupPart, setSignupPart] = useState('보컬');
  
  const [termsScrolled, setTermsScrolled] = useState(false);
  const [privacyScrolled, setPrivacyScrolled] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  
  const [profilePart, setProfilePart] = useState('보컬');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [recentRooms, setRecentRooms] = useState<RoomHistory[]>([]);
  const [roomName, setRoomName] = useState<string>('청년부 주일 찬양팀');
  const [roomCode, setRoomCode] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('수'); 
  const [selectedTime, setSelectedTime] = useState<string>('19:30'); 
  
  // 방 생성 시 설정할 찬양팀 구성 목록 (기본 세팅)
  const defaultAvailableParts = ['싱어', '건반', '세컨', '베이스', '드럼', '어쿠스틱 기타', '일렉기타'];
  const [roomVolunteers, setRoomVolunteers] = useState<Volunteer[]>([
    { id: '1', part: '싱어', name: '' },
    { id: '2', part: '건반', name: '' },
    { id: '3', part: '베이스', name: '' },
    { id: '4', part: '드럼', name: '' }
  ]);
  const [newPartName, setNewPartName] = useState('싱어');

  const [songs, setSongs] = useState<Song[]>([]);
  const [scripture, setScripture] = useState<string>(''); 
  const [meditation, setMeditation] = useState<string>(''); 
  
  const [adminTab, setAdminTab] = useState<'songs' | 'volunteers' | 'note'>('songs'); 
  const [selectedSongTab, setSelectedSongTab] = useState<number>(0); 

  const partsList = ['보컬', '어쿠스틱 기타', '일렉 기타', '베이스', '드럼', '메인 건반', '세컨 건반', '엔지니어/미디어', '인도자'];
  const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];

  const termsText = `제1조 (목적) 본 약관은 ENSEMBLE HUB(이하 "서비스")가 제공하는 제반 서비스의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항을 규정합니다.
제2조 (회원의 의무) 회원은 서비스 가입 시 정확한 정보를 기재해야 하며, 계정 정보를 안전하게 관리할 책임이 있습니다.
제3조 (서비스 제공) 팀원 간 콘티 공유 및 일정 관리를 위한 실시간 동기화 플랫폼을 제공합니다. (내용을 끝까지 읽고 동의해주세요.)`;

  const privacyText = `1. 수집하는 개인정보: 이메일, 비밀번호, 닉네임, 주 세션 파트
2. 수집 및 이용 목적: 회원 식별, 합주 방 개설 및 참여 기록 유지, 실시간 콘티 동기화
3. 보유 및 이용 기간: 회원 탈퇴 시 즉시 영구 파기됩니다.
4. 동의 거부 권리: 동의를 거부할 수 있으나 거부 시 서비스 이용이 제한됩니다. (내용을 끝까지 읽고 동의해주세요.)`;

  useEffect(() => {
    const savedEmail = localStorage.getItem('ensemble_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberId(true);
    }
  }, []);

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
    onValue(ref(db, `users/${uid}/history`), (snapshot) => {
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
      if (snapshot.exists()) setProfilePart(snapshot.val().mainPart || '보컬');
    });
  };

  // 월요일 자동 초기화 체크 및 방 데이터 로드
  useEffect(() => {
    let unsubscribeRoom = () => {};
    if ((currentView === 'admin_dash' || currentView === 'member_dash') && roomCode) {
      const roomRef = ref(db, `rooms/${roomCode}`);
      const unsub = onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          
          // 매주 월요일 초기화 로직 체크
          const lastResetDate = data.lastResetDate || '';
          const today = new Date();
          // 이번 주 월요일 날짜 문자열 계산 (YYYY-MM-DD)
          const dayOfWeekIdx = today.getDay(); // 0(일)~6(토)
          const diffToMonday = today.getDate() - dayOfWeekIdx + (dayOfWeekIdx === 0 ? -6 : 1);
          const mondayDate = new Date(today.setDate(diffToMonday)).toISOString().split('T')[0];

          if (lastResetDate !== mondayDate) {
            // 월요일이 바뀌었으므로 콘티 곡 및 봉사자 명단 초기화 실행
            const resetSongs = [{ id: Date.now().toString(), title: '새로운 콘티 곡', form: 'Verse - Chorus', sheetUrl: '', youtubeUrl: '' }];
            const resetVolunteers = (data.volunteers || []).map((v: Volunteer) => ({ ...v, name: '' }));
            
            set(roomRef, {
              ...data,
              songs: resetSongs,
              volunteers: resetVolunteers,
              scripture: '',
              meditation: '',
              lastResetDate: mondayDate
            });
            return;
          }

          setRoomName(data.name || '합주 방');
          setSelectedDay(data.day || '수');
          setSelectedTime(data.time || '19:30');
          if (data.songs) setSongs(data.songs);
          else setSongs([]);
          if (data.volunteers) setRoomVolunteers(data.volunteers);
          if (data.scripture) setScripture(data.scripture);
          if (data.meditation) setMeditation(data.meditation);
        }
      });
      unsubscribeRoom = unsub;
    }
    return () => unsubscribeRoom();
  }, [currentView, roomCode]);

  const saveToDB = async (newSongs: Song[], newVolunteers: Volunteer[], newScripture: string, newMeditation: string) => {
    setSongs(newSongs);
    setRoomVolunteers(newVolunteers);
    setScripture(newScripture);
    setMeditation(newMeditation);
    if (roomCode) {
      await set(ref(db, `rooms/${roomCode}/songs`), newSongs);
      await set(ref(db, `rooms/${roomCode}/volunteers`), newVolunteers);
      await set(ref(db, `rooms/${roomCode}/scripture`), newScripture);
      await set(ref(db, `rooms/${roomCode}/meditation`), newMeditation);
    }
  };

  const handleAddSong = () => {
    const newSong: Song = { id: Date.now().toString(), title: `새로운 곡 ${songs.length + 1}`, form: 'Intro - Verse - Chorus', sheetUrl: '', youtubeUrl: '' };
    saveToDB([...songs, newSong], roomVolunteers, scripture, meditation);
  };

  const handleUpdateSong = (id: string, field: keyof Song, value: string) => {
    const updatedSongs = songs.map(song => song.id === id ? { ...song, [field]: value } : song);
    saveToDB(updatedSongs, roomVolunteers, scripture, meditation);
  };

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdateSong(id, 'sheetUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteSong = (id: string) => {
    if (songs.length <= 1) return alert('최소 한 곡은 등록되어야 합니다.');
    if (window.confirm('이 곡을 삭제하시겠습니까?')) {
      const updatedSongs = songs.filter(song => song.id !== id);
      if (selectedSongTab >= updatedSongs.length) setSelectedSongTab(0);
      saveToDB(updatedSongs, roomVolunteers, scripture, meditation);
    }
  };

  // 방 생성 시 찬양팀 구성 파트 추가/삭제 관리
  const handleAddVolunteerPart = () => {
    const newItem: Volunteer = { id: Date.now().toString(), part: newPartName, name: '' };
    setRoomVolunteers([...roomVolunteers, newItem]);
  };

  const handleDeleteVolunteerPart = (id: string) => {
    setRoomVolunteers(roomVolunteers.filter(v => v.id !== id));
  };

  const handleUpdateVolunteerName = (id: string, name: string) => {
    const updated = roomVolunteers.map(v => v.id === id ? { ...v, name } : v);
    saveToDB(songs, updated, scripture, meditation);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert('이메일과 비밀번호를 입력해주세요.');
    
    if (rememberId) localStorage.setItem('ensemble_saved_email', email);
    else localStorage.removeItem('ensemble_saved_email');

    if (isLoginMode) {
      try { await signInWithEmailAndPassword(auth, email, password); } 
      catch (err) { alert('로그인 실패: 이메일과 비밀번호를 확인해주세요.'); }
    } else {
      if (password.length < 6) return alert('비밀번호는 6자리 이상이어야 합니다.');
      if (password !== confirmPassword) return alert('비밀번호와 비밀번호 확인란이 일치하지 않습니다.');
      if (!agreeTerms || !agreePrivacy) return alert('약관을 끝까지 읽고 모두 동의해 주세요.');
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: signupName });
        await set(ref(db, `users/${cred.user.uid}/profile`), { mainPart: signupPart });
        alert('회원가입 완료!');
      } catch (err: any) {
        alert(err.code === 'auth/email-already-in-use' ? '이미 가입된 이메일입니다.' : '가입 오류');
      }
    }
  };

  const createRoom = async () => {
    if (!user) return;
    const code = `${Array.from({length: 3}, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ').charAt(Math.floor(Math.random()*26))).join('')}-${Math.floor(100+Math.random()*900)}`;
    setRoomCode(code);

    const today = new Date();
    const dayOfWeekIdx = today.getDay();
    const diffToMonday = today.getDate() - dayOfWeekIdx + (dayOfWeekIdx === 0 ? -6 : 1);
    const mondayDate = new Date(today.setDate(diffToMonday)).toISOString().split('T')[0];

    const defaultSongs = [{ id: Date.now().toString(), title: '첫 번째 곡', form: 'Verse - Chorus', sheetUrl: '', youtubeUrl: '' }];
    
    await set(ref(db, `rooms/${code}`), { 
      code, 
      name: roomName, 
      day: selectedDay, 
      time: selectedTime, 
      createdAt: new Date().toISOString(), 
      songs: defaultSongs, 
      volunteers: roomVolunteers,
      scripture: '', 
      meditation: '',
      lastResetDate: mondayDate
    });
    
    await set(ref(db, `users/${user.uid}/history/${code}`), { code, name: roomName, role: 'leader', lastAccessed: new Date().toISOString() });
    
    setCurrentView('admin_dash');
  };

  const joinRoom = async () => {
    if (!user) return;
    const input = roomCode.toUpperCase();
    const snap = await get(ref(db, `rooms/${input}`));
    if (snap.exists()) {
      setRoomName(snap.val().name);
      await set(ref(db, `users/${user.uid}/history/${input}`), { code: input, name: snap.val().name, role: 'member', lastAccessed: new Date().toISOString() });
      setRoomCode(input);
      setCurrentView('member_dash');
    } else {
      alert('존재하지 않는 방 코드입니다.');
    }
  };

  const handleLogout = () => { signOut(auth); setPassword(''); setConfirmPassword(''); };

  if (isAuthLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-indigo-600">안전하게 연결 중...</div>;

  return (
    <>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      <head>
        <title>ENSEMBLE HUB</title>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ensemble Hub" />
        <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='25' fill='%234f46e5'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='42' font-weight='900' font-family='sans-serif'>EH</text></svg>" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='25' fill='%234f46e5'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='42' font-weight='900' font-family='sans-serif'>EH</text></svg>" />
      </head>

      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col pb-10">
        
        {currentView !== 'login' && (
          <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3.5 flex justify-between items-center">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('my_hub')}>
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm font-black shadow-md">EH</div>
                <span className="font-black text-lg text-slate-900 tracking-tight hidden sm:inline-block">ENSEMBLE HUB</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-500 mr-1">🧑‍🎤 {user?.displayName}님 ({profilePart})</span>
                <button onClick={() => setCurrentView('profile')} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100">⚙️ 프로필</button>
                <button onClick={handleLogout} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200">👋 로그아웃</button>
              </div>
            </div>
          </header>
        )}

        <main className={`flex-1 flex flex-col ${currentView === 'login' ? 'justify-center' : ''} max-w-6xl mx-auto w-full p-4 md:p-8`}>
          
          {currentView === 'login' && (
            <div className="max-w-md mx-auto w-full bg-white rounded-3xl p-8 border shadow-xl space-y-6">
               <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg tracking-wider">EH</div>
                <h1 className="text-2xl font-black text-slate-900">{isLoginMode ? '환영합니다' : '새로운 앙상블 합류하기'}</h1>
                <p className="text-xs text-slate-500 font-medium">
                  {isLoginMode ? 'ENSEMBLE HUB에 로그인하세요.' : '가입하고 모든 합주 기록을 연동하세요.'}
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <input type="email" placeholder="이메일 주소" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-500" />
                
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="비밀번호 (6자리 이상)" 
                    value={password} 
                    onChange={(e)=>setPassword(e.target.value)} 
                    className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-500" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-indigo-600"
                  >
                    {showPassword ? "숨기기 🙈" : "보기 👁️"}
                  </button>
                </div>

                {!isLoginMode && (
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="비밀번호 확인" 
                      value={confirmPassword} 
                      onChange={(e)=>setConfirmPassword(e.target.value)} 
                      className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-500" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-indigo-600"
                    >
                      {showConfirmPassword ? "숨기기 🙈" : "보기 👁️"}
                    </button>
                  </div>
                )}
                
                {isLoginMode && (
                  <div className="flex items-center space-x-2 px-1">
                    <input type="checkbox" id="remember" checked={rememberId} onChange={(e)=>setRememberId(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded cursor-pointer border-slate-300" />
                    <label htmlFor="remember" className="text-xs font-bold text-slate-600 cursor-pointer">아이디 저장하기</label>
                  </div>
                )}

                {!isLoginMode && (
                  <div className="space-y-4 pt-2">
                    <div className="flex space-x-2">
                      <input type="text" placeholder="닉네임" value={signupName} onChange={(e)=>setSignupName(e.target.value)} className="w-1/2 p-4 bg-slate-50 border rounded-2xl text-sm font-bold focus:outline-none" />
                      <select value={signupPart} onChange={(e)=>setSignupPart(e.target.value)} className="w-1/2 p-4 bg-slate-50 border rounded-2xl text-sm font-bold focus:outline-none">
                        {partsList.map(p=><option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">📜 서비스 이용약관 (끝까지 스크롤하세요)</label>
                        <div 
                          onScroll={(e) => {
                            const target = e.currentTarget;
                            if (target.scrollHeight - target.scrollTop <= target.clientHeight + 15) {
                              setTermsScrolled(true);
                            }
                          }}
                          className="h-24 overflow-y-auto p-3 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-relaxed whitespace-pre-wrap"
                        >
                          {termsText}
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          <input 
                            type="checkbox" 
                            id="term1" 
                            disabled={!termsScrolled}
                            checked={agreeTerms} 
                            onChange={e=>setAgreeTerms(e.target.checked)} 
                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer disabled:opacity-40" 
                          />
                          <label htmlFor="term1" className={`text-xs font-bold cursor-pointer ${termsScrolled ? 'text-slate-700' : 'text-slate-400'}`}>
                            {termsScrolled ? '(필수) 서비스 이용약관 동의 완료' : '(필수) 약관을 맨 아래까지 읽어주세요'}
                          </label>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200">
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">🛡️ 개인정보 수집 및 이용 (끝까지 스크롤하세요)</label>
                        <div 
                          onScroll={(e) => {
                            const target = e.currentTarget;
                            if (target.scrollHeight - target.scrollTop <= target.clientHeight + 15) {
                              setPrivacyScrolled(true);
                            }
                          }}
                          className="h-24 overflow-y-auto p-3 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-relaxed whitespace-pre-wrap"
                        >
                          {privacyText}
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          <input 
                            type="checkbox" 
                            id="term2" 
                            disabled={!privacyScrolled}
                            checked={agreePrivacy} 
                            onChange={e=>setAgreePrivacy(e.target.checked)} 
                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer disabled:opacity-40" 
                          />
                          <label htmlFor="term2" className={`text-xs font-bold cursor-pointer ${privacyScrolled ? 'text-slate-700' : 'text-slate-400'}`}>
                            {privacyScrolled ? '(필수) 개인정보 수집 동의 완료' : '(필수) 약관을 맨 아래까지 읽어주세요'}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" className="w-full py-4 mt-2 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-indigo-700 active:scale-95 transition">
                  {isLoginMode ? '로그인' : '동의하고 가입하기'}
                </button>
              </form>

              <div className="text-center pt-4 border-t border-slate-100">
                <button onClick={() => { setIsLoginMode(!isLoginMode); setPassword(''); setConfirmPassword(''); }} className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition">
                  {isLoginMode ? '아직 계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인 화면으로'}
                </button>
              </div>
            </div>
          )}

          {currentView === 'my_hub' && (
            <div className="max-w-4xl mx-auto w-full space-y-8">
              <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-slate-200 pb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">🏕️ {user?.displayName}님의 워크스페이스</h2>
                  <p className="text-sm text-slate-500 mt-2">이전에 참여했거나 개설한 방에 바로 접속할 수 있습니다.</p>
                </div>
                <button onClick={() => setCurrentView('home')} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition">
                  <div className="text-base">🚀 새로운 활동 시작하기</div>
                  <div className="text-[10px] text-indigo-200 font-medium">새 방 개설 또는 초대 코드 입력</div>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {recentRooms.map((room, idx) => (
                  <div key={idx} onClick={() => { setRoomCode(room.code); setCurrentView(room.role === 'leader' ? 'admin_dash' : 'member_dash'); }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition flex flex-col justify-between h-48 group">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-md ${room.role === 'leader' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {room.role === 'leader' ? '👑 리더 권한' : '🧑‍🎤 단원 권한'}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400">🎫 {room.code}</span>
                      </div>
                      <h3 className="text-xl font-black text-slate-800 group-hover:text-indigo-600 transition">{room.name}</h3>
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 bg-slate-50 p-2 rounded-lg text-center">
                      해당 방 대시보드로 이동 ➔
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'home' && (
            <div className="max-w-4xl mx-auto my-12 grid grid-cols-1 md:grid-cols-2 gap-6">
              <button onClick={() => setCurrentView('create_room')} className="p-8 bg-indigo-600 text-white rounded-3xl shadow-xl hover:bg-indigo-700 transition text-left space-y-4 flex flex-col justify-between">
                <div className="text-4xl">👑</div>
                <div>
                  <h3 className="text-2xl font-black mb-1">새로운 합주 방 만들기</h3>
                  <p className="text-xs text-indigo-200 leading-relaxed">인도자(리더) 전용 메뉴입니다. 새로운 방을 개설하고 단원들에게 코드를 공유할 수 있습니다.</p>
                </div>
              </button>
              <button onClick={() => setCurrentView('join_room')} className="p-8 bg-indigo-700 text-white rounded-3xl shadow-xl hover:bg-indigo-800 transition text-left space-y-4 flex flex-col justify-between">
                <div className="text-4xl">🎫</div>
                <div>
                  <h3 className="text-2xl font-black mb-1">초대 코드로 방 참여하기</h3>
                  <p className="text-xs text-indigo-200 leading-relaxed">단원 전용 메뉴입니다. 리더에게 전달받은 6자리 코드를 입력하여 악보를 확인하세요.</p>
                </div>
              </button>
            </div>
          )}

          {/* 방 개설 상세 설정 (찬양팀 구성 설정 추가) */}
          {currentView === 'create_room' && (
            <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
              <div>
                <h2 className="text-2xl font-black">🛠️ 방 개설 상세 설정</h2>
                <p className="text-xs text-slate-500 mt-1">방 이름, 연습 시간 및 찬양팀 구성을 설정해 주세요.</p>
              </div>
              <div className="space-y-4">
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">🏷️ 방 이름</label><input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl font-bold" /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">📅 연습 요일</label><div className="flex gap-1">{daysOfWeek.map(d=><button key={d} onClick={()=>setSelectedDay(d)} className={`flex-1 py-3 rounded-xl font-bold text-xs ${selectedDay===d?'bg-indigo-600 text-white':'bg-slate-100 text-slate-500'}`}>{d}</button>)}</div></div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">⏰ 연습 시간</label>
                  <input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl font-bold text-center" />
                </div>

                {/* 찬양팀 구성 설정 탭 및 추가하기 */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-indigo-600 block">👥 우리 찬양팀 구성 설정</label>
                  <div className="flex space-x-2">
                    <select value={newPartName} onChange={(e) => setNewPartName(e.target.value)} className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs font-bold">
                      {defaultAvailableParts.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button type="button" onClick={handleAddVolunteerPart} className="px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">
                      + 추가하기
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {roomVolunteers.map(v => (
                      <div key={v.id} className="flex items-center space-x-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-900">
                        <span>{v.part}</span>
                        <button type="button" onClick={() => handleDeleteVolunteerPart(v.id)} className="text-red-500 hover:text-red-700 ml-1">×</button>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={createRoom} className="w-full py-4 px-4 bg-indigo-600 text-white rounded-2xl shadow-lg mt-4 flex flex-col items-center justify-center">
                  <span className="text-base font-black">✨ 방 생성 완료 및 관리자 콘솔 입장</span>
                  <span className="text-[10px] font-medium text-indigo-200 mt-0.5">설정된 정보로 데이터베이스에 방을 등록합니다</span>
                </button>
              </div>
            </div>
          )}

          {currentView === 'join_room' && (
            <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
               <div>
                <h2 className="text-2xl font-black">🚪 방 참여코드 입력</h2>
                <p className="text-xs text-slate-500 mt-1">대소문자 구분 없이 6자리를 입력하세요.</p>
              </div>
              <input type="text" placeholder="예: KPT-742" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} className="w-full p-5 bg-slate-50 border rounded-2xl text-center text-2xl font-black uppercase tracking-widest text-indigo-600" />
              <button onClick={joinRoom} className="w-full py-5 bg-indigo-600 text-white rounded-2xl shadow-lg flex flex-col items-center">
                <span className="text-lg font-black">🔍 데이터 확인 후 입장하기</span>
                <span className="text-[11px] font-medium text-indigo-200">올바른 코드인지 확인하고 단원 화면으로 이동합니다</span>
              </button>
            </div>
          )}

          {/* 인도자 관리 콘솔 (봉사자 명단 탭 추가) */}
          {currentView === 'admin_dash' && (
            <div className="space-y-6 pb-20">
              <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <span className="text-[10px] font-black bg-indigo-500 px-3 py-1.5 rounded-full uppercase">👑 인도자 관리 콘솔</span>
                  <h1 className="text-3xl font-black mt-3">{roomName}</h1>
                  <p className="text-sm text-slate-400 mt-2">⏰ 정기 연습: 매주 {selectedDay}요일 {selectedTime} (매주 월요일 초기화 ⚡)</p>
                </div>
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 min-w-[200px] text-center flex flex-col justify-center">
                  <div className="text-xs font-bold text-slate-400 mb-1">🎫 단원 초대용 공유 코드</div>
                  <div className="text-2xl font-black font-mono text-indigo-400">{roomCode}</div>
                </div>
              </div>

              {/* 탭 전환 (콘티 곡 관리 / 봉사자 명단 / 말씀 및 묵상) */}
              <div className="flex bg-slate-200 p-1.5 rounded-2xl max-w-lg mx-auto my-4">
                <button 
                  onClick={() => setAdminTab('songs')} 
                  className={`flex-1 py-3 rounded-xl text-xs font-black transition ${adminTab === 'songs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  🎵 콘티 곡 관리 ({songs.length})
                </button>
                <button 
                  onClick={() => setAdminTab('volunteers')} 
                  className={`flex-1 py-3 rounded-xl text-xs font-black transition ${adminTab === 'volunteers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  🙋‍♂️ 이번 주 봉사자 명단
                </button>
                <button 
                  onClick={() => setAdminTab('note')} 
                  className={`flex-1 py-3 rounded-xl text-xs font-black transition ${adminTab === 'note' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  📖 묵상 노트
                </button>
              </div>

              {adminTab === 'songs' ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">📝 콘티 곡 상세 에디터</h3>
                      <p className="text-xs text-slate-500 mt-1">수정 즉시 실시간으로 단원들 화면에 ⚡ 동기화됩니다.</p>
                    </div>
                    <button onClick={handleAddSong} className="px-5 py-3 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition flex items-center space-x-1">
                      <span className="text-sm font-black">+ 🎵 새로운 곡 추가</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {songs.map((song, idx) => (
                      <div key={song.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                          <span className="text-xs font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">🎹 {idx + 1}번 곡 설정</span>
                          <button onClick={() => handleDeleteSong(song.id)} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-lg hover:bg-red-100">🗑️ 삭제</button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">🏷️ 곡 제목</label>
                            <input type="text" value={song.title} onChange={(e) => handleUpdateSong(song.id, 'title', e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">🔄 송폼 (곡의 흐름)</label>
                            <input type="text" value={song.form} onChange={(e) => handleUpdateSong(song.id, 'form', e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">🎬 유튜브 영상 URL</label>
                            <input type="text" value={song.youtubeUrl} onChange={(e) => handleUpdateSong(song.id, 'youtubeUrl', e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-xs" placeholder="https://youtube.com/..." />
                          </div>
                          
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">📄 악보 이미지 (스마트폰 갤러리에서 가져오기)</label>
                            <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(song.id, e)} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer" />
                            </div>
                            {song.sheetUrl && (
                              <div className="mt-2 relative w-full h-32 bg-slate-100 rounded-xl overflow-hidden border">
                                <img src={song.sheetUrl} alt="악보 미리보기" className="w-full h-full object-contain" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : adminTab === 'volunteers' ? (
                /* 이번 주 봉사자 명단 관리 탭 */
                <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">🙋‍♂️ 이번 주 찬양팀 봉사자 명단</h3>
                    <p className="text-xs text-slate-500 mt-1">각 파트별 섬기는 봉사자의 이름을 입력하세요. (매주 월요일 자동 초기화)</p>
                  </div>
                  <div className="space-y-3">
                    {roomVolunteers.map((v) => (
                      <div key={v.id} className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <span className="w-32 text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-2 rounded-xl text-center">{v.part}</span>
                        <input 
                          type="text" 
                          value={v.name} 
                          onChange={(e) => handleUpdateVolunteerName(v.id, e.target.value)} 
                          placeholder="봉사자 이름 입력" 
                          className="flex-1 p-2 bg-white border rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500" 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">📖 예배 말씀 및 인도자 묵상 노트 설정</h3>
                    <p className="text-xs text-slate-500 mt-1">이번 주 찬양 예배와 관련된 말씀과 묵상 내용을 단원들과 공유합니다.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-indigo-600 block mb-1">📖 이번 주 말씀 구절</label>
                      <input type="text" value={scripture} onChange={(e) => saveToDB(songs, roomVolunteers, e.target.value, meditation)} placeholder="예: 시편 100:1-5" className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-indigo-600 block mb-1">💭 인도자 묵상 노트</label>
                      <textarea rows={6} value={meditation} onChange={(e) => saveToDB(songs, roomVolunteers, scripture, e.target.value)} placeholder="이번 주 찬양 콘티의 방향성과 묵상 나눔을 적어주세요." className="w-full p-4 bg-slate-50 border rounded-xl text-sm leading-relaxed" />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-slate-200">
                <button onClick={() => setCurrentView('member_dash')} className="w-full py-5 bg-slate-100 text-slate-700 rounded-2xl shadow-sm border border-slate-200 hover:bg-slate-200 transition flex flex-col items-center">
                  <span className="text-base font-black">👁️ 단원 앱 화면 미리보기</span>
                  <span className="text-[11px] font-bold text-slate-500">단원들의 기기에서 어떻게 보이는지 직접 확인합니다</span>
                </button>
              </div>
            </div>
          )}

          {/* 단원 뷰 (봉사자 명단 카드 추가 연동) */}
          {currentView === 'member_dash' && (
            <div className="space-y-6 pb-20">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black bg-indigo-400 px-3 py-1 rounded-full uppercase shadow-sm">🎧 단원 뷰 (실시간 동기화 됨)</span>
                  <h2 className="text-3xl font-black mt-3">{roomName}</h2>
                  <p className="text-sm text-indigo-100 mt-2">🧑‍🎤 본인 파트: {profilePart} / ⏰ 연습: {selectedDay}요일 {selectedTime}</p>
                </div>
                {user?.uid && (
                  <button onClick={() => setCurrentView('admin_dash')} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold self-start transition">
                    👑 인도자 에디터로 돌아가기
                  </button>
                )}
              </div>

              {songs.length > 0 ? (
                <>
                  <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                    {songs.map((song, idx) => (
                      <button key={song.id} onClick={() => setSelectedSongTab(idx)} className={`py-4 px-6 rounded-2xl text-sm font-black whitespace-nowrap shadow-sm transition ${selectedSongTab === idx ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                        🎵 {idx + 1}. {song.title}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                    <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-4">
                      <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-2xl">
                        <h3 className="text-lg font-black text-indigo-900">📄 {songs[selectedSongTab]?.title}</h3>
                        <span className="text-xs font-bold text-indigo-600 bg-white px-3 py-1.5 rounded-full shadow-sm">🔄 송폼: {songs[selectedSongTab]?.form}</span>
                      </div>
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 min-h-[400px] flex items-center justify-center p-4">
                        {songs[selectedSongTab]?.sheetUrl ? (
                          <img src={songs[selectedSongTab].sheetUrl} alt="악보 이미지" className="w-full object-contain rounded-xl shadow-sm max-h-[600px]" />
                        ) : (
                          <div className="text-center text-slate-400">
                            <div className="text-4xl mb-2">🎵</div>
                            <p className="text-sm font-bold">리더가 아직 악보 이미지를 등록하지 않았습니다.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* 이번 주 봉사자 명단 위젯 */}
                      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-[11px] font-black text-indigo-600 uppercase">🙋‍♂️ 이번 주 봉사자 명단</h4>
                        <div className="space-y-2">
                          {roomVolunteers.map(v => (
                            <div key={v.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold">
                              <span className="text-slate-500">{v.part}</span>
                              <span className="text-slate-900">{v.name || '미정'}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase">🎬 유튜브 참고 영상</h4>
                        {songs[selectedSongTab]?.youtubeUrl ? (
                          <a href={songs[selectedSongTab].youtubeUrl} target="_blank" rel="noreferrer" className="block p-4 bg-red-50 rounded-2xl text-center shadow-sm hover:bg-red-100 transition">
                            <span className="text-sm font-black text-red-600 block">유튜브 영상 열기 ➔</span>
                            <span className="text-[10px] font-bold text-red-400">새 창에서 재생됩니다</span>
                          </a>
                        ) : (
                          <p className="text-xs font-bold text-slate-400 p-4 bg-slate-50 rounded-xl text-center">등록된 영상 링크가 없습니다.</p>
                        )}
                      </div>

                      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase">📖 예배 말씀 및 리더 묵상</h4>
                        <div className="space-y-3 text-sm">
                          {scripture && <p className="font-black text-indigo-600 bg-indigo-50 p-3 rounded-xl">{scripture}</p>}
                          {meditation ? (
                            <p className="font-medium text-slate-700 whitespace-pre-wrap leading-relaxed p-2">{meditation}</p>
                          ) : (
                            <p className="text-xs font-bold text-slate-400 p-4 bg-slate-50 rounded-xl text-center">등록된 묵상이 없습니다.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white p-12 text-center rounded-3xl border border-slate-200">
                  <p className="text-lg font-black text-slate-500">인도자가 아직 곡을 등록하지 않았습니다.</p>
                </div>
              )}
            </div>
          )}

          {currentView === 'profile' && (
             <div className="max-w-md mx-auto w-full space-y-6 py-8">
               <h2 className="text-2xl font-black text-slate-900">⚙️ 내 프로필 설정</h2>
               <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-5">
                 <div><label className="text-xs font-bold text-slate-500 block mb-1">📧 로그인 계정</label><input type="text" value={user?.email || ''} disabled className="w-full p-3 bg-slate-100 border rounded-xl text-sm font-bold text-slate-400" /></div>
                 <div><label className="text-xs font-bold text-slate-500 block mb-1">👤 사용자 이름</label><input type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold" /></div>
                 <div>
                   <label className="text-xs font-bold text-slate-500 block mb-1">🎸 나의 주 세션</label>
                   <select value={profilePart} onChange={(e) => setProfilePart(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold">
                     {partsList.map(part => <option key={part} value={part}>{part}</option>)}
                   </select>
                 </div>
                 <button onClick={async () => { await updateProfile(user, { displayName: signupName }); await set(ref(db, `users/${user.uid}/profile`), { mainPart: profilePart }); alert('저장완료!'); setCurrentView('my_hub'); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-md flex justify-center hover:bg-indigo-700 transition">
                   💾 변경사항 저장하기
                 </button>
               </div>
               
               <div className="bg-red-50 rounded-3xl p-6 border border-red-100 mt-8">
                 <h3 className="text-sm font-black text-red-600 mb-2">⚠️ 계정 영구 탈퇴</h3>
                 <p className="text-xs text-red-500 font-medium mb-4">탈퇴 시 모든 정보가 파기됩니다.</p>
                 <button onClick={async () => { if(window.confirm("정말 탈퇴하시겠습니까?")) { await remove(ref(db, `users/${user.uid}`)); await deleteUser(user); setCurrentView('login'); } }} className="w-full py-3 bg-white border border-red-200 text-red-600 rounded-xl font-black hover:bg-red-100 transition">
                   🗑️ 계정 삭제 진행하기
                 </button>
               </div>
             </div>
          )}

        </main>
      </div>
    </>
  );
}
