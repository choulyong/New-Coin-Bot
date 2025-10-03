레플릿 시스템과 유사한 프로젝트 설계를 위한 핵심 사항들이야.
이에 기반해 설계 및 코딩을 진행해야 해.

핵심사항들:


1) UI/워크스페이스 계층
	React(웹 앱 프레임워크로 Next.js 활용) 기반
	React는 동적인 UI를 구축하는 데 견고한 기반을 제공하고, Next.js는 서버 사이드 렌더링과 번들링을 도와줍니다.
	사내 디자인 시스템인 RUI(Replit User Interface) 를 만들었습니다.
	RUI는 Emotion CSS-in-JS와 재사용 가능한 컴포넌트·유틸리티 세트로 구현됩니다.
	예를 들어, React Native의 <View>에서 영감을 받은 기본 <View> 컴포넌트와 패딩/색상/플렉스 레이아웃 등의 공통 패턴을 위한 유틸리티 스타일(rcss)이 포함됩니다. 
	이 접근은 Tailwind 같은 유틸리티 클래스의 편의성과, JS 객체 조합을 통한 타입 안정성·구성 가능성을 함께 제공합니다.
	디자인 시스템을 사용하면 워크스페이스 전반의 일관된 룩앤필을 보장하고, 기능별 UI를 매번 새로 만들지 않아도 되어 개발 생산성이 향상됩니다.
	순수 CSS의 단점이나 지나치게 범용적인 컴포넌트 라이브러리의 한계를 피하면서 세밀한 UI/UX 제어를 얻었습니다. (RUI 자체는 비공개이지만 Emotion, TypeScript 등 오픈소스를 기반으로 합니다.)

	-> 이와 유사한 디자인 프레임워크

		디자인 시스템/프리미티브

			Emotion — 레플릿 RUI와 동일 계열의 CSS-in-JS. 토큰·오브젝트 스타일·자동완성 친화. 
			Radix Themes (+ 테마 킷) — 그리고 Emotion/Stitches로 스킨 입히기 좋음. 
			Stitches 또는 styled-system — 토큰/variants/유틸리티 스타일을 타입 안전하게. RUI의 rcss 유틸리티 감각을 가장 가깝게 재현. 

		워크스페이스 핵심 컴포넌트
			패널 레이아웃: react-resizable-panels — 스플릿/중첩/퍼시스턴트 레이아웃까지 지원. 

		Next.js/RSC 고려사항
			React Server Components 환경에서 CSS-in-JS를 쓸 때는 제약을 점검하세요(스타일링 전략 재설계 팁).


2) 로그인/인증(회원가입 포함)
	Replit Auth: “프롬프트에 ‘use Replit Auth’ 한 줄” 식으로 붙는 게 컨셉. 소셜 로그인·엔터프라이즈 보안·유저 관리까지 번들. 확장/앱용 auth API는 JWT 기반 검증을 노출.
	->
	Supabase Auth 사용: 이메일/소셜/OTP/WebAuthn, RLS와 붙이기 쉬움.
	Supabase = 관리형 Postgres + Auth + Storage + Realtime + Edge Functions(Deno) 등 백엔드 레일.


3) 백엔드·데이터 계층

	런타임 표준화(Nix): .replit/replit.nix로 언어·패키지·런 커맨드를 고정. 팀/에이전트가 “환경 문제” 없이 바로 빌드/실행 가능한 토대. 

	데이터베이스 옵션
	    내장 SQL 데이터베이스(관리형 Postgres): 워크스페이스에서 클릭으로 프로비저닝, 스키마 툴·포인트인타임 복구 제공. Agent가 스키마/연결 코드를 자동 셋업 가능. 
	    Key-Value Store(ReplDB): 설정 없는 단순 영속 저장. 확장/앱에서 바로 사용. 
	    스토리지 옵션(오브젝트 등): 미디어/파일 저장용 App Storage 제공

	-> 
	Nix 런타임 표준화 (.replit/replit.nix) : Dev Containers (+ Docker Compose)
	관리형 Postgres(클릭 프로비저닝) : Supabase
	스키마 툴/복구 : Drizzle + seed 스크립트
	Agent가 연결 자동 셋업 : .env 표준 + CLI 템플릿
	ReplDB (KV 단순 Key–Value) : Upstash Redis


