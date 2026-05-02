'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Step {
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const stepsByRole: Record<string, Step[]> = {
  employee: [
    { target: '[data-tour="dashboard"]', title: 'Votre tableau de bord', content: 'Consultez vos conges, notifications et activites ici.', position: 'bottom' },
    { target: '[data-tour="leaves"]', title: 'Demandes de conge', content: 'Soumettez et suivez vos demandes de conge.', position: 'right' },
    { target: '[data-tour="messages"]', title: 'Messagerie', content: 'Communiquez avec vos collegues.', position: 'right' }
  ],
  manager: [
    { target: '[data-tour="dashboard"]', title: 'Tableau de bord', content: 'Vue d ensemble de votre equipe.', position: 'bottom' },
    { target: '[data-tour="leaves"]', title: 'Conges', content: 'Approuvez ou rejetez les demandes de votre equipe.', position: 'right' },
    { target: '[data-tour="team-calendar"]', title: 'Calendrier equipe', content: 'Visualisez les absences de votre equipe.', position: 'right' },
    { target: '[data-tour="delegations"]', title: 'Delegations', content: 'Deleguez vos responsabilites temporairement.', position: 'right' }
  ],
  admin: [
    { target: '[data-tour="dashboard"]', title: 'Administration', content: 'Acces complet a toutes les fonctionnalites.', position: 'bottom' },
    { target: '[data-tour="users"]', title: 'Utilisateurs', content: 'Gerez les comptes et permissions.', position: 'right' },
    { target: '[data-tour="roles"]', title: 'Roles', content: 'Definissez les matrices de permissions.', position: 'right' },
    { target: '[data-tour="audit"]', title: 'Audit', content: 'Consultez le journal d activite.', position: 'right' },
    { target: '[data-tour="simulator"]', title: 'Simulateur', content: 'Testez les permissions sans modifier les donnees.', position: 'right' }
  ]
};

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_OFFSET = 12;

export default function OnboardingTour() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasSeen = localStorage.getItem('onboarding-completed');
    if (!hasSeen && user) {
      setIsOpen(true);
    }
  }, [user]);

  const getRoleKey = () => {
    if (!user) return 'employee';
    if (user.effectivePermissions?.['admin.read']) return 'admin';
    if (user.effectivePermissions?.['leaves.approve']) return 'manager';
    return 'employee';
  };

  const steps = stepsByRole[getRoleKey()] || stepsByRole.employee;
  const step = steps[currentStep];

  const computePosition = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) {
      setTargetRect(null);
      setTooltipPos({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 160 });
      return;
    }
    const rect = el.getBoundingClientRect();
    setTargetRect(rect);

    const tooltipEl = tooltipRef.current;
    const tw = tooltipEl?.offsetWidth ?? 320;
    const th = tooltipEl?.offsetHeight ?? 160;

    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'bottom':
        top = rect.bottom + TOOLTIP_OFFSET;
        left = rect.left + rect.width / 2 - tw / 2;
        break;
      case 'top':
        top = rect.top - th - TOOLTIP_OFFSET;
        left = rect.left + rect.width / 2 - tw / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - th / 2;
        left = rect.left - tw - TOOLTIP_OFFSET;
        break;
      case 'right':
      default:
        top = rect.top + rect.height / 2 - th / 2;
        left = rect.right + TOOLTIP_OFFSET;
        break;
    }

    // Viewport clamping
    top = Math.max(8, Math.min(top, window.innerHeight - th - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));

    setTooltipPos({ top, left });
  }, [step]);

  useEffect(() => {
    if (!isOpen || !step) return;
    // Small delay to ensure DOM is ready and layout has settled
    const timer = setTimeout(computePosition, 50);
    window.addEventListener('resize', computePosition);
    window.addEventListener('scroll', computePosition, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', computePosition);
      window.removeEventListener('scroll', computePosition, true);
    };
  }, [isOpen, currentStep, step, computePosition]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleComplete = () => {
    setCompleted(true);
    localStorage.setItem('onboarding-completed', 'true');
    setTimeout(() => setIsOpen(false), 1000);
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding-completed', 'true');
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && !completed && step && (
        <>
          {/* Overlay with spotlight hole */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            onClick={handleSkip}
          >
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <mask id="spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {targetRect && (
                    <rect
                      x={targetRect.left - SPOTLIGHT_PADDING}
                      y={targetRect.top - SPOTLIGHT_PADDING}
                      width={targetRect.width + SPOTLIGHT_PADDING * 2}
                      height={targetRect.height + SPOTLIGHT_PADDING * 2}
                      rx={8}
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#spotlight-mask)" />
            </svg>
            {targetRect && (
              <div
                className="absolute border-2 border-indigo-400 rounded-lg pointer-events-none"
                style={{
                  top: targetRect.top - SPOTLIGHT_PADDING,
                  left: targetRect.left - SPOTLIGHT_PADDING,
                  width: targetRect.width + SPOTLIGHT_PADDING * 2,
                  height: targetRect.height + SPOTLIGHT_PADDING * 2
                }}
              />
            )}
          </motion.div>

          {/* Tooltip */}
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border dark:border-slate-700 p-5 w-80"
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{step.title}</h3>
              <button onClick={handleSkip} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">{step.content}</p>

            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i === currentStep ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium"
                >
                  {currentStep === steps.length - 1 ? (
                    <>Terminer <Check size={14} /></>
                  ) : (
                    <>Suivant <ChevronRight size={14} /></>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
