import React, { useState, useEffect, useMemo } from 'react';
import { useFormContext } from '@/contexts/FormContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface ParQQuestionnaireProps {
  onExitParQ?: () => void;
  onComplete?: () => void;
}

interface ParQQuestion {
  id: string;
  question: string;
  tooltip: string;
  conditional?: {
    showWhen: { field: string; value: string };
  };
  isNotes?: boolean;
}

const parqQuestions: ParQQuestion[] = [
  {
    id: 'parq1',
    question: 'Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?',
    tooltip: 'If yes, obtain medical clearance and follow physician guidelines before exercise.',
  },
  {
    id: 'parq2',
    question: 'Do you feel pain in your chest when you do physical activity?',
    tooltip: 'Chest pain during exercise requires medical evaluation before continuing.',
  },
  {
    id: 'parq3',
    question: 'In the past month, have you had chest pain when you were not doing physical activity?',
    tooltip: 'Chest pain at rest may indicate a serious condition; seek medical advice.',
  },
  {
    id: 'parq4',
    question: 'Do you lose your balance because of dizziness or do you ever lose consciousness?',
    tooltip: 'Dizziness or fainting may indicate cardiovascular or neurological issues.',
  },
  {
    id: 'parq5',
    question: 'Do you have a bone or joint problem that could be worsened by a change in your physical activity?',
    tooltip: 'Existing joint problems may require exercise modifications.',
  },
  {
    id: 'parq6',
    question: 'Is your doctor currently prescribing drugs (for example, water pills) for your blood pressure or heart condition?',
    tooltip: 'Certain medications can affect exercise response; adjust programs accordingly.',
  },
  {
    id: 'parq7',
    question: 'Do you know of any other reason why you should not do physical activity?',
    tooltip: 'Any medical reason that makes exercise unsafe without clearance.',
  },
  // Female-specific
  {
    id: 'parq12',
    question: 'Are you currently pregnant?',
    tooltip: 'Pregnancy requires specific exercise guidelines and modifications.',
    conditional: {
      showWhen: { field: 'gender', value: 'female' }
    }
  },
  {
    id: 'parq13',
    question: 'Have you given birth in the last 6 months?',
    tooltip: 'Recent birth may require modified return-to-exercise protocols.',
    conditional: {
      showWhen: { field: 'gender', value: 'female' }
    }
  },
];