4) 시크릿/환경변수
	Secrets Manager: 키/토큰을 암호화 저장→앱/디플로이에 환경변수로 주입.


5) 로그 시스템
	Loki + Grafana + Promtail


6) 전략 엔진
	기술 지표 + 변동성 + 감성 + 이벤트 4계층 신호 파이프라인으로 점수화
	Strategy Portfolio Manager로 추세/그리드/감성 전략 슬롯을 동적으로 배분
	AI Strategy Copilot이 LLM 기반 전략 제안·로그 분석·튜닝 가이드를 제공
	확신도 게이트(감성·이벤트 확신도 < 0.5)와 위험 이벤트 감지 시 자동 축소 로직 적용
	strategy_slots/strategy_executions 스키마로 전략 설정·성과를 표준화 저장


## 프로젝트 문서

이 프로젝트는 체계적인 문서화를 통해 관리됩니다:

**핵심 문서**:
- ✅ **PLAN.md** : 전체 프로젝트 구현 계획 및 단계별 로드맵 (Phase 1~5)
- ✅ **PRD.md** : 제품 요구사항 명세서 (Product Requirements Document) - 기능 정의 및 범위
- ✅ **LLD.md** : 저수준 설계 문서 (Low Level Design) - 기술 스택, DB 스키마, API 설계

**프로젝트**: 빗썸 자동 투자 트레이딩 봇
- 실시간 시장 데이터 분석 및 다중 기술 지표 기반 자동 매매
- 변동성·감성·이벤트 계층을 포함한 멀티레이어 전략 파이프라인
- 8% 익절 목표, 거래대금 30억+ 필터링
- 실전/시뮬레이션 모드, 백테스팅 기능
- 실시간 차트 대시보드 (캔들스틱 + 지표 오버레이)
- Next.js 14 + Supabase + Drizzle ORM + Radix UI + Emotion + Lightweight Charts

모든 개발은 이 문서들을 기반으로 진행되며, 각 Phase 완료 시 PLAN.md를 업데이트하고 GitHub에 반영합니다.

## Memory 설정

작업 시 항상 다음 파일들을 컨텍스트에 포함하여 참조:
- **PLAN.md** - 현재 진행 단계 확인, 다음 작업 계획
- **PRD.md** - 기능 요구사항 및 범위 확인 (확장 금지 사항 체크)
- **LLD.md** - 기술 스택, DB 스키마, API 설계 참조

작업 전 반드시 PLAN.md를 읽고 현재 Phase와 체크리스트를 확인할 것.

## Supabase 설정

**프로젝트 정보**:
- Project ID: xhzqhvjkkfpeavdphoit
- Project Name: choulyong's Project
- Region: ap-northeast-2 (Seoul)
- Status: ACTIVE_HEALTHY

**환경변수** (.env.local에 설정됨):
- SUPABASE Project URL: https://xhzqhvjkkfpeavdphoit.supabase.co
- SUPABASE Anon Key: eyJhbGci... (완전한 키는 .env.local 참조)
- SUPABASE Service Role Key: ⚠️ Supabase Dashboard에서 직접 복사 필요
- 데이터베이스 패스워드: ⚠️ 프로젝트 생성 시 설정한 패스워드 입력 필요

**Database Connection**:
- Host: db.xhzqhvjkkfpeavdphoit.supabase.co
- PostgreSQL Version: 17.6.1


깃허브를 위한 지침
1. github 푸쉬를 위해 다음 정보 사용:
GITHUB 저장소 주소: <자신에게 맞는 내용을 넣어주세요>
GIT HUB의 Personal Access Token:
<자신에게 맞는 내용을 넣어주세요>

2. github cli설치했어. gh 명령어 사용 가능해. 이걸로 github 처리해줘.  <github cli 설치 부분은 영상에서 제외되어 있습니다. 구글 검색하거나 AI 도움 받아, github cli 설치하세요>

3. 원격 저장소에 푸시할 때, 먼저 HTTP 버퍼 크기를 늘리고 조금 씩 나누어 푸시할 것. 에러 시 작은 변경사항만 포함하는 새커밋을 만들어 푸시할 것
4. PLAN.md 파일의 작업이 한단계 진행될때마다 PLAN.md 파일에 진행상황 체크하고, 깃허브에 반영할 것

