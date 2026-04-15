import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, AlertTriangle, RefreshCcw, Sparkles, Compass, CalendarClock, Award, Info } from 'lucide-react';
import HeroUpload from './components/HeroUpload';
import QuestionCard from './components/QuestionCard';
import ResultsDashboard from './components/ResultsDashboard';
import LandingPage from './components/LandingPage';
import CRMPanel from './components/CRMPanel';
import AIChatboxPage from './components/AIChatboxPage';
import { processCV, generateResults } from './services/matchingService';
import { trackEvent } from './services/analytics';
import AmbientBackground from './components/AmbientBackground';
import './index.css';

const STATES = {
  IDLE: 'IDLE',
  ANALYZING_CV: 'ANALYZING_CV',
  QUESTIONNAIRE: 'QUESTIONNAIRE',
  ANALYZING_ANSWERS: 'ANALYZING_ANSWERS',
  RESULTS: 'RESULTS'
};

const NAV_PAGES = {
  HOME: 'HOME',
  MATCH: 'MATCH',
  AI: 'AI'
};

function App() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const isCreatorMode = query.get('app') === '1';
  const isCrmMode = query.get('crm') === '1';

  const [activePage, setActivePage] = useState(isCreatorMode ? NAV_PAGES.MATCH : NAV_PAGES.HOME);
  const [currentState, setCurrentState] = useState(STATES.IDLE);
  const [logoVideoFailed, setLogoVideoFailed] = useState(false);
  const [logoOpacity, setLogoOpacity] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [scrollTarget, setScrollTarget] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const logoVideoSrc = `${import.meta.env.BASE_URL}Rotating_Globe_Video_for_Website.mp4`;

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [profileContext, setProfileContext] = useState(null);

  /* ── scroll-to-section after page switch ── */
  useEffect(() => {
    if (scrollTarget && activePage === NAV_PAGES.HOME) {
      const timer = setTimeout(() => {
        document.getElementById(scrollTarget)?.scrollIntoView({ behavior: 'smooth' });
        setScrollTarget(null);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [scrollTarget, activePage]);

  /* ── highlight nav when section is in view ── */
  useEffect(() => {
    if (activePage !== NAV_PAGES.HOME) {
      setActiveSection(null);
      return;
    }

    const sectionIds = ['about', 'achievements', 'waitlist'];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );

    const timer = setTimeout(() => {
      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }, 200);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [activePage]);

  const scrollToSection = useCallback((sectionId) => {
    if (activePage === NAV_PAGES.HOME) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setActivePage(NAV_PAGES.HOME);
      setScrollTarget(sectionId);
    }
  }, [activePage]);

  const handleCVUpload = async (file) => {
    trackEvent('upload_start', { fileName: file?.name || 'unknown' });
    setErrorMessage('');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setResults(null);
    setProfileContext(null);
    setCurrentState(STATES.ANALYZING_CV);

    try {
      if (file) {
      const formData = new FormData();
      formData.append("file", file);

      await fetch("https://mvp-2-ozsr.onrender.com/upload", {
        method: "POST",
        body: formData,
      });
    }
      const response = await processCV(file);
      if (!response?.data?.length) {
        throw new Error('We could not parse enough profile data from that file. Try a different CV format.');
      }
      setQuestions(response.data);
      setProfileContext(response.profileSignals || null);
      setCurrentState(STATES.QUESTIONNAIRE);
    } catch (error) {
      console.error('Error processing CV', error);
      setErrorMessage(error.message || 'Failed to analyze CV. Please retry.');
      setCurrentState(STATES.IDLE);
    }
  };

  const processAnswers = async (finalAnswers) => {
    setErrorMessage('');
    setCurrentState(STATES.ANALYZING_ANSWERS);

    try {
      const finalResults = await generateResults(finalAnswers, profileContext);
      if (!finalResults?.High || !finalResults?.Medium || !finalResults?.Low) {
        throw new Error('Result parsing issue detected. Please regenerate your shortlist.');
      }
      setResults(finalResults);
      setCurrentState(STATES.RESULTS);
    } catch (error) {
      console.error('Error generating results', error);
      setErrorMessage(error.message || 'Failed to generate recommendations. Please try again.');
      setCurrentState(STATES.QUESTIONNAIRE);
    }
  };

  const handleAnswerSubmit = (questionId, selectedOptions) => {
    const newAnswers = { ...answers, [questionId]: selectedOptions };
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      return;
    }

    trackEvent('questionnaire_complete', {
      totalQuestions: questions.length,
      answeredQuestions: Object.keys(newAnswers).length
    });
    processAnswers(newAnswers);
  };

  const handleBackQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const goHome = () => {
    if (currentState !== STATES.ANALYZING_CV && currentState !== STATES.ANALYZING_ANSWERS) {
      setCurrentState(STATES.IDLE);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setResults(null);
      setProfileContext(null);
      setErrorMessage('');
      setActivePage(NAV_PAGES.HOME);
    }
  };

  const handleLogoVideoTimeUpdate = (event) => {
    const video = event.currentTarget;
    const { currentTime, duration } = video;

    if (!duration || Number.isNaN(duration)) {
      setLogoOpacity(1);
      return;
    }

    const fadeWindow = 1;
    if (currentTime <= fadeWindow) {
      setLogoOpacity(Math.max(0, currentTime / fadeWindow));
      return;
    }
    if (currentTime >= duration - fadeWindow) {
      setLogoOpacity(Math.max(0, (duration - currentTime) / fadeWindow));
      return;
    }
    setLogoOpacity(1);
  };

  const renderLoadingState = (text) => (
    <div className="loading-state flex-col flex-center animate-fade-in">
      <div className="loading-spinner-shell flex-center">
        <Loader2 size={60} color="var(--glowbal-pink)" style={{ animation: 'spin 2s linear infinite' }} />
        <div className="loading-spinner-ring" />
      </div>
      <h2 className="animate-pulse">{text}</h2>
      <p>Using only your CV and questionnaire data for this recommendation run.</p>
    </div>
  );

  const renderErrorState = () => {
    if (!errorMessage) return null;
    return (
      <div className="error-banner glass-panel animate-fade-in" role="alert" aria-live="polite">
        <div className="error-banner-title">
          <AlertTriangle size={18} color="var(--glowbal-pink)" />
          <strong>Something went wrong</strong>
        </div>
        <p>{errorMessage}</p>
        <div className="error-banner-actions">
          <button className="btn-secondary" onClick={goHome}>Back to start</button>
          {currentState === STATES.QUESTIONNAIRE && (
            <button className="btn-primary" onClick={() => processAnswers(answers)}>
              <RefreshCcw size={16} /> Retry
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMatchPage = () => (
    <>
      {errorMessage && renderErrorState()}
      {currentState === STATES.IDLE && <HeroUpload onUpload={handleCVUpload} onSkipCV={() => handleCVUpload(null)} />}
      {currentState === STATES.ANALYZING_CV && renderLoadingState('Analyzing your CV...')}
      {currentState === STATES.QUESTIONNAIRE && questions.length > 0 && (
        <QuestionCard
          key={questions[currentQuestionIndex].id}
          question={questions[currentQuestionIndex]}
          index={currentQuestionIndex}
          total={questions.length}
          savedAnswer={answers[questions[currentQuestionIndex].id] || []}
          onNext={handleAnswerSubmit}
          onBack={handleBackQuestion}
          canGoBack={currentQuestionIndex > 0}
        />
      )}
      {currentState === STATES.ANALYZING_ANSWERS && renderLoadingState('Curating perfect matches...')}
      {currentState === STATES.RESULTS && results && <ResultsDashboard results={results} />}
    </>
  );

  /* ── Nav items matching wireframe ── */
  const navItems = [
    { type: 'page', key: NAV_PAGES.MATCH, label: 'Glowbal AI', icon: Sparkles },
    { type: 'scroll', target: 'waitlist', label: 'Book 1-1 Session', icon: CalendarClock },
    { type: 'scroll', target: 'achievements', label: 'Be an Achiever', icon: Award },
    { type: 'scroll', target: 'about', label: 'About Us', icon: Info },
  ];

  const handleNavClick = (item) => {
    if (item.type === 'page') {
      setActivePage(item.key);
    } else {
      scrollToSection(item.target);
    }
  };

  const isLandingPage = activePage === NAV_PAGES.HOME;

  return (
    <div className="min-h-screen flex-col app-shell">
      <AmbientBackground density="page" />

      <header className="topbar content-layer">
        <div className="topbar-inner">
          <button className="brand-button" onClick={goHome} aria-label="Go to GlowBal home">
            {!logoVideoFailed ? (
              <video
                autoPlay loop muted playsInline preload="metadata"
                className="brand-video"
                style={{ opacity: logoOpacity }}
                onLoadedMetadata={(e) => {
                  const duration = e.currentTarget.duration || 0;
                  setLogoOpacity(duration > 0 ? 0 : 1);
                }}
                onTimeUpdate={handleLogoVideoTimeUpdate}
                onError={() => setLogoVideoFailed(true)}
              >
                <source src={logoVideoSrc} type="video/mp4" />
              </video>
            ) : (
              <div className="brand-fallback">
                <span className="text-gradient" style={{ fontSize: '1.1rem', fontWeight: 800 }}>GLOWBAL</span>
              </div>
            )}
          </button>

          {!isCrmMode && (
            <nav className="top-nav" aria-label="Main navigation">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  className={`top-nav-link ${
                    (item.type === 'page' && activePage === item.key) ||
                    (item.type === 'scroll' && isLandingPage && activeSection === item.target)
                      ? 'is-active'
                      : ''
                  }`}
                  onClick={() => handleNavClick(item)}
                >
                  <item.icon size={14} /> {item.label}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className={`content-layer main-content app-main page-transition-shell ${!isLandingPage ? 'container' : ''}`}>
        {isCrmMode ? (
          <CRMPanel />
        ) : (
          <section key={activePage} className={`page-transition-panel ${isLandingPage ? '' : 'animate-fade-in'}`}>
            {activePage === NAV_PAGES.HOME && (
              <LandingPage
                onOpenCreator={() => setActivePage(NAV_PAGES.MATCH)}
                onOpenAI={() => setActivePage(NAV_PAGES.AI)}
              />
            )}
            {activePage === NAV_PAGES.AI && <AIChatboxPage />}
            {activePage === NAV_PAGES.MATCH && renderMatchPage()}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