const ParQQuestionnaire: React.FC<ParQQuestionnaireProps> = ({ onExitParQ, onComplete }) => {
  const { formData, updateFormData } = useFormContext();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Filter questions based on conditional logic
  const visibleQuestions = useMemo(() =>
    parqQuestions.filter(question => {
      if (!question.conditional) return true;
      const { showWhen } = question.conditional;
      return formData[showWhen.field as keyof typeof formData] === showWhen.value;
    }),
    [formData],
  );

  // Ensure currentQuestionIndex is valid when visibleQuestions changes
  const validQuestionIndex = Math.min(currentQuestionIndex, visibleQuestions.length - 1);
  const currentQuestion = visibleQuestions[validQuestionIndex];
  const isLastQuestion = validQuestionIndex === visibleQuestions.length - 1;
  const currentAnswer = currentQuestion
    ? formData[currentQuestion.id as keyof typeof formData]
    : '';
  const hasAnswer = currentQuestion?.isNotes
    ? (currentAnswer as string)?.trim() !== ''
    : currentAnswer !== '';

  // Check if any PAR-Q questions have been answered "yes"
  const hasMedicalConcerns = visibleQuestions.some(question =>
    formData[question.id as keyof typeof formData] === 'yes'
  );

  // Mark PAR-Q as complete when all required questions are answered
  const allQuestionsAnswered = visibleQuestions
    .every(question => formData[question.id as keyof typeof formData] !== '');

  useEffect(() => {
    if (allQuestionsAnswered && formData.parqQuestionnaire !== 'completed') {
      updateFormData({ parqQuestionnaire: 'completed' });
    }
  }, [allQuestionsAnswered, formData.parqQuestionnaire, updateFormData]);

  // Keep index in bounds when visibleQuestions length changes
  useEffect(() => {
    if (currentQuestionIndex > validQuestionIndex) {
      setCurrentQuestionIndex(validQuestionIndex);
    }
  }, [currentQuestionIndex, validQuestionIndex]);

  const handleAnswer = (answer: string) => {
    if (currentQuestion) {
      updateFormData({ [currentQuestion.id]: answer });
    }
  };

  const goToPrevious = () => {
    if (validQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (onExitParQ) {
      onExitParQ();
    }
  };

  const goToNext = () => {
    if (isLastQuestion) {
      // Last question → mark complete and advance to next section
      updateFormData({ parqQuestionnaire: 'completed' });
      onComplete?.();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  if (!currentQuestion) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Medical Clearance Warning */}
      {hasMedicalConcerns && (
        <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-start gap-3">
            <span className="text-lg leading-none mt-0.5">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-rose-900">
                Medical Clearance Required
              </p>
              <p className="text-xs text-rose-700 leading-relaxed mt-0.5">
                One or more responses indicate a potential health risk. Please consult a healthcare professional before starting any physical activity.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress — identical to SingleFieldFlow */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
          <span>Health Screening Progress</span>
          <span>{validQuestionIndex + 1} of {visibleQuestions.length}</span>
        </div>
        <Progress value={((validQuestionIndex + 1) / visibleQuestions.length) * 100} className="h-1" />
      </div>

      {/* Question card — identical to SingleFieldFlow card */}
      <div className="bg-background rounded-3xl p-8 lg:p-10 shadow-xl shadow-primary/10 border border-primary/5 min-h-[400px] flex flex-col justify-center">
        <h3 className="text-xl font-bold tracking-tight text-foreground mb-6 leading-tight">
          {currentQuestion.question}
        </h3>

        {currentQuestion.tooltip && (
          <p className="text-sm text-muted-foreground mb-8 font-medium leading-relaxed italic border-l-2 border-border pl-4">
            Note: {currentQuestion.tooltip}
          </p>
        )}

        {/* Answer options */}
        {currentQuestion.isNotes ? (
          <textarea
            placeholder="Document any additional health conditions, medications, or concerns mentioned..."
            value={(currentAnswer as string) || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            rows={4}
            className="w-full p-5 border border-border rounded-2xl resize-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium text-foreground-secondary"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleAnswer('no')}
              className={`flex h-20 items-center justify-between px-8 rounded-2xl border-2 transition-all ${
                currentAnswer === 'no'
                  ? 'border-primary bg-brand-light text-on-brand-tint shadow-md ring-1 ring-primary'
                  : 'border-border bg-muted/50 hover:border-border hover:bg-background text-muted-foreground'
              }`}
            >
              <span className="text-base font-bold">No</span>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                currentAnswer === 'no' ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
              }`}>
                {currentAnswer === 'no' && <Check className="h-5 w-5 stroke-[3]" />}
              </div>
            </button>

            <button
              onClick={() => handleAnswer('yes')}
              className={`flex h-20 items-center justify-between px-8 rounded-2xl border-2 transition-all ${
                currentAnswer === 'yes'
                  ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-md ring-1 ring-rose-500'
                  : 'border-border bg-muted/50 hover:border-border hover:bg-background text-muted-foreground'
              }`}
            >
              <span className="text-base font-bold">Yes</span>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                currentAnswer === 'yes' ? 'bg-rose-500 border-rose-500 text-white' : 'border-border'
              }`}>
                {currentAnswer === 'yes' && <Check className="h-5 w-5 stroke-[3]" />}
              </div>
            </button>
          </div>
        )}

        {/* Navigation — inside card, identical to SingleFieldFlow */}
        <div className="flex items-center justify-between mt-12 pt-8 border-t border-border/60">
          <Button
            variant="ghost"
            onClick={goToPrevious}
            disabled={validQuestionIndex === 0 && !onExitParQ}
            className="h-12 px-6 rounded-xl font-bold text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            Back
          </Button>

          <Button
            onClick={goToNext}
            disabled={!hasAnswer}
            className={`h-12 px-8 rounded-xl font-bold transition-all ${
              hasAnswer
                ? 'bg-foreground text-white hover:bg-foreground/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            {isLastQuestion ? 'Section Complete' : 'Next Step'}
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ParQQuestionnaire;
