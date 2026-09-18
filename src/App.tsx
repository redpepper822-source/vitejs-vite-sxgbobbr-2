import React, { useState } from 'react';

export default function App() {
  // 화면 전환을 위한 상태 관리 ('home', 'praise_role', 'band_mode', 'create_room', 'join_room', 'admin_dash', 'member_dash')
  const [currentView, setCurrentView] = useState<string>('home');
  const [teamType, setTeamType] = useState<string>('praise'); 
  const [role, setRole] = useState<string | null>(null); 
  
  // 방 정보 및 알림 설정 상태
  const [roomName, setRoomName] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('수요일'); 
  const [selectedTime, setSelectedTime] = useState<string>('19:30'); 
  const [alarmEnabled, setAlarmEnabled] = useState<boolean>(true); 
  
  const [selectedSongTab, setSelectedSongTab] = useState<number>(0); 
  const [isPublished, setIsPublished] = useState<boolean>(false); 

  const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];

  const [songs, setSongs] = useState([
    { title: '은혜로다', form: 'Verse - Chorus - Bridge' },
    { title: '주 님의 품에', form: 'Verse - Chorus' }
  ]);

  // --- [1] 홈 화면: 찬양팀 vs 밴드 선택 ---
  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">합주 & 콘티 공유 플랫폼</h1>
          <p className="text-slate-500 text-sm mb-8">팀에 맞는 모드를 선택해 주세요.</p>
          <div className="space-y-4">
            <button 
              onClick={() => { setTeamType('praise'); setCurrentView('praise_role'); }}
              className="w-full py-4 px-6 bg-indigo-600 text-white rounded-2xl font-semibold shadow-md hover:bg-indigo-700 transition"
            >
              🙌 찬양팀 모드
            </button>
            <button 
              onClick={() => { setTeamType('band'); setRole('leader'); setCurrentView('band_mode'); }}
              className="w-full py-4 px-6 bg-slate-800 text-white rounded-2xl font-semibold shadow-md hover:bg-slate-900 transition"
            >
              🎸 실용음악 밴드 모드
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- [찬양팀] 인도자 vs 일반 단원 선택 ---
  if (currentView === 'praise_role') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100 text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-6">찬양팀 역할을 선택하세요</h2>
          <div className="space-y-4">
            <button 
              onClick={() => { setRole('leader'); setCurrentView('create_room'); }}
              className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-semibold border border-indigo-100 hover:bg-indigo-100 transition"
            >
              👑 인도자 (방 만들기)
            </button>
            <button 
              onClick={() => { setRole('member'); setCurrentView('join_room'); }}
              className="w-full py-4 bg-slate-50 text-slate-700 rounded-2xl font-semibold border border-slate-200 hover:bg-slate-100 transition"
            >
              👤 일반 단원 (방 참여하기)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- [밴드 모드] 방 만들기 vs 방 참여하기 선택 ---
  if (currentView === 'band_mode') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100 text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-6">실용음악 밴드 메뉴</h2>
          <div className="space-y-4">
            <button 
              onClick={() => setCurrentView('create_room')}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-semibold shadow hover:bg-slate-800 transition"
            >
              🛠️ 방 만들기 (리더)
            </button>
            <button 
              onClick={() => setCurrentView('join_room')}
              className="w-full py-4 bg-slate-100 text-slate-800 rounded-2xl font-semibold hover:bg-slate-200 transition"
            >
              🔗 방 참여하기 (단원)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- [방 만들기 화면 - 인도자/리더] (요일/시간 선택 및 알림 설정 포함) ---
  if (currentView === 'create_room') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-6 border border-slate-100 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-800">새로운 합주 방 만들기</h2>
            <p className="text-xs text-slate-400 mt-1">방을 개설하면 정해진 일정에 맞춰 알림 시스템이 작동합니다.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">방 이름</label>
              <input 
                type="text" 
                placeholder="예: 청년부 주일 찬양팀" 
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            {/* 연습 요일 선택 UI */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">연습 요일 선택</label>
              <div className="flex justify-between gap-1">
                {daysOfWeek.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${selectedDay === day ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* 연습 시간 선택 UI */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">연습 시간 선택</label>
              <input 
                type="time" 
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"
              />
            </div>

            {/* 연습 알림 설정 안내 */}
            <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-indigo-900">🔔 연습 24시간 전 자동 알림</span>
                <input 
                  type="checkbox" 
                  checked={alarmEnabled} 
                  onChange={(e) => setAlarmEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-indigo-600 leading-relaxed">
                매주 <span className="font-bold">{selectedDay}요일 {selectedTime}</span> 연습 기준, 정확히 24시간 전 단원들에게 리마인드 푸시 알림이 발송됩니다. (이 설정은 추후 인도자 관리 탭에서 언제든 수정 가능합니다.)
              </p>
            </div>

            <button 
              onClick={() => { setRoomCode('KPT-742'); setCurrentView('admin_dash'); }}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold shadow-md hover:bg-indigo-700 transition"
            >
              방 생성하고 코드 발급받기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- [방 참여하기 화면 - 단원] ---
  if (currentView === 'join_room') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-4">합주 방 참여하기</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">6자리 방 코드</label>
              <input 
                type="text" 
                placeholder="예: KPT-742" 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm tracking-widest font-bold text-center uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">본인 닉네임</label>
              <input 
                type="text" 
                placeholder="예: 김건반" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <button 
              onClick={() => setCurrentView('member_dash')}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold shadow-md hover:bg-indigo-700 transition mt-4"
            >
              입장하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- [인도자 관리자 대시보드 (Admin View)] ---
  if (currentView === 'admin_dash') {
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex justify-center">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-lg p-6 border border-slate-200 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <span className="text-xs bg-indigo-100 text-indigo-600 px-2.5 py-1 rounded-full font-bold">인도자 모드</span>
              <h1 className="text-xl font-bold text-slate-800 mt-1">{roomName || '청년부 주일 찬양팀'}</h1>
              <p className="text-xs text-slate-400">방 코드: <span className="font-mono font-bold text-slate-600">{roomCode}</span></p>
            </div>
            <span className={`text-xs px-3 py-1.5 rounded-xl font-bold ${isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {isPublished ? '🟢 발행 완료' : '🟠 미발행 (작성 중)'}
            </span>
          </div>

          {/* 인도자가 언제든 수정 가능한 연습 일정 & 알림 설정 카드 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-700">⏰ 연습 일정 및 24시간 전 알림 설정 (상시 수정 가능)</h3>
            <div className="flex gap-2 items-center">
              <select 
                value={selectedDay} 
                onChange={(e) => setSelectedDay(e.target.value)}
                className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {daysOfWeek.map(d => <option key={d} value={d}>매주 {d}요일</option>)}
              </select>
              <input 
                type="time" 
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
              />
              <span className="text-[11px] text-indigo-600 font-medium ml-auto">전날 24시 전 알림 활성화 🔔</span>
            </div>
          </div>

          {/* 곡 관리 섹션 */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700">🎵 콘티 곡 관리</h3>
            {songs.map((song, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <input type="text" defaultValue={song.title} className="w-full p-2 bg-white border rounded-xl text-sm font-semibold" />
                <input type="text" defaultValue={song.form} className="w-full p-2 bg-white border rounded-xl text-xs text-slate-500" />
              </div>
            ))}
            <button className="w-full py-2.5 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-2xl text-xs font-bold hover:bg-indigo-50 transition">
              + 곡 추가하기
            </button>
          </div>

          {/* 최종 등록 버튼 */}
          <div className="flex gap-3 pt-4">
            <button 
              onClick={() => alert('임시저장 되었습니다.')}
              className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-300 transition"
            >
              임시저장
            </button>
            <button 
              onClick={() => { setIsPublished(true); alert('단원들에게 콘티가 성공적으로 발행되었습니다!'); }}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-md hover:bg-indigo-700 transition"
            >
              {isPublished ? '✨ 수정 사항 재발행' : '✅ 최종 등록 (발행)'}
            </button>
          </div>

          <div className="text-center pt-2">
            <button onClick={() => setCurrentView('member_dash')} className="text-xs text-indigo-600 underline font-semibold">
              단원 화면 미리보기로 전환하기 👁️
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- [단원용 메인 대시보드 (Member View)] ---
  return (
    <div className="min-h-screen bg-slate-100 flex justify-center p-2 md:p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-5 border border-slate-200 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <h2 className="font-bold text-slate-800 text-base">{roomName || '청년부 주일 찬양팀'}</h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-semibold">파트: {nickname || '세컨건반'}</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">📅 연습 일정: 매주 {selectedDay}요일 {selectedTime} (24시간 전 알림 적용 중)</p>
        </div>

        <div className="flex gap-2">
          {songs.map((song, idx) => (
            <button 
              key={idx}
              onClick={() => setSelectedSongTab(idx)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${selectedSongTab === idx ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-600'}`}
            >
              {idx + 1}곡: {song.title}
            </button>
          ))}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl h-56 flex flex-col items-center justify-center p-4 relative shadow-inner">
          <p className="text-xs text-slate-400 font-semibold mb-2">📄 악보 사진 영역 (좌우 Swipe)</p>
          <div className="w-full h-full bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm">
            <span className="text-sm font-bold text-slate-600">{songs[selectedSongTab].title} 악보 이미지</span>
          </div>
        </div>

        <div className="space-y-1.5 text-center">
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-700">
            📌 송폼: {songs[selectedSongTab].form}
          </div>
          <div className="flex justify-center gap-1.5 pt-1">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
          </div>
        </div>

        <div className="space-y-2">
          <details className="group bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-700 cursor-pointer">
            <summary className="flex justify-between items-center">
              🎬 이번 주 전체 영상 모아보기
              <span className="group-open:rotate-180 transition">▼</span>
            </summary>
            <div className="mt-2 pt-2 border-t border-slate-200 space-y-1 text-slate-500 font-normal">
              <p>1번 곡 유튜브 레퍼런스 링크 바로가기</p>
              <p>2번 곡 유튜브 레퍼런스 링크 바로가기</p>
            </div>
          </details>

          <details className="group bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-700 cursor-pointer">
            <summary className="flex justify-between items-center">
              📝 예배 말씀 및 인도자 묵상
              <span className="group-open:rotate-180 transition">▼</span>
            </summary>
            <div className="mt-2 pt-2 border-t border-slate-200 space-y-1 text-slate-500 font-normal">
              <p className="font-bold text-indigo-600">[말씀] 시편 23편 1-3절</p>
              <p>[묵상] 이번 주는 기쁨으로 주님을 예배합시다.</p>
            </div>
          </details>
        </div>

        <button 
          onClick={() => alert('모든 악보가 통합된 PDF 파일이 다운로드됩니다.')}
          className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-xs shadow-md hover:bg-slate-800 transition"
        >
          📄 전체 악보 PDF 일괄 다운로드 (통합 병합)
        </button>

        <div className="text-center">
          <button onClick={() => setCurrentView('admin_dash')} className="text-[11px] text-slate-400 underline">
            관리자(인도자) 화면으로 전환하기 👑
          </button>
        </div>
      </div>
    </div>
  );
}
